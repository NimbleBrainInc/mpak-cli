import { describe, it, expect, afterAll } from 'vitest';
import { RegistryClient } from '../../src/lib/api/registry-client.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration tests for the mpak registry client
 *
 * These tests hit the live api.mpak.dev registry using the @nimblebraininc/echo
 * bundle as a known fixture. They verify the full flow from search to download.
 *
 * Run with: npm run test:integration
 */
describe('RegistryClient Integration', () => {
  const client = new RegistryClient();
  const testBundle = '@nimblebraininc/echo';
  const downloadedFiles: string[] = [];

  afterAll(() => {
    // Clean up any downloaded files
    for (const file of downloadedFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  });

  describe('searchBundles', () => {
    it('should find echo bundle when searching for "echo"', async () => {
      const result = await client.searchBundles('echo');

      expect(result.bundles).toBeDefined();
      expect(result.bundles.length).toBeGreaterThan(0);

      const echoBundle = result.bundles.find(b => b.name === testBundle);
      expect(echoBundle).toBeDefined();
      expect(echoBundle?.description).toContain('Echo');
    }, 15000); // Allow extra time for API cold start

    it('should return empty results for nonsense query', async () => {
      const result = await client.searchBundles('xyznonexistent12345');

      expect(result.bundles).toBeDefined();
      expect(result.bundles.length).toBe(0);
    });

    it('should respect limit parameter', async () => {
      const result = await client.searchBundles('', { limit: 1 });

      expect(result.bundles.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getBundle', () => {
    it('should return bundle details for @nimblebraininc/echo', async () => {
      const bundle = await client.getBundle(testBundle);

      expect(bundle.name).toBe(testBundle);
      expect(bundle.description).toBeDefined();
      expect(bundle.server_type).toBe('python');
      expect(bundle.author).toBeDefined();
      expect(bundle.latest_version).toBeDefined();
    });

    it('should include provenance information', async () => {
      const bundle = await client.getBundle(testBundle);

      expect(bundle.provenance).toBeDefined();
      expect(bundle.provenance?.provider).toBe('github_oidc');
      expect(bundle.provenance?.repository).toContain('mcp-echo');
    });

    it('should throw error for non-existent bundle', async () => {
      await expect(
        client.getBundle('@nonexistent/bundle-xyz')
      ).rejects.toThrow('Bundle not found');
    });

    it('should throw error for unscoped package name', async () => {
      await expect(
        client.getBundle('unscoped-name')
      ).rejects.toThrow('Package name must be scoped');
    });
  });

  describe('getVersions', () => {
    it('should return version list with platforms', async () => {
      const result = await client.getVersions(testBundle);

      expect(result.versions).toBeDefined();
      expect(result.versions.length).toBeGreaterThan(0);

      const latestVersion = result.versions[0];
      expect(latestVersion.version).toBeDefined();
      expect(latestVersion.platforms).toBeDefined();
      expect(latestVersion.platforms.length).toBeGreaterThan(0);
    });

    it('should include linux platforms for echo bundle', async () => {
      const result = await client.getVersions(testBundle);

      const latestVersion = result.versions[0];
      const platforms = latestVersion.platforms.map(p => `${p.os}-${p.arch}`);

      expect(platforms).toContain('linux-x64');
      expect(platforms).toContain('linux-arm64');
    });
  });

  describe('getDownloadInfo', () => {
    it('should return download URL for latest version', async () => {
      const info = await client.getDownloadInfo(testBundle, undefined, {
        os: 'linux',
        arch: 'x64',
      });

      expect(info.url).toBeDefined();
      expect(info.url).toMatch(/^https?:\/\//);
      expect(info.bundle.version).toBeDefined();
      expect(info.bundle.platform).toBeDefined();
      expect(info.bundle.size).toBeGreaterThan(0);
      expect(info.bundle.sha256).toBeDefined();
    });

    it('should return correct artifact for requested platform', async () => {
      const info = await client.getDownloadInfo(testBundle, undefined, {
        os: 'linux',
        arch: 'arm64',
      });

      expect(info.bundle.platform.os).toBe('linux');
      expect(info.bundle.platform.arch).toBe('arm64');
    });

    it('should return download info for specific version', async () => {
      const versions = await client.getVersions(testBundle);
      const specificVersion = versions.versions[0].version;

      const info = await client.getDownloadInfo(testBundle, specificVersion, {
        os: 'linux',
        arch: 'x64',
      });

      expect(info.bundle.version).toBe(specificVersion);
    });
  });

  describe('downloadBundle', () => {
    it('should download bundle file successfully', async () => {
      const info = await client.getDownloadInfo(testBundle, undefined, {
        os: 'linux',
        arch: 'x64',
      });

      const outputPath = path.join(
        process.cwd(),
        `test-download-${Date.now()}.mcpb`
      );
      downloadedFiles.push(outputPath);

      await client.downloadBundle(info.url, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);

      const stats = fs.statSync(outputPath);
      expect(stats.size).toBe(info.bundle.size);
    }, 60000); // 60s timeout for download
  });

  describe('detectPlatform', () => {
    it('should return valid platform object', () => {
      const platform = RegistryClient.detectPlatform();

      expect(platform.os).toBeDefined();
      expect(platform.arch).toBeDefined();
      expect(['darwin', 'linux', 'win32', 'any']).toContain(platform.os);
      expect(['x64', 'arm64', 'any']).toContain(platform.arch);
    });
  });
});
