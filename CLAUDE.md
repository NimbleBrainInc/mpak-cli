# mpak CLI

CLI for discovering and downloading MCPB bundles from the mpak registry.

## Architecture

This is a standalone CLI that uses only the public v1 API. It has no dependencies on the server or client packages and generates its TypeScript types from the server's OpenAPI spec.

### Key Files

| File | Purpose |
|------|---------|
| `src/program.ts` | Commander program setup with all commands |
| `src/lib/api/registry-client.ts` | API client for v1 endpoints |
| `src/lib/api/schema.d.ts` | Generated types from OpenAPI spec |
| `src/commands/packages/search.ts` | Search command implementation |
| `src/commands/packages/show.ts` | Show/info command implementation |
| `src/commands/packages/pull.ts` | Pull/install command implementation |
| `src/commands/packages/run.ts` | Run command implementation (caching, extraction, execution) |
| `src/utils/config-manager.ts` | Config file handling (~/.mpak/config.json) |

### Type Generation

Types are generated from the server's OpenAPI spec using `openapi-typescript`:

```bash
# Requires server running locally on port 3200
npm run generate:types
```

This generates `src/lib/api/schema.d.ts` from `http://localhost:3200/documentation/json`.

The `registry-client.ts` uses helper types to extract response types:

```typescript
import type { paths } from './schema.js';

type ResponseOf<T> = T extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never;

export type BundleSearchResponse = ResponseOf<paths['/v1/bundles/search']['get']>;
export type Bundle = BundleSearchResponse['bundles'][number];
```

## v1 API Endpoints

The CLI uses these public endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /v1/bundles/search` | Search bundles by query, type, sort |
| `GET /v1/bundles/@{scope}/{package}` | Get bundle details (metadata, readme) |
| `GET /v1/bundles/@{scope}/{package}/versions` | List versions with platform availability |
| `GET /v1/bundles/@{scope}/{package}/versions/{version}/download` | Get download URL for specific version/platform |
| `GET /v1/bundles/@{scope}/{package}/versions/latest/download` | Get download URL for latest version |

### Platform Selection

Download endpoints accept `os` and `arch` query parameters:
- `os`: darwin, linux, win32, any
- `arch`: x64, arm64, any

The server returns the best matching artifact using this priority:
1. Exact match (requested os + arch)
2. OS match with `any` arch
3. `any` OS with exact arch
4. Universal (`any` + `any`)

## Local Development

### Setup

```bash
npm install
npm run build
```

### Testing with Local Server

The CLI defaults to `https://api.mpak.dev`. For local development:

```bash
# Start the server (from ../server)
cd ../server && npm run dev

# Run CLI commands with local registry
MPAK_REGISTRY_URL=http://localhost:3200 npm run dev -- search echo
MPAK_REGISTRY_URL=http://localhost:3200 node dist/index.js pull @nimblebraininc/echo
```

### Verification

```bash
npm run build
npm run typecheck
npm run test:all
```

### Publishing

Prereleases (beta):
```bash
npm version 0.0.1-beta.X
npm run build
npm publish --tag beta --otp=<code>
git push && git push --tags
```

Stable releases:
```bash
npm version X.X.X
npm run build
npm publish --otp=<code>
git push && git push --tags
```

## Commands (MVP)

| Command | Description |
|---------|-------------|
| `search <query>` | Search public bundles |
| `show <package>` | Show bundle details with platforms |
| `info <package>` | Alias for show |
| `pull <package>` | Download a bundle |
| `install <package>` | Alias for pull |
| `run <package>` | Run an MCP server (pulls, caches, executes) |

## Design Decisions

1. **Standalone**: No shared dependencies with server/client. Types generated from OpenAPI.
2. **Public API only**: MVP uses only v1 API. Publishing requires separate tooling.
3. **Platform detection**: Auto-detects OS/arch, allows explicit override for cross-platform downloads.
4. **Config file**: Stores registry URL in `~/.mpak/config.json`, overridable via `MPAK_REGISTRY_URL`.

## Gotchas

- **No dotenv**: Removed due to v17 banner output breaking Claude Desktop MCP integration
- **Type generation**: Requires server running locally (`npm run generate:types` hits localhost:3200)
- **Schema changes**: May introduce breaking type changes; always run full verification after regenerating

## Future Considerations

- The CLI will be broken out into a completely standalone repository
- Authentication commands (login, publish) may be added when needed
- Consider adding `npx` support for zero-install usage
