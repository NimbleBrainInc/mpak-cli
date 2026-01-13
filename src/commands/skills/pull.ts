import { writeFileSync } from 'fs';
import { basename, join } from 'path';
import { getSkillDownloadInfo, downloadSkillBundle } from '../../lib/api/skills-client.js';

/**
 * Parse skill spec into name and version
 * Examples: @scope/name, @scope/name@1.0.0
 */
function parseSkillSpec(spec: string): { name: string; version?: string } {
  // Handle @scope/name@version format
  const atIndex = spec.lastIndexOf('@');

  // If @ is at position 0, it's just the scope prefix
  if (atIndex <= 0) {
    return { name: spec };
  }

  // Check if the @ is part of version (after the /)
  const slashIndex = spec.indexOf('/');
  if (atIndex > slashIndex) {
    return {
      name: spec.slice(0, atIndex),
      version: spec.slice(atIndex + 1),
    };
  }

  return { name: spec };
}

export interface PullOptions {
  output?: string;
  json?: boolean;
}

/**
 * Handle the skill pull command
 */
export async function handleSkillPull(skillSpec: string, options: PullOptions): Promise<void> {
  try {
    const { name, version } = parseSkillSpec(skillSpec);

    // Get download info
    const downloadInfo = await getSkillDownloadInfo(name, version);

    console.log(
      `Pulling ${downloadInfo.skill.name}@${downloadInfo.skill.version}...`
    );

    // Download the bundle
    const buffer = await downloadSkillBundle(downloadInfo.url, downloadInfo.skill.sha256);

    // Determine output path
    const filename = `${basename(downloadInfo.skill.name.replace('@', '').replace('/', '-'))}-${downloadInfo.skill.version}.skill`;
    const outputPath = options.output || join(process.cwd(), filename);

    // Write to disk
    writeFileSync(outputPath, buffer);

    if (options.json) {
      console.log(
        JSON.stringify(
          {
            path: outputPath,
            name: downloadInfo.skill.name,
            version: downloadInfo.skill.version,
            size: downloadInfo.skill.size,
            sha256: downloadInfo.skill.sha256,
          },
          null,
          2
        )
      );
    } else {
      console.log(`Downloaded ${filename} (${formatSize(downloadInfo.skill.size)})`);
      console.log(`  SHA256: ${downloadInfo.skill.sha256}`);
      console.log(`  Path: ${outputPath}`);
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
