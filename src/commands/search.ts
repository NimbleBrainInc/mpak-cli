import { RegistryClient } from '../lib/api/registry-client.js';
import { searchSkills } from '../lib/api/skills-client.js';

export interface UnifiedSearchOptions {
  type?: 'bundle' | 'skill';
  sort?: 'downloads' | 'recent' | 'name';
  limit?: number;
  offset?: number;
  json?: boolean;
}

interface UnifiedResult {
  type: 'bundle' | 'skill';
  name: string;
  description: string;
  downloads: number;
  version: string;
  author?: string;
  // Bundle-specific
  serverType?: string;
  verified?: boolean;
  provenance?: boolean;
  // Skill-specific
  category?: string;
}

/**
 * Unified search across bundles and skills
 */
export async function handleUnifiedSearch(
  query: string,
  options: UnifiedSearchOptions = {}
): Promise<void> {
  try {
    const results: UnifiedResult[] = [];
    let bundleTotal = 0;
    let skillTotal = 0;

    // Search both in parallel (unless filtered by type)
    const searchBundles = !options.type || options.type === 'bundle';
    const searchSkillsFlag = !options.type || options.type === 'skill';

    const [bundleResult, skillResult] = await Promise.all([
      searchBundles
        ? new RegistryClient().searchBundles(query, {
            sort: options.sort,
            limit: options.limit,
            offset: options.offset,
          })
        : null,
      searchSkillsFlag
        ? searchSkills({
            q: query,
            sort: options.sort as any,
            limit: options.limit,
            offset: options.offset,
          }).catch(() => null) // Skills API may not be deployed yet
        : null,
    ]);

    // Process bundle results
    if (bundleResult) {
      bundleTotal = bundleResult.total;
      for (const bundle of bundleResult.bundles) {
        results.push({
          type: 'bundle',
          name: bundle.name,
          description: bundle.description || '',
          downloads: bundle.downloads || 0,
          version: bundle.latest_version,
          author: bundle.author?.name || undefined,
          serverType: bundle.server_type || undefined,
          verified: bundle.verified,
          provenance: !!bundle.provenance,
        });
      }
    }

    // Process skill results
    if (skillResult) {
      skillTotal = skillResult.total;
      for (const skill of skillResult.skills) {
        results.push({
          type: 'skill',
          name: skill.name,
          description: skill.description || '',
          downloads: skill.downloads || 0,
          version: skill.latest_version,
          author: skill.author?.name || undefined,
          category: skill.category || undefined,
        });
      }
    }

    // Sort combined results
    if (options.sort === 'downloads') {
      results.sort((a, b) => b.downloads - a.downloads);
    } else if (options.sort === 'name') {
      results.sort((a, b) => a.name.localeCompare(b.name));
    }
    // 'recent' sorting would require timestamps, skip for now

    // JSON output
    if (options.json) {
      console.log(
        JSON.stringify(
          {
            results,
            totals: { bundles: bundleTotal, skills: skillTotal },
          },
          null,
          2
        )
      );
      return;
    }

    // No results
    if (results.length === 0) {
      console.log(`\nNo results found for "${query}"`);
      if (!searchBundles) console.log('  (searched skills only)');
      if (!searchSkillsFlag) console.log('  (searched bundles only)');
      return;
    }

    // Summary
    const totalResults = bundleTotal + skillTotal;
    const typeFilter = options.type ? ` (${options.type}s only)` : '';
    console.log(`\nFound ${totalResults} result(s) for "${query}"${typeFilter}:\n`);

    // Table header
    const typeWidth = 10;
    const nameWidth = 38;
    const versionWidth = 12;
    const downloadsWidth = 10;

    console.log(
      'TYPE'.padEnd(typeWidth) +
        'NAME'.padEnd(nameWidth) +
        'VERSION'.padEnd(versionWidth) +
        'DOWNLOADS'.padStart(downloadsWidth)
    );

    // Table rows
    for (const result of results) {
      const typeLabel = result.type === 'bundle' ? 'bundle' : 'skill';
      const name =
        result.name.length > nameWidth - 2
          ? result.name.slice(0, nameWidth - 5) + '...'
          : result.name;
      const version = result.version || '-';
      const downloads = result.downloads.toLocaleString();

      console.log(
        typeLabel.padEnd(typeWidth) +
          name.padEnd(nameWidth) +
          version.padEnd(versionWidth) +
          downloads.padStart(downloadsWidth)
      );
    }

    console.log('');

    // Show breakdown
    if (!options.type) {
      const parts = [];
      if (bundleTotal > 0) parts.push(`${bundleTotal} bundle(s)`);
      if (skillTotal > 0) parts.push(`${skillTotal} skill(s)`);
      if (parts.length > 1) {
        console.log(`  ${parts.join(', ')}`);
      }
    }

    // Pagination hint
    const currentLimit = options.limit || 20;
    const currentOffset = options.offset || 0;
    if (bundleTotal + skillTotal > currentOffset + results.length) {
      console.log(`  Use --offset ${currentOffset + currentLimit} to see more results.`);
    }

    // Hint for more details
    console.log('');
    console.log('Use "mpak bundle show <name>" or "mpak skill show <name>" for details.');
  } catch (error) {
    console.error('Search failed');
    if (error instanceof Error) {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }
}
