import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from './config-manager.js';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

describe('ConfigManager', () => {
  const testConfigDir = join(homedir(), '.mpak');
  const testConfigFile = join(testConfigDir, 'config.json');

  beforeEach(() => {
    // Clean up test config before each test
    if (existsSync(testConfigFile)) {
      rmSync(testConfigFile, { force: true });
    }
  });

  afterEach(() => {
    // Clean up test config after each test
    if (existsSync(testConfigFile)) {
      rmSync(testConfigFile, { force: true });
    }
  });

  describe('loadConfig', () => {
    it('should create a new config if none exists', () => {
      const manager = new ConfigManager();
      const config = manager.loadConfig();

      expect(config).toBeDefined();
      expect(config.version).toBe('1.0.0');
      expect(config.lastUpdated).toBeTruthy();
    });

    it('should set registryUrl in config', () => {
      const manager = new ConfigManager();
      manager.setRegistryUrl('http://test.example.com');

      // Get the config to verify it's set
      expect(manager.getRegistryUrl()).toBe('http://test.example.com');
    });
  });

  describe('getRegistryUrl', () => {
    it('should return default registry URL', () => {
      const manager = new ConfigManager();
      const url = manager.getRegistryUrl();

      expect(url).toBe('https://api.mpak.dev');
    });

    it('should return configured registry URL', () => {
      const manager = new ConfigManager();
      manager.setRegistryUrl('http://custom.example.com');

      expect(manager.getRegistryUrl()).toBe('http://custom.example.com');
    });
  });

  describe('package config', () => {
    it('should set and get package config value', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'api_key', 'test-value');

      expect(manager.getPackageConfigValue('@scope/name', 'api_key')).toBe('test-value');
    });

    it('should return undefined for non-existent package', () => {
      const manager = new ConfigManager();

      expect(manager.getPackageConfig('@nonexistent/pkg')).toBeUndefined();
    });

    it('should return undefined for non-existent key', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'existing', 'value');

      expect(manager.getPackageConfigValue('@scope/name', 'nonexistent')).toBeUndefined();
    });

    it('should get all package config', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'key1', 'value1');
      manager.setPackageConfigValue('@scope/name', 'key2', 'value2');

      const config = manager.getPackageConfig('@scope/name');
      expect(config).toEqual({
        key1: 'value1',
        key2: 'value2',
      });
    });

    it('should clear specific package config value', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'key1', 'value1');
      manager.setPackageConfigValue('@scope/name', 'key2', 'value2');

      const cleared = manager.clearPackageConfigValue('@scope/name', 'key1');
      expect(cleared).toBe(true);
      expect(manager.getPackageConfigValue('@scope/name', 'key1')).toBeUndefined();
      expect(manager.getPackageConfigValue('@scope/name', 'key2')).toBe('value2');
    });

    it('should return false when clearing non-existent key', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'key1', 'value1');

      const cleared = manager.clearPackageConfigValue('@scope/name', 'nonexistent');
      expect(cleared).toBe(false);
    });

    it('should clear all package config', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'key1', 'value1');
      manager.setPackageConfigValue('@scope/name', 'key2', 'value2');

      const cleared = manager.clearPackageConfig('@scope/name');
      expect(cleared).toBe(true);
      expect(manager.getPackageConfig('@scope/name')).toBeUndefined();
    });

    it('should return false when clearing non-existent package', () => {
      const manager = new ConfigManager();

      const cleared = manager.clearPackageConfig('@nonexistent/pkg');
      expect(cleared).toBe(false);
    });

    it('should list packages with config', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/pkg1', 'key', 'value');
      manager.setPackageConfigValue('@scope/pkg2', 'key', 'value');

      const packages = manager.listPackagesWithConfig();
      expect(packages).toContain('@scope/pkg1');
      expect(packages).toContain('@scope/pkg2');
      expect(packages).toHaveLength(2);
    });

    it('should clean up empty package entry after clearing last key', () => {
      const manager = new ConfigManager();
      manager.setPackageConfigValue('@scope/name', 'only_key', 'value');
      manager.clearPackageConfigValue('@scope/name', 'only_key');

      expect(manager.getPackageConfig('@scope/name')).toBeUndefined();
      expect(manager.listPackagesWithConfig()).not.toContain('@scope/name');
    });
  });

});
