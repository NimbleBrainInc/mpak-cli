import { RegistryClient } from '../../lib/api/registry-client.js';

export interface SearchOptions {
  type?: string;
  sort?: 'downloads' | 'recent' | 'name';
  limit?: number;
  offset?: number;
  json?: boolean;
}

/**
 * Search bundles (v1 API)
 */
export async function handleSearch(
  query: string,
  options: SearchOptions = {}
): Promise<void> {
  try {
    const client = new RegistryClient();
    const result = await client.searchBundles(query, {
      type: options.type,
      sort: options.sort,
      limit: options.limit,
      offset: options.offset,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (result.bundles.length === 0) {
      console.log(`\nNo bundles found for "${query}"`);
      return;
    }

    console.log(`\nFound ${result.total} bundle(s) for "${query}":\n`);

    for (const bundle of result.bundles) {
      const verified = bundle.verified ? '✓' : ' ';
      const provenance = bundle.provenance ? '🔒' : '';

      console.log(`${verified} ${bundle.name} v${bundle.latest_version} ${provenance}`);

      if (bundle.description) {
        console.log(`  ${bundle.description}`);
      }

      const details = [];
      if (bundle.downloads) details.push(`${bundle.downloads} downloads`);
      if (bundle.server_type) details.push(bundle.server_type);
      if (bundle.author?.name) details.push(`by ${bundle.author.name}`);

      if (details.length > 0) {
        console.log(`  ${details.join(' • ')}`);
      }

      if (bundle.tools && bundle.tools.length > 0) {
        const toolNames = bundle.tools.slice(0, 3).map((t) => t.name);
        const toolsDisplay =
          bundle.tools.length > 3
            ? `${toolNames.join(', ')} +${bundle.tools.length - 3} more`
            : toolNames.join(', ');
        console.log(`  Tools: ${toolsDisplay}`);
      }

      console.log();
    }

    if (result.pagination.has_more) {
      const nextOffset = (options.offset || 0) + (options.limit || 20);
      console.log(`More results available. Use --offset ${nextOffset} to see more.`);
    }

    console.log(`Use "mpak show <bundle>" for more details`);
  } catch (error) {
    console.error('=> Failed to search bundles');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}
