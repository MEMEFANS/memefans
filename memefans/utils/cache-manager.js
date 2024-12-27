import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { LogManager, LogType } from './log-manager.js';

// 缓存策略
export const CacheStrategy = {
    LRU: 'lru', // 最近最少使用
    LFU: 'lfu', // 最不经常使用
    FIFO: 'fifo', // 先进先出
    CUSTOM: 'custom' // 自定义
};

// 缓存级别
export const CacheLevel = {
    MEMORY: 'memory',
    LOCAL: 'local',
    SESSION: 'session'
};

// 默认配置
const DEFAULT_CONFIG = {
    strategy: CacheStrategy.LRU,
    maxSize: 1000,
    maxAge: 30 * 60 * 1000, // 30分钟
    cleanupInterval: 5 * 60 * 1000, // 5分钟
    serializer: JSON.stringify,
    deserializer: JSON.parse
};

export class CacheManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logManager = new LogManager(config);
        this.caches = new Map();
        this.stats = new Map();
        this.cleanupTimer = null;
        this.initialized = false;
    }

    // 初始化
    async initialize() {
        try {
            if (this.initialized) return;

            // 初始化不同级别的缓存
            for (const level of Object.values(CacheLevel)) {
                this.caches.set(level, new Cache({
                    ...this.config,
                    level
                }));
                this.stats.set(level, {
                    hits: 0,
                    misses: 0,
                    sets: 0,
                    deletes: 0
                });
            }

            // 启动清理定时器
            this.startCleanupTimer();

            this.initialized = true;
            this.logManager.info('缓存系统已初始化', LogType.SYSTEM);
        } catch (error) {
            this.logManager.error('缓存系统初始化失败', LogType.SYSTEM, { error });
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取缓存项
    async get(key, level = CacheLevel.MEMORY) {
        try {
            await this.ensureInitialized();

            const cache = this.caches.get(level);
            if (!cache) {
                throw new GiveawayError('无效的缓存级别', ErrorCodes.CACHE_ERROR);
            }

            const value = await cache.get(key);
            this.updateStats(level, value ? 'hits' : 'misses');
            return value;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 设置缓存项
    async set(key, value, level = CacheLevel.MEMORY, options = {}) {
        try {
            await this.ensureInitialized();

            const cache = this.caches.get(level);
            if (!cache) {
                throw new GiveawayError('无效的缓存级别', ErrorCodes.CACHE_ERROR);
            }

            await cache.set(key, value, options);
            this.updateStats(level, 'sets');
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 删除缓存项
    async delete(key, level = CacheLevel.MEMORY) {
        try {
            await this.ensureInitialized();

            const cache = this.caches.get(level);
            if (!cache) {
                throw new GiveawayError('无效的缓存级别', ErrorCodes.CACHE_ERROR);
            }

            await cache.delete(key);
            this.updateStats(level, 'deletes');
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 清除所有缓存
    async clear(level = null) {
        try {
            await this.ensureInitialized();

            if (level) {
                const cache = this.caches.get(level);
                if (!cache) {
                    throw new GiveawayError('无效的缓存级别', ErrorCodes.CACHE_ERROR);
                }
                await cache.clear();
            } else {
                for (const cache of this.caches.values()) {
                    await cache.clear();
                }
            }
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取缓存统计
    getStats(level = null) {
        try {
            if (level) {
                return this.stats.get(level);
            }

            const allStats = {};
            for (const [level, stats] of this.stats) {
                allStats[level] = stats;
            }
            return allStats;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 更新统计信息
    updateStats(level, type) {
        const stats = this.stats.get(level);
        if (stats) {
            stats[type]++;
        }
    }

    // 启动清理定时器
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            for (const cache of this.caches.values()) {
                cache.cleanup();
            }
        }, this.config.cleanupInterval);
    }

    // 停止清理定时器
    stopCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    // 确保已初始化
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    // 销毁缓存管理器
    destroy() {
        this.stopCleanupTimer();
        for (const cache of this.caches.values()) {
            cache.clear();
        }
        this.caches.clear();
        this.stats.clear();
        this.initialized = false;
    }
}

// 缓存类
class Cache {
    constructor(config) {
        this.config = config;
        this.store = new Map();
        this.level = config.level;
    }

    // 获取缓存项
    async get(key) {
        const item = this.store.get(key);
        if (!item) return null;

        // 检查是否过期
        if (this.isExpired(item)) {
            this.store.delete(key);
            return null;
        }

        // 更新访问信息
        item.accessCount++;
        item.lastAccessed = Date.now();

        return this.deserialize(item.value);
    }

    // 设置缓存项
    async set(key, value, options = {}) {
        const item = {
            key,
            value: this.serialize(value),
            created: Date.now(),
            lastAccessed: Date.now(),
            accessCount: 0,
            maxAge: options.maxAge || this.config.maxAge
        };

        // 检查缓存大小
        if (this.store.size >= this.config.maxSize) {
            this.evict();
        }

        this.store.set(key, item);
    }

    // 删除缓存项
    async delete(key) {
        return this.store.delete(key);
    }

    // 清除所有缓存
    async clear() {
        this.store.clear();
    }

    // 清理过期项
    cleanup() {
        for (const [key, item] of this.store) {
            if (this.isExpired(item)) {
                this.store.delete(key);
            }
        }
    }

    // 驱逐策略
    evict() {
        switch (this.config.strategy) {
            case CacheStrategy.LRU:
                this.evictLRU();
                break;
            case CacheStrategy.LFU:
                this.evictLFU();
                break;
            case CacheStrategy.FIFO:
                this.evictFIFO();
                break;
            case CacheStrategy.CUSTOM:
                if (typeof this.config.customEvict === 'function') {
                    this.config.customEvict(this.store);
                }
                break;
        }
    }

    // LRU驱逐
    evictLRU() {
        let oldest = null;
        let oldestKey = null;

        for (const [key, item] of this.store) {
            if (!oldest || item.lastAccessed < oldest.lastAccessed) {
                oldest = item;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.store.delete(oldestKey);
        }
    }

    // LFU驱逐
    evictLFU() {
        let leastUsed = null;
        let leastUsedKey = null;

        for (const [key, item] of this.store) {
            if (!leastUsed || item.accessCount < leastUsed.accessCount) {
                leastUsed = item;
                leastUsedKey = key;
            }
        }

        if (leastUsedKey) {
            this.store.delete(leastUsedKey);
        }
    }

    // FIFO驱逐
    evictFIFO() {
        let oldest = null;
        let oldestKey = null;

        for (const [key, item] of this.store) {
            if (!oldest || item.created < oldest.created) {
                oldest = item;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.store.delete(oldestKey);
        }
    }

    // 检查是否过期
    isExpired(item) {
        return Date.now() - item.created > item.maxAge;
    }

    // 序列化
    serialize(value) {
        try {
            return this.config.serializer(value);
        } catch (error) {
            throw new GiveawayError('序列化失败', ErrorCodes.CACHE_ERROR);
        }
    }

    // 反序列化
    deserialize(value) {
        try {
            return this.config.deserializer(value);
        } catch (error) {
            throw new GiveawayError('反序列化失败', ErrorCodes.CACHE_ERROR);
        }
    }
}
