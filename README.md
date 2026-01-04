# mpak CLI

[![CI](https://github.com/NimbleBrainInc/mpak-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/NimbleBrainInc/mpak-cli/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/npm/v/@nimblebrain/mpak)](https://www.npmjs.com/package/@nimblebrain/mpak)
[![node](https://img.shields.io/node/v/@nimblebrain/mpak)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white)](https://www.nimblebrain.ai/discord?utm_source=github&utm_medium=readme&utm_campaign=mpak-cli&utm_content=discord-badge)

CLI for discovering and downloading MCPB bundles from the mpak registry.

## Installation

```bash
npm install -g @nimblebrain/mpak
```

## Quick Start

```bash
# Search for bundles
mpak search postgres

# Show bundle details
mpak show @owner/my-server

# Download a bundle
mpak pull @owner/my-server
mpak pull @owner/my-server@1.0.0  # specific version
```

## Commands

| Command | Description |
|---------|-------------|
| `search <query>` | Search public bundles |
| `show <package>` | Show bundle details with platforms |
| `info <package>` | Alias for show |
| `pull <package>` | Download a bundle |
| `install <package>` | Alias for pull |
| `run <package>` | Run an MCP server from the registry |

### search

Search for bundles in the registry.

```bash
mpak search echo
mpak search --type python echo
mpak search --sort downloads --limit 10 mcp
```

Options:
- `--type <type>` - Filter by server type (node, python, binary)
- `--sort <field>` - Sort by: downloads, recent, name (default: downloads)
- `--limit <n>` - Limit results (default: 20)
- `--offset <n>` - Pagination offset
- `--json` - Output as JSON

### show / info

Display detailed information about a bundle.

```bash
mpak show @nimblebraininc/echo
mpak show @nimblebraininc/echo --json
```

Shows:
- Bundle metadata (name, author, type, license)
- Provenance info (if published via GitHub Actions OIDC)
- Download stats
- Available versions with platforms
- Install instructions

Options:
- `--json` - Output as JSON

### pull / install

Download a bundle from the registry.

```bash
# Download latest version for current platform
mpak pull @nimblebraininc/echo

# Download specific version
mpak pull @nimblebraininc/echo@1.0.0

# Download for different platform (cross-compile use case)
mpak pull @nimblebraininc/echo --os linux --arch arm64

# Custom output path
mpak pull @nimblebraininc/echo -o ./bundles/echo.mcpb
```

Options:
- `-o, --output <path>` - Output file path
- `--os <os>` - Target OS: darwin, linux, win32
- `--arch <arch>` - Target architecture: x64, arm64
- `--json` - Output download info as JSON (doesn't download)

### run

Run an MCP server directly from the registry. Bundles are cached locally for fast subsequent runs.

```bash
# Run latest version
mpak run @nimblebraininc/echo

# Run specific version
mpak run @nimblebraininc/echo@1.0.0

# Force re-download (update cache)
mpak run @nimblebraininc/echo --update
```

Options:
- `--update` - Force re-download even if cached

**Claude Desktop Integration:**

```json
{
  "mcpServers": {
    "echo": {
      "command": "mpak",
      "args": ["run", "@nimblebraininc/echo"]
    }
  }
}
```

Bundles are cached in `~/.mpak/cache/` and automatically extracted on first run.

## Configuration

Configuration is stored in `~/.mpak/config.json`:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-12-30T...",
  "registryUrl": "https://api.mpak.dev"
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MPAK_REGISTRY_URL` | Registry API URL | `https://api.mpak.dev` |

## API

The CLI uses the public v1 API:

| Endpoint | Description |
|----------|-------------|
| `GET /v1/bundles/search` | Search bundles |
| `GET /v1/bundles/@{scope}/{pkg}` | Get bundle details |
| `GET /v1/bundles/@{scope}/{pkg}/versions` | List versions with platforms |
| `GET /v1/bundles/@{scope}/{pkg}/versions/{version}/download` | Get download URL |

## Development

### Setup

```bash
cd apps/mpak/cli
npm install
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Run CLI in development mode |
| `npm run typecheck` | Type check without building |
| `npm run generate:types` | Generate types from OpenAPI spec |
| `npm test` | Run tests |
| `npm run lint` | Lint source code |

### Publishing

```bash
# Stable release
npm publish

# Beta/prerelease (required for versions like 0.0.1-beta.1)
npm publish --tag beta
```

### Local Testing

1. Start the server locally:
   ```bash
   cd ../server
   npm run dev
   ```

2. Run CLI with local registry:
   ```bash
   MPAK_REGISTRY_URL=http://localhost:3200 npm run dev -- search echo
   ```

3. Or build and test:
   ```bash
   npm run build
   MPAK_REGISTRY_URL=http://localhost:3200 node dist/index.js search echo
   ```

### Type Generation

Types are generated from the server's OpenAPI spec:

```bash
# Requires server running locally
npm run generate:types
```

This generates `src/lib/api/schema.d.ts` from `http://localhost:3200/documentation/json`.

### Project Structure

```
src/
├── index.ts                    # Entry point
├── program.ts                  # Commander program setup
├── commands/
│   └── packages/
│       ├── search.ts           # Search command
│       ├── show.ts             # Show/info command
│       └── pull.ts             # Pull/install command
├── lib/
│   └── api/
│       ├── registry-client.ts  # API client
│       └── schema.d.ts         # Generated OpenAPI types
└── utils/
    ├── config-manager.ts       # Config file handling
    └── version.ts              # Version helper
```

## License

[Apache 2.0](LICENSE)
