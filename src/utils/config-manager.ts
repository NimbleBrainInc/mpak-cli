import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Per-package user configuration (stores user_config values)
 */
export interface PackageConfig {
  [key: string]: string;
}

/**
 * Configuration structure
 */
export interface MpakConfig {
  version: string;
  lastUpdated: string;
  registryUrl?: string;
  packages?: Record<string, PackageConfig>;
}

/**
 * Configuration manager for CLI settings in ~/.mpak/config.json
 */
export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private config: MpakConfig | null = null;

  constructor() {
    this.configDir = join(homedir(), '.mpak');
    this.configFile = join(this.configDir, 'config.json');
    this.ensureConfigDir();
  }

  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  loadConfig(): MpakConfig {
    if (this.config) {
      return this.config;
    }

    if (!existsSync(this.configFile)) {
      this.config = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };
      this.saveConfig();
      return this.config;
    }

    try {
      const configJson = readFileSync(this.configFile, 'utf8');
      this.config = JSON.parse(configJson) as MpakConfig;
      return this.config;
    } catch {
      this.config = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
      };
      this.saveConfig();
      return this.config;
    }
  }

  private saveConfig(): void {
    if (!this.config) {
      return;
    }
    this.config.lastUpdated = new Date().toISOString();
    const configJson = JSON.stringify(this.config, null, 2);
    writeFileSync(this.configFile, configJson, { mode: 0o600 });
  }

  setRegistryUrl(url: string): void {
    const config = this.loadConfig();
    config.registryUrl = url;
    this.saveConfig();
  }

  getRegistryUrl(): string {
    const config = this.loadConfig();
    return config.registryUrl || process.env.MPAK_REGISTRY_URL || 'https://api.mpak.dev';
  }

  /**
   * Get all stored config values for a package
   */
  getPackageConfig(packageName: string): PackageConfig | undefined {
    const config = this.loadConfig();
    return config.packages?.[packageName];
  }

  /**
   * Get a specific config value for a package
   */
  getPackageConfigValue(packageName: string, key: string): string | undefined {
    const packageConfig = this.getPackageConfig(packageName);
    return packageConfig?.[key];
  }

  /**
   * Set a config value for a package
   */
  setPackageConfigValue(packageName: string, key: string, value: string): void {
    const config = this.loadConfig();
    if (!config.packages) {
      config.packages = {};
    }
    if (!config.packages[packageName]) {
      config.packages[packageName] = {};
    }
    config.packages[packageName][key] = value;
    this.saveConfig();
  }

  /**
   * Clear all config values for a package
   */
  clearPackageConfig(packageName: string): boolean {
    const config = this.loadConfig();
    if (config.packages?.[packageName]) {
      delete config.packages[packageName];
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * Clear a specific config value for a package
   */
  clearPackageConfigValue(packageName: string, key: string): boolean {
    const config = this.loadConfig();
    if (config.packages?.[packageName]?.[key] !== undefined) {
      delete config.packages[packageName][key];
      // Clean up empty package entries
      if (Object.keys(config.packages[packageName]).length === 0) {
        delete config.packages[packageName];
      }
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * List all packages with stored config
   */
  listPackagesWithConfig(): string[] {
    const config = this.loadConfig();
    return Object.keys(config.packages || {});
  }
}
