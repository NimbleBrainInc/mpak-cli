import { Command } from 'commander';
import { getVersion } from './utils/version.js';
import { handleSearch } from './commands/packages/search.js';
import { handleShow } from './commands/packages/show.js';
import { handlePull } from './commands/packages/pull.js';
import { handleRun } from './commands/packages/run.js';
import { handleConfigSet, handleConfigGet, handleConfigList, handleConfigClear } from './commands/config.js';

/**
 * Creates and configures the CLI program
 *
 * MVP: Unauthenticated commands only (v1 API)
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('mpak')
    .description('CLI for downloading MCPB bundles from the package directory')
    .version(getVersion(), '-v, --version', 'Output the current version');

  // Search command
  program
    .command('search <query>')
    .description('Search public bundles')
    .option('--type <type>', 'Filter by server type (node, python, binary)')
    .option('--sort <field>', 'Sort by: downloads, recent, name')
    .option('--limit <number>', 'Limit results', parseInt)
    .option('--offset <number>', 'Pagination offset', parseInt)
    .option('--json', 'Output as JSON')
    .action(async (query, options) => {
      await handleSearch(query, options);
    });

  // Show command
  program
    .command('show <package>')
    .description('Show detailed information about a bundle')
    .option('--json', 'Output as JSON')
    .action(async (packageName, options) => {
      await handleShow(packageName, options);
    });

  // Info command (alias for show)
  program
    .command('info <package>')
    .description('Show detailed information about a bundle (alias for show)')
    .option('--json', 'Output as JSON')
    .action(async (packageName, options) => {
      await handleShow(packageName, options);
    });

  // Pull command
  program
    .command('pull <package>')
    .description('Download a bundle from the registry (e.g., @scope/name or @scope/name@1.0.0)')
    .option('-o, --output <path>', 'Output file path')
    .option('--os <os>', 'Target OS (darwin, linux, win32)')
    .option('--arch <arch>', 'Target architecture (x64, arm64)')
    .option('--json', 'Output download info as JSON')
    .action(async (packageSpec, options) => {
      await handlePull(packageSpec, options);
    });

  // Install command (alias for pull)
  program
    .command('install <package>')
    .description('Download a bundle from the registry (alias for pull)')
    .option('-o, --output <path>', 'Output file path')
    .option('--os <os>', 'Target OS (darwin, linux, win32)')
    .option('--arch <arch>', 'Target architecture (x64, arm64)')
    .option('--json', 'Output download info as JSON')
    .action(async (packageSpec, options) => {
      await handlePull(packageSpec, options);
    });

  // Run command
  program
    .command('run <package>')
    .description('Run an MCP server from the registry (e.g., @scope/name or @scope/name@1.0.0)')
    .option('--update', 'Force re-download even if cached')
    .action(async (packageSpec, options) => {
      await handleRun(packageSpec, options);
    });

  // Config command group
  const configCmd = program
    .command('config')
    .description('Manage per-package configuration values');

  configCmd
    .command('set <package> <key=value...>')
    .description('Set config value(s) for a package (e.g., mpak config set @scope/name api_key=xxx)')
    .action(async (packageName, keyValuePairs) => {
      await handleConfigSet(packageName, keyValuePairs);
    });

  configCmd
    .command('get <package>')
    .description('Show stored config for a package (values are masked)')
    .option('--json', 'Output as JSON')
    .action(async (packageName, options) => {
      await handleConfigGet(packageName, options);
    });

  configCmd
    .command('list')
    .description('List all packages with stored config')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      await handleConfigList(options);
    });

  configCmd
    .command('clear <package> [key]')
    .description('Clear config for a package (all values or specific key)')
    .action(async (packageName, key) => {
      await handleConfigClear(packageName, key);
    });

  return program;
}
