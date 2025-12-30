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

});
