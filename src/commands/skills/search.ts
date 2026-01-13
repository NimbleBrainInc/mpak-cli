import { searchSkills } from '../../lib/api/skills-client.js';

export interface SearchOptions {
  tags?: string;
  category?: string;
  surface?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
}

/**
 * Handle the skill search command
 */
export async function handleSkillSearch(query: string, options: SearchOptions): Promise<void> {
  try {
    const result = await searchSkills({
      q: query,
      tags: options.tags,
      category: options.category as any,
      surface: options.surface as any,
      sort: options.sort as any,
      limit: options.limit,
      offset: options.offset,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.skills.length === 0) {
      console.log(`No skills found for "${query}"`);
      return;
    }

    // Table header
    const nameWidth = 45;
    const categoryWidth = 12;
    const downloadsWidth = 10;

    console.log('');
    console.log(
      'NAME'.padEnd(nameWidth) +
        'CATEGORY'.padEnd(categoryWidth) +
        'DOWNLOADS'.padStart(downloadsWidth)
    );

    // Table rows
    for (const skill of result.skills) {
      const name = skill.name.length > nameWidth - 2
        ? skill.name.slice(0, nameWidth - 5) + '...'
        : skill.name;
      const category = skill.category || '-';
      const downloads = skill.downloads.toLocaleString();

      console.log(
        name.padEnd(nameWidth) +
          category.padEnd(categoryWidth) +
          downloads.padStart(downloadsWidth)
      );
    }

    if (result.pagination.has_more) {
      console.log('');
      console.log(`Showing ${result.skills.length} of ${result.total} results. Use --offset to see more.`);
    }
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
