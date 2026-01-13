import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, basename } from 'path';
import { homedir, tmpdir } from 'os';
import { getSkillDownloadInfo, downloadSkillBundle } from '../../lib/api/skills-client.js';
import { execSync } from 'child_process';

/**
 * Get the Claude Code skills directory
 */
function getSkillsDir(): string {
  return join(homedir(), '.claude', 'skills');
}

/**
 * Parse skill spec into name and version
 */
function parseSkillSpec(spec: string): { name: string; version?: string } {
  const atIndex = spec.lastIndexOf('@');
  if (atIndex <= 0) {
    return { name: spec };
  }
  const slashIndex = spec.indexOf('/');
  if (atIndex > slashIndex) {
    return {
      name: spec.slice(0, atIndex),
      version: spec.slice(atIndex + 1),
    };
  }
  return { name: spec };
}

/**
 * Extract skill name from scoped name
 * @scope/skill-name -> skill-name
 */
function getShortName(scopedName: string): string {
  const parts = scopedName.replace('@', '').split('/');
  return parts[parts.length - 1];
}

export interface InstallOptions {
  force?: boolean;
  json?: boolean;
}

/**
 * Handle the skill install command
 */
export async function handleSkillInstall(skillSpec: string, options: InstallOptions): Promise<void> {
  try {
    const { name, version } = parseSkillSpec(skillSpec);

    // Get download info
    const downloadInfo = await getSkillDownloadInfo(name, version);
    const shortName = getShortName(downloadInfo.skill.name);
    const skillsDir = getSkillsDir();
    const installPath = join(skillsDir, shortName);

    // Check if already installed
    if (existsSync(installPath) && !options.force) {
      console.error(`Skill "${shortName}" is already installed at ${installPath}`);
      console.error('Use --force to overwrite');
      process.exit(1);
    }

    console.log(`Pulling ${downloadInfo.skill.name}@${downloadInfo.skill.version}...`);

    // Download the bundle
    const buffer = await downloadSkillBundle(downloadInfo.url, downloadInfo.skill.sha256);

    console.log(`Downloaded ${basename(downloadInfo.skill.name)}-${downloadInfo.skill.version}.skill (${formatSize(downloadInfo.skill.size)})`);

    // Ensure skills directory exists
    if (!existsSync(skillsDir)) {
      mkdirSync(skillsDir, { recursive: true });
    }

    // Write to temp file
    const tempPath = join(tmpdir(), `skill-${Date.now()}.skill`);
    writeFileSync(tempPath, buffer);

    // Remove existing installation if force
    if (existsSync(installPath)) {
      rmSync(installPath, { recursive: true });
    }

    // Extract using unzip
    // The .skill bundle contains: skillName/SKILL.md, skillName/...
    // We extract to the skills directory
    try {
      execSync(`unzip -o "${tempPath}" -d "${skillsDir}"`, { stdio: 'pipe' });
    } catch (err) {
      throw new Error(`Failed to extract skill bundle: ${err}`);
    } finally {
      // Clean up temp file
      rmSync(tempPath, { force: true });
    }

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            installed: true,
            name: downloadInfo.skill.name,
            shortName,
            version: downloadInfo.skill.version,
            path: installPath,
          },
          null,
          2
        )
      );
    } else {
      console.log(`Extracting to ${installPath}/`);
      console.log(`\u2713 Installed: ${shortName}`);
      console.log('');
      console.log('Skill available in Claude Code. Restart to activate.');
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
