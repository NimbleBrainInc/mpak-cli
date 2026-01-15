# mpak CLI

[![CI](https://github.com/NimbleBrainInc/mpak-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/NimbleBrainInc/mpak-cli/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm](https://img.shields.io/npm/v/@nimblebrain/mpak)](https://www.npmjs.com/package/@nimblebrain/mpak)
[![node](https://img.shields.io/node/v/@nimblebrain/mpak)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord](https://img.shields.io/badge/Discord-%235865F2.svg?logo=discord&logoColor=white)](https://www.nimblebrain.ai/discord?utm_source=github&utm_medium=readme&utm_campaign=mpak-cli&utm_content=discord-badge)

CLI for MCP bundles and Agent Skills.

## Installation

```bash
npm install -g @nimblebrain/mpak
```

## Quick Start

```bash
# Search for everything (bundles + skills)
mpak search postgres

# Run an MCP server
mpak run @owner/my-server

# Search skills only
mpak skill search strategy

# Install a skill
mpak skill install @owner/my-skill
```

## Claude Code Integration

Add any mpak bundle to Claude Code with a single command:

```bash
claude mcp add --transport stdio echo -- mpak run @nimblebraininc/echo
```

For bundles requiring API keys:

```bash
# Set config once
mpak config set @nimblebraininc/ipinfo api_key=your_token

# Then add to Claude Code
claude mcp add --transport stdio ipinfo -- mpak run @nimblebraininc/ipinfo
```

## Commands

### Unified Search

Search across both bundles and skills.

```bash
# Search everything
mpak search postgres

# Filter by type
mpak search postgres --type bundle
mpak search strategy --type skill

# Sort and limit
mpak search mcp --sort downloads --limit 10
```

Options:
- `--type <type>` - Filter by type (bundle, skill)
- `--sort <field>` - Sort by: downloads, recent, name
- `--limit <n>` - Limit results
- `--offset <n>` - Pagination offset
- `--json` - Output as JSON

### Bundle Commands

MCP bundle operations for discovering, downloading, and running MCP servers.

| Command | Description |
|---------|-------------|
| `mpak bundle search <query>` | Search public bundles |
| `mpak bundle show <package>` | Show bundle details with platforms |
| `mpak bundle pull <package>` | Download a bundle |
| `mpak bundle run <package>` | Run an MCP server from the registry |

#### bundle search

Search for bundles in the registry.

```bash
mpak bundle search echo
mpak bundle search --type python echo
mpak bundle search --sort downloads --limit 10 mcp
```

Options:
- `--type <type>` - Filter by server type (node, python, binary)
- `--sort <field>` - Sort by: downloads, recent, name (default: downloads)
- `--limit <n>` - Limit results (default: 20)
- `--offset <n>` - Pagination offset
- `--json` - Output as JSON

#### bundle show

Display detailed information about a bundle.

```bash
mpak bundle show @nimblebraininc/echo
mpak bundle show @nimblebraininc/echo --json
```

Shows:
- Bundle metadata (name, author, type, license)
- Provenance info (if published via GitHub Actions OIDC)
- Download stats
- Available versions with platforms
- Install instructions

Options:
- `--json` - Output as JSON

#### bundle pull

Download a bundle from the registry.

```bash
# Download latest version for current platform
mpak bundle pull @nimblebraininc/echo

# Download specific version
mpak bundle pull @nimblebraininc/echo@1.0.0

# Download for different platform (cross-compile use case)
mpak bundle pull @nimblebraininc/echo --os linux --arch arm64

# Custom output path
mpak bundle pull @nimblebraininc/echo -o ./bundles/echo.mcpb
```

Options:
- `-o, --output <path>` - Output file path
- `--os <os>` - Target OS: darwin, linux, win32
- `--arch <arch>` - Target architecture: x64, arm64
- `--json` - Output download info as JSON (doesn't download)

#### bundle run

Run an MCP server directly from the registry. Bundles are cached locally for fast subsequent runs.

```bash
# Run latest version
mpak bundle run @nimblebraininc/echo

# Run specific version
mpak bundle run @nimblebraininc/echo@1.0.0

# Force re-download (update cache)
mpak bundle run @nimblebraininc/echo --update
```

Options:
- `--update` - Force re-download even if cached

> **Tip:** Use `mpak run` as a shortcut for `mpak bundle run`.

**Claude Code:**

```bash
claude mcp add --transport stdio echo -- mpak run @nimblebraininc/echo
```

**Claude Desktop:**

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

### Skill Commands

Agent skill operations for validating, packaging, and installing skills.

| Command | Description |
|---------|-------------|
| `mpak skill validate <path>` | Validate a skill directory |
| `mpak skill pack <path>` | Create a .skill bundle |
| `mpak skill search <query>` | Search skills in the registry |
| `mpak skill show <name>` | Show skill details |
| `mpak skill pull <name>` | Download a .skill bundle |
| `mpak skill install <name>` | Install to ~/.claude/skills/ |
| `mpak skill list` | List installed skills |

#### skill validate

Validate a skill directory against the [Agent Skills specification](https://agentskills.io/specification).

```bash
mpak skill validate ./my-skill
mpak skill validate ./my-skill --json
```

Options:
- `--json` - Output as JSON

#### skill pack

Create a `.skill` bundle from a skill directory.

```bash
mpak skill pack ./my-skill
mpak skill pack ./my-skill -o ./dist/my-skill.skill
```

Options:
- `-o, --output <path>` - Output file path
- `--json` - Output as JSON

#### skill search

Search for skills in the registry.

```bash
mpak skill search strategy
mpak skill search --category development docs
mpak skill search --tags documentation,refactoring
```

Options:
- `--tags <tags>` - Filter by tags (comma-separated)
- `--category <category>` - Filter by category
- `--surface <surface>` - Filter by surface (claude-code, claude-api, claude-ai)
- `--sort <field>` - Sort by: downloads, recent, name
- `--limit <n>` - Limit results
- `--offset <n>` - Pagination offset
- `--json` - Output as JSON

#### skill show

Display detailed information about a skill.

```bash
mpak skill show @nimblebraininc/docs-auditor
mpak skill show @nimblebraininc/docs-auditor --json
```

Options:
- `--json` - Output as JSON

#### skill pull

Download a skill bundle from the registry.

```bash
mpak skill pull @nimblebraininc/docs-auditor
mpak skill pull @nimblebraininc/docs-auditor -o ./skills/
```

Options:
- `-o, --output <path>` - Output file path
- `--json` - Output as JSON

#### skill install

Download and install a skill to `~/.claude/skills/`.

```bash
mpak skill install @nimblebraininc/docs-auditor
mpak skill install @nimblebraininc/docs-auditor --force
```

Options:
- `--force` - Overwrite existing installation
- `--json` - Output as JSON

#### skill list

List installed skills.

```bash
mpak skill list
mpak skill list --json
```

Options:
- `--json` - Output as JSON

### Config Commands

Manage per-package configuration values (e.g., API keys).

| Command | Description |
|---------|-------------|
| `mpak config set <pkg> <k=v...>` | Set config values |
| `mpak config get <pkg>` | Show config (values masked) |
| `mpak config list` | List packages with config |
| `mpak config clear <pkg> [key]` | Clear config |

```bash
# Set API key for a package
mpak config set @nimblebraininc/ipinfo api_key=your_token

# View stored config (values are masked)
mpak config get @nimblebraininc/ipinfo

# List all packages with stored config
mpak config list

# Clear config
mpak config clear @nimblebraininc/ipinfo
mpak config clear @nimblebraininc/ipinfo api_key  # Clear specific key
```

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
| `GET /v1/skills/search` | Search skills |
| `GET /v1/skills/@{scope}/{name}` | Get skill details |
| `GET /v1/skills/@{scope}/{name}/download` | Get skill download URL |

## Development

### Setup

```bash
npm install
npm run build
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build TypeScript to JavaScript |
| `npm run dev` | Run CLI in development mode |
| `npm run typecheck` | Type check without building |
| `npm run generate:types` | Generate types from OpenAPI spec |
| `npm test` | Run unit tests |
| `npm run test:all` | Run all tests including integration |
| `npm run lint` | Lint source code |

### Publishing

```bash
# Stable release
npm publish

# Beta/prerelease
npm publish --tag beta
```

### Local Testing

1. Start the server locally:
   ```bash
   cd ../mpak/server
   npm run dev
   ```

2. Run CLI with local registry:
   ```bash
   MPAK_REGISTRY_URL=http://localhost:3200 npm run dev -- bundle search echo
   ```

### Project Structure

```
src/
├── index.ts                    # Entry point
├── program.ts                  # Commander program setup
├── commands/
│   ├── packages/               # Bundle commands
│   │   ├── search.ts
│   │   ├── show.ts
│   │   ├── pull.ts
│   │   └── run.ts
│   ├── skills/                 # Skill commands
│   │   ├── validate.ts
│   │   ├── pack.ts
│   │   ├── search.ts
│   │   ├── show.ts
│   │   ├── pull.ts
│   │   ├── install.ts
│   │   └── list.ts
│   └── config.ts               # Config commands
├── lib/
│   └── api/
│       ├── registry-client.ts  # Bundle API client
│       ├── skills-client.ts    # Skills API client
│       └── schema.d.ts         # Generated OpenAPI types
├── schemas/
│   └── generated/
│       └── skill.ts            # Skill validation schemas
└── utils/
    ├── config-manager.ts       # Config file handling
    └── version.ts              # Version helper
```

## License

[Apache 2.0](LICENSE)
