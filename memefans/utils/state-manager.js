import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { LogManager, LogType } from './log-manager.js';
import { CacheManager, CacheLevel } from './cache-manager.js';

// 状态类型
export const StateType = {
    USER: 'user',
    WALLET: 'wallet',
    GIVEAWAY: 'giveaway',
    NETWORK: 'network',
    UI: 'ui'
};

// 状态作用域
export const StateScope = {
    LOCAL: 'local',
    SESSION: 'session',
    GLOBAL: 'global'
};

// 默认配置
const DEFAULT_CONFIG = {
    persistence: true,
    syncInterval: 5000, // 5秒
    maxHistory: 50,
    debounceTime: 100
};

export class StateManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logManager = new LogManager(config);
        this.cacheManager = new CacheManager(config);
        this.state = new Map();
        this.history = new Map();
        this.subscribers = new Map();
        this.pendingUpdates = new Map();
        this.updateTimer = null;
        this.initialized = false;
    }

    // 初始化
    async initialize() {
        try {
            if (this.initialized) return;

            await this.cacheManager.initialize();
            await this.loadPersistedState();
            this.startUpdateTimer();

            this.initialized = true;
            this.logManager.info('状态管理系统已初始化', LogType.SYSTEM);
        } catch (error) {
            this.logManager.error('状态管理系统初始化失败', LogType.SYSTEM, { error });
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取状态
    async getState(type, key, scope = StateScope.LOCAL) {
        try {
            await this.ensureInitialized();

            const stateKey = this.getStateKey(type, key, scope);
            let value = this.state.get(stateKey);

            // 如果内存中没有，尝试从缓存加载
            if (value === undefined) {
                value = await this.loadFromCache(type, key, scope);
                if (value !== undefined) {
                    this.state.set(stateKey, value);
                }
            }

            return value;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 设置状态
    async setState(type, key, value, scope = StateScope.LOCAL) {
        try {
            await this.ensureInitialized();

            const stateKey = this.getStateKey(type, key, scope);
            const oldValue = this.state.get(stateKey);

            // 如果值没有变化，不更新
            if (this.isEqual(oldValue, value)) {
                return;
            }

            // 保存历史记录
            this.saveHistory(type, key, scope, oldValue);

            // 更新状态
            this.state.set(stateKey, value);

            // 添加到待更新队列
            this.addToPendingUpdates(type, key, scope, value);

            // 通知订阅者
            this.notifySubscribers(type, key, scope, value, oldValue);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 删除状态
    async deleteState(type, key, scope = StateScope.LOCAL) {
        try {
            await this.ensureInitialized();

            const stateKey = this.getStateKey(type, key, scope);
            const oldValue = this.state.get(stateKey);

            if (oldValue !== undefined) {
                // 保存历史记录
                this.saveHistory(type, key, scope, oldValue);

                // 删除状态
                this.state.delete(stateKey);

                // 从缓存中删除
                await this.removeFromCache(type, key, scope);

                // 通知订阅者
                this.notifySubscribers(type, key, scope, undefined, oldValue);
            }
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 订阅状态变化
    subscribe(type, key, scope, callback) {
        try {
            const subscriptionKey = this.getStateKey(type, key, scope);
            if (!this.subscribers.has(subscriptionKey)) {
                this.subscribers.set(subscriptionKey, new Set());
            }
            this.subscribers.get(subscriptionKey).add(callback);

            // 返回取消订阅函数
            return () => {
                this.subscribers.get(subscriptionKey)?.delete(callback);
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取状态历史
    getHistory(type, key, scope = StateScope.LOCAL) {
        try {
            const historyKey = this.getStateKey(type, key, scope);
            return this.history.get(historyKey) || [];
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 撤销最后一次更改
    async undo(type, key, scope = StateScope.LOCAL) {
        try {
            await this.ensureInitialized();

            const historyKey = this.getStateKey(type, key, scope);
            const history = this.history.get(historyKey) || [];

            if (history.length > 0) {
                const lastState = history.pop();
                await this.setState(type, key, lastState.value, scope);
                return true;
            }

            return false;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取状态快照
    getSnapshot() {
        try {
            const snapshot = {};
            for (const [key, value] of this.state) {
                snapshot[key] = value;
            }
            return snapshot;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 从快照恢复状态
    async restoreSnapshot(snapshot) {
        try {
            await this.ensureInitialized();

            for (const [key, value] of Object.entries(snapshot)) {
                const [type, actualKey, scope] = this.parseStateKey(key);
                await this.setState(type, actualKey, value, scope);
            }
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 保存历史记录
    saveHistory(type, key, scope, value) {
        const historyKey = this.getStateKey(type, key, scope);
        if (!this.history.has(historyKey)) {
            this.history.set(historyKey, []);
        }

        const history = this.history.get(historyKey);
        history.push({
            value,
            timestamp: Date.now()
        });

        // 限制历史记录数量
        while (history.length > this.config.maxHistory) {
            history.shift();
        }
    }

    // 添加到待更新队列
    addToPendingUpdates(type, key, scope, value) {
        const updateKey = this.getStateKey(type, key, scope);
        this.pendingUpdates.set(updateKey, {
            type,
            key,
            scope,
            value,
            timestamp: Date.now()
        });
    }

    // 通知订阅者
    notifySubscribers(type, key, scope, newValue, oldValue) {
        const subscriptionKey = this.getStateKey(type, key, scope);
        const subscribers = this.subscribers.get(subscriptionKey);

        if (subscribers) {
            for (const callback of subscribers) {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    this.logManager.error('通知订阅者失败', LogType.SYSTEM, { error });
                }
            }
        }
    }

    // 从缓存加载状态
    async loadFromCache(type, key, scope) {
        const cacheKey = this.getStateKey(type, key, scope);
        const cacheLevel = this.getCacheLevelForScope(scope);
        return await this.cacheManager.get(cacheKey, cacheLevel);
    }

    // 保存状态到缓存
    async saveToCache(type, key, scope, value) {
        const cacheKey = this.getStateKey(type, key, scope);
        const cacheLevel = this.getCacheLevelForScope(scope);
        await this.cacheManager.set(cacheKey, value, cacheLevel);
    }

    // 从缓存删除状态
    async removeFromCache(type, key, scope) {
        const cacheKey = this.getStateKey(type, key, scope);
        const cacheLevel = this.getCacheLevelForScope(scope);
        await this.cacheManager.delete(cacheKey, cacheLevel);
    }

    // 加载持久化状态
    async loadPersistedState() {
        if (!this.config.persistence) return;

        for (const scope of Object.values(StateScope)) {
            const cacheLevel = this.getCacheLevelForScope(scope);
            const data = await this.cacheManager.get('state', cacheLevel);
            if (data) {
                for (const [key, value] of Object.entries(data)) {
                    const [type, actualKey] = this.parseStateKey(key);
                    this.state.set(this.getStateKey(type, actualKey, scope), value);
                }
            }
        }
    }

    // 启动更新定时器
    startUpdateTimer() {
        this.updateTimer = setInterval(() => {
            this.processPendingUpdates();
        }, this.config.syncInterval);
    }

    // 处理待更新队列
    async processPendingUpdates() {
        if (this.pendingUpdates.size === 0) return;

        const updates = Array.from(this.pendingUpdates.values());
        this.pendingUpdates.clear();

        for (const update of updates) {
            try {
                await this.saveToCache(
                    update.type,
                    update.key,
                    update.scope,
                    update.value
                );
            } catch (error) {
                this.logManager.error('保存状态失败', LogType.SYSTEM, { error });
            }
        }
    }

    // 获取状态键
    getStateKey(type, key, scope) {
        return `${type}:${key}:${scope}`;
    }

    // 解析状态键
    parseStateKey(stateKey) {
        const [type, key, scope] = stateKey.split(':');
        return [type, key, scope];
    }

    // 获取缓存级别
    getCacheLevelForScope(scope) {
        switch (scope) {
            case StateScope.SESSION:
                return CacheLevel.SESSION;
            case StateScope.LOCAL:
                return CacheLevel.LOCAL;
            case StateScope.GLOBAL:
                return CacheLevel.MEMORY;
            default:
                return CacheLevel.MEMORY;
        }
    }

    // 比较值是否相等
    isEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        return JSON.stringify(a) === JSON.stringify(b);
    }

    // 确保已初始化
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    // 销毁状态管理器
    destroy() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }

        this.state.clear();
        this.history.clear();
        this.subscribers.clear();
        this.pendingUpdates.clear();
        this.initialized = false;
    }
}
