/**
 * Skills API client for mpak registry
 */

import type {
  SkillSearchResponse,
  SkillDetail,
  SkillDownloadInfo,
} from '../../schemas/generated/skill.js';

const DEFAULT_REGISTRY_URL = 'https://api.mpak.dev';

function getRegistryUrl(): string {
  return process.env.MPAK_REGISTRY_URL || DEFAULT_REGISTRY_URL;
}

/**
 * Parse a scoped name into scope and name parts
 * Handles both @scope/name and scope/name formats
 */
function parseScopedName(name: string): { scope: string; skillName: string } {
  const normalizedName = name.startsWith('@') ? name.slice(1) : name;
  const [scope, skillName] = normalizedName.split('/');
  if (!scope || !skillName) {
    throw new Error(`Invalid skill name format: ${name}. Expected @scope/name or scope/name`);
  }
  return { scope, skillName };
}

export interface SkillSearchOptions {
  q?: string;
  tags?: string;
  category?: string;
  surface?: string;
  sort?: 'downloads' | 'recent' | 'name';
  limit?: number;
  offset?: number;
}

/**
 * Search for skills in the registry
 */
export async function searchSkills(options: SkillSearchOptions): Promise<SkillSearchResponse> {
  const baseUrl = getRegistryUrl();
  const params = new URLSearchParams();

  if (options.q) params.set('q', options.q);
  if (options.tags) params.set('tags', options.tags);
  if (options.category) params.set('category', options.category);
  if (options.surface) params.set('surface', options.surface);
  if (options.sort) params.set('sort', options.sort);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset) params.set('offset', options.offset.toString());

  const url = `${baseUrl}/v1/skills/search?${params.toString()}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Search failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<SkillSearchResponse>;
}

/**
 * Get skill details from the registry
 */
export async function getSkillDetails(name: string): Promise<SkillDetail> {
  const baseUrl = getRegistryUrl();
  const { scope, skillName } = parseScopedName(name);

  // Server expects: /v1/skills/@scope/name
  const url = `${baseUrl}/v1/skills/@${scope}/${skillName}`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Skill not found: ${name}`);
    }
    const text = await response.text();
    throw new Error(`Failed to get skill details (${response.status}): ${text}`);
  }

  return response.json() as Promise<SkillDetail>;
}

/**
 * Get download info for a skill
 */
export async function getSkillDownloadInfo(
  name: string,
  version?: string
): Promise<SkillDownloadInfo> {
  const baseUrl = getRegistryUrl();
  const { scope, skillName } = parseScopedName(name);

  // Server expects: /v1/skills/@scope/name/download or /v1/skills/@scope/name/versions/x.y.z/download
  const versionPath = version ? `/versions/${version}` : '';
  const url = `${baseUrl}/v1/skills/@${scope}/${skillName}${versionPath}/download`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Skill not found: ${name}${version ? `@${version}` : ''}`);
    }
    const text = await response.text();
    throw new Error(`Failed to get download info (${response.status}): ${text}`);
  }

  return response.json() as Promise<SkillDownloadInfo>;
}

/**
 * Download a skill bundle
 */
export async function downloadSkillBundle(
  downloadUrl: string,
  expectedSha256?: string
): Promise<Buffer> {
  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Verify SHA256 if provided
  if (expectedSha256) {
    const { createHash } = await import('crypto');
    const hash = createHash('sha256').update(buffer).digest('hex');
    if (hash !== expectedSha256) {
      throw new Error(`SHA256 mismatch: expected ${expectedSha256}, got ${hash}`);
    }
  }

  return buffer;
}
