// Simple in-memory cache for performance optimization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlSeconds = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const cache = new SimpleCache();

// Cache key generators
export const cacheKeys = {
  projects: () => 'projects:all',
  project: (id: string) => `project:${id}`,
  projectExpenses: (id: string) => `project:${id}:expenses`,
  projectDocuments: (id: string) => `project:${id}:documents`,
  projectAdvances: (id: string) => `project:${id}:advances`,
  projectCustomerAdvances: (id: string) => `project:${id}:customer-advances`,
  projectOwnerInvestments: (id: string) => `project:${id}:owner-investments`,
  projectFinancialSummary: (id: string) => `project:${id}:financial-summary`,
  users: () => 'users:all',
  contractors: () => 'contractors:all',
  clients: () => 'clients:all',
  tools: () => 'tools:all',
  analyticsProjects: () => 'analytics:projects',
  analyticsContractors: () => 'analytics:contractors',
  analyticsClients: () => 'analytics:clients',
  analyticsTools: () => 'analytics:tools'
};

// Cache invalidation helpers
export const invalidateProjectCache = (projectId: string): void => {
  cache.invalidate(`project:${projectId}`);
  cache.invalidate('projects:');
  cache.invalidate('analytics:');
};

export const invalidateUserCache = (): void => {
  cache.invalidate('users:');
};

export const invalidateContractorCache = (): void => {
  cache.invalidate('contractors:');
  cache.invalidate('analytics:');
};

export const invalidateClientCache = (): void => {
  cache.invalidate('clients:');
  cache.invalidate('analytics:');
};

export const invalidateToolCache = (): void => {
  cache.invalidate('tools:');
  cache.invalidate('analytics:');
};