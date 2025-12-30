import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Configuration structure
 */
export interface MpakConfig {
  version: string;
  lastUpdated: string;
  registryUrl?: string;
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
}
