import { DEFAULT_GENESIS_MIND_TEMPLATE_SOURCE, GenesisMindTemplateCatalog } from './GenesisMindTemplateCatalog';
import { GitHubRegistryClient, type TreeEntry } from './GitHubRegistryClient';
import type { AppConfig, MarketplaceRegistry, MarketplaceRegistryActionResult } from '@chamber/shared/types';

interface ConfigStore {
  load(): AppConfig;
  save(config: AppConfig): void;
}

interface RegistryClient {
  fetchTree(owner: string, repo: string, branch: string): TreeEntry[];
  fetchJsonContent(owner: string, repo: string, filePath: string, ref: string): unknown;
}

export class MarketplaceRegistryService {
  constructor(
    private readonly configStore: ConfigStore,
    private readonly registryClient: RegistryClient = new GitHubRegistryClient(),
  ) {}

  listGenesisRegistries(): MarketplaceRegistry[] {
    return this.configStore.load().marketplaceRegistries ?? [DEFAULT_GENESIS_MIND_TEMPLATE_SOURCE as MarketplaceRegistry];
  }

  addGenesisRegistry(rawUrl: string): MarketplaceRegistryActionResult {
    let registry: MarketplaceRegistry;
    try {
      registry = parseGitHubMarketplaceUrl(rawUrl);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      new GenesisMindTemplateCatalog(this.registryClient, registry).listTemplates();
    } catch {
      return {
        success: false,
        error: `Unable to access marketplace ${registry.label}. Check your GitHub sign-in or repository access.`,
      };
    }

    const config = this.configStore.load();
    const registries = config.marketplaceRegistries ?? [DEFAULT_GENESIS_MIND_TEMPLATE_SOURCE as MarketplaceRegistry];
    const existingIndex = registries.findIndex((item) => item.id === registry.id);
    const nextRegistries = [...registries];
    if (existingIndex >= 0) {
      nextRegistries[existingIndex] = { ...nextRegistries[existingIndex], enabled: true };
      registry = nextRegistries[existingIndex];
    } else {
      nextRegistries.push(registry);
    }

    this.configStore.save({ ...config, marketplaceRegistries: nextRegistries });
    return { success: true, registry };
  }
}

function parseGitHubMarketplaceUrl(rawUrl: string): MarketplaceRegistry {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error('Enter a GitHub marketplace repository URL.');
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid GitHub repository URL.');
  }

  if (url.hostname !== 'github.com') {
    throw new Error('Marketplace URLs must point to github.com repositories.');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new Error('Marketplace URLs must include an owner and repository.');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');
  if (!owner || !repo) {
    throw new Error('Marketplace URLs must include an owner and repository.');
  }

  return {
    id: `github:${owner}/${repo}`,
    label: `${owner}/${repo}`,
    url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    ref: 'main',
    plugin: 'genesis-minds',
    enabled: true,
    isDefault: false,
  };
}
