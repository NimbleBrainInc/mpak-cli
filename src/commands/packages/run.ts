import { spawn, spawnSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { RegistryClient } from '../../lib/api/registry-client.js';

export interface RunOptions {
  update?: boolean;
}

interface McpConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

interface McpbManifest {
  manifest_version: string;
  name: string;
  version: string;
  description: string;
  server: {
    type: 'node' | 'python' | 'binary';
    entry_point: string;
    mcp_config: McpConfig;
  };
}

interface CacheMetadata {
  version: string;
  pulledAt: string;
  platform: { os: string; arch: string };
}

/**
 * Parse package specification into name and version
 */
function parsePackageSpec(spec: string): { name: string; version?: string } {
  const lastAtIndex = spec.lastIndexOf('@');

  if (lastAtIndex <= 0) {
    return { name: spec };
  }

  const name = spec.substring(0, lastAtIndex);
  const version = spec.substring(lastAtIndex + 1);

  if (!name.startsWith('@')) {
    return { name: spec };
  }

  return { name, version };
}

/**
 * Get cache directory for a package
 */
function getCacheDir(packageName: string): string {
  const cacheBase = join(homedir(), '.mpak', 'cache');
  // @scope/name -> scope/name
  const safeName = packageName.replace('@', '').replace('/', '-');
  return join(cacheBase, safeName);
}

/**
 * Read cache metadata
 */
function getCacheMetadata(cacheDir: string): CacheMetadata | null {
  const metaPath = join(cacheDir, '.mpak-meta.json');
  if (!existsSync(metaPath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Write cache metadata
 */
function writeCacheMetadata(cacheDir: string, metadata: CacheMetadata): void {
  const metaPath = join(cacheDir, '.mpak-meta.json');
  writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
}

/**
 * Extract ZIP file to directory (simple implementation without external deps)
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  // Use native unzip command (available on macOS, Linux, and Windows with WSL)
  const { execSync } = await import('child_process');

  // Ensure destination exists
  mkdirSync(destDir, { recursive: true });

  try {
    execSync(`unzip -o -q "${zipPath}" -d "${destDir}"`, { stdio: 'pipe' });
  } catch (error: any) {
    throw new Error(`Failed to extract bundle: ${error.message}`);
  }
}

/**
 * Read manifest from extracted bundle
 */
function readManifest(cacheDir: string): McpbManifest {
  const manifestPath = join(cacheDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found in bundle: ${manifestPath}`);
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

/**
 * Resolve placeholders in args (e.g., ${__dirname})
 */
function resolveArgs(args: string[], cacheDir: string): string[] {
  return args.map(arg =>
    arg.replace(/\$\{__dirname\}/g, cacheDir)
  );
}

/**
 * Find Python executable (tries python3 first, then python)
 */
function findPythonCommand(): string {
  // Try python3 first (preferred on macOS/Linux)
  const result = spawnSync('python3', ['--version'], { stdio: 'pipe' });
  if (result.status === 0) {
    return 'python3';
  }
  // Fall back to python
  return 'python';
}

/**
 * Run a package from the registry
 */
export async function handleRun(
  packageSpec: string,
  options: RunOptions = {}
): Promise<void> {
  const { name, version: requestedVersion } = parsePackageSpec(packageSpec);
  const client = new RegistryClient();
  const platform = RegistryClient.detectPlatform();
  const cacheDir = getCacheDir(name);

  let needsPull = true;
  let cachedMeta = getCacheMetadata(cacheDir);

  // Check if we have a cached version
  if (cachedMeta && !options.update) {
    if (requestedVersion) {
      // Specific version requested - check if cached version matches
      needsPull = cachedMeta.version !== requestedVersion;
    } else {
      // Latest requested - use cache (user can --update to refresh)
      needsPull = false;
    }
  }

  if (needsPull) {
    // Fetch download info
    const downloadInfo = await client.getDownloadInfo(name, requestedVersion, platform);
    const bundle = downloadInfo.bundle;

    // Check if cached version is already the latest
    if (cachedMeta && cachedMeta.version === bundle.version && !options.update) {
      needsPull = false;
    }

    if (needsPull) {
      // Download to temp file
      const tempPath = join(homedir(), '.mpak', 'tmp', `${Date.now()}.mcpb`);
      mkdirSync(dirname(tempPath), { recursive: true });

      process.stderr.write(`=> Pulling ${name}@${bundle.version}...\n`);
      await client.downloadBundle(downloadInfo.url, tempPath);

      // Clear old cache and extract
      const { rmSync } = await import('fs');
      if (existsSync(cacheDir)) {
        rmSync(cacheDir, { recursive: true, force: true });
      }
      mkdirSync(cacheDir, { recursive: true });

      await extractZip(tempPath, cacheDir);

      // Write metadata
      writeCacheMetadata(cacheDir, {
        version: bundle.version,
        pulledAt: new Date().toISOString(),
        platform: bundle.platform,
      });

      // Cleanup temp file
      rmSync(tempPath, { force: true });

      process.stderr.write(`=> Cached ${name}@${bundle.version}\n`);
    }
  }

  // Read manifest and execute
  const manifest = readManifest(cacheDir);
  const { type, entry_point, mcp_config } = manifest.server;

  let command: string;
  let args: string[];
  let env: Record<string, string | undefined> = { ...process.env, ...mcp_config.env };

  switch (type) {
    case 'binary': {
      // For binary, the entry_point is the executable path relative to bundle
      command = join(cacheDir, entry_point);
      args = resolveArgs(mcp_config.args || [], cacheDir);

      // Ensure binary is executable
      try {
        chmodSync(command, 0o755);
      } catch {
        // Ignore chmod errors on Windows
      }
      break;
    }

    case 'node': {
      command = mcp_config.command || 'node';
      // Use mcp_config.args directly if provided, otherwise fall back to entry_point
      if (mcp_config.args && mcp_config.args.length > 0) {
        args = resolveArgs(mcp_config.args, cacheDir);
      } else {
        args = [join(cacheDir, entry_point)];
      }
      break;
    }

    case 'python': {
      // Use manifest command if specified, otherwise auto-detect python
      command = mcp_config.command === 'python' ? findPythonCommand() : (mcp_config.command || findPythonCommand());

      // Use mcp_config.args directly if provided, otherwise fall back to entry_point
      if (mcp_config.args && mcp_config.args.length > 0) {
        args = resolveArgs(mcp_config.args, cacheDir);
      } else {
        args = [join(cacheDir, entry_point)];
      }

      // Set PYTHONPATH to deps/ directory for dependency resolution
      const depsDir = join(cacheDir, 'deps');
      const existingPythonPath = process.env.PYTHONPATH;
      env.PYTHONPATH = existingPythonPath ? `${depsDir}:${existingPythonPath}` : depsDir;
      break;
    }

    default:
      throw new Error(`Unsupported server type: ${type}`);
  }

  // Spawn with stdio passthrough for MCP
  const child = spawn(command, args, {
    stdio: ['inherit', 'inherit', 'inherit'],
    env,
    cwd: cacheDir,
  });

  // Forward signals
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));

  // Wait for exit
  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    process.stderr.write(`=> Failed to start server: ${error.message}\n`);
    process.exit(1);
  });
}
