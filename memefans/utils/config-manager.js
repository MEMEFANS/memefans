import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';

// 环境类型
export const Environment = {
    TEST: 'test',
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

// 网络类型
export const Network = {
    MAINNET: 'mainnet-beta',
    TESTNET: 'testnet',
    DEVNET: 'devnet',
    LOCALNET: 'localnet'
};

// 默认配置
const DEFAULT_CONFIG = {
    environment: Environment.DEVELOPMENT,
    network: Network.DEVNET,
    rpc: {
        mainnet: 'https://api.mainnet-beta.solana.com',
        testnet: 'https://api.testnet.solana.com',
        devnet: 'https://api.devnet.solana.com',
        localnet: 'http://localhost:8899'
    },
    websocket: {
        mainnet: 'wss://api.mainnet-beta.solana.com',
        testnet: 'wss://api.testnet.solana.com',
        devnet: 'wss://api.devnet.solana.com',
        localnet: 'ws://localhost:8900'
    },
    commitment: 'confirmed',
    contracts: {
        giveaway: {
            programId: '',
            minAmount: 1,
            maxAmount: 1000000,
            maxUsers: 1000,
            feeBasisPoints: 100, // 1%
            timeoutMinutes: 30
        }
    },
    tokens: {
        fans: {
            mint: '',
            decimals: 6,
            symbol: 'FANS',
            name: 'FANS Token'
        }
    },
    api: {
        baseUrl: '',
        timeout: 30000,
        retries: 3,
        endpoints: {
            claim: '/api/claim',
            verify: '/api/verify',
            withdraw: '/api/withdraw'
        }
    },
    storage: {
        prefix: 'fans_',
        version: '1.0.0'
    },
    validation: {
        tweet: {
            minLength: 1,
            maxLength: 280
        },
        giveaway: {
            minDuration: 60 * 60 * 1000, // 1 hour
            maxDuration: 7 * 24 * 60 * 60 * 1000 // 1 week
        }
    },
    ui: {
        theme: 'light',
        animationDuration: 300,
        toastDuration: 3000
    }
};

export class ConfigManager {
    constructor() {
        this.config = { ...DEFAULT_CONFIG };
        this.observers = new Set();
        this.isInitialized = false;
    }

    // 初始化配置
    async initialize(customConfig = {}) {
        try {
            // 合并配置
            this.config = this.mergeConfigs(DEFAULT_CONFIG, customConfig);

            // 验证配置
            await this.validateConfig(this.config);

            // 根据环境加载特定配置
            await this.loadEnvironmentConfig();

            // 标记为已初始化
            this.isInitialized = true;

            return true;
        } catch (error) {
            throw new GiveawayError('配置初始化失败: ' + error.message, ErrorCodes.CONFIG_ERROR);
        }
    }

    // 合并配置
    mergeConfigs(base, custom) {
        const merged = { ...base };
        for (const key in custom) {
            if (typeof custom[key] === 'object' && custom[key] !== null && !Array.isArray(custom[key])) {
                merged[key] = this.mergeConfigs(base[key] || {}, custom[key]);
            } else {
                merged[key] = custom[key];
            }
        }
        return merged;
    }

    // 验证配置
    async validateConfig(config) {
        // 验证环境
        if (!Object.values(Environment).includes(config.environment)) {
            throw new GiveawayError('无效的环境配置', ErrorCodes.CONFIG_ERROR);
        }

        // 验证网络
        if (!Object.values(Network).includes(config.network)) {
            throw new GiveawayError('无效的网络配置', ErrorCodes.CONFIG_ERROR);
        }

        // 验证RPC配置
        if (!config.rpc || !config.rpc[config.network.split('-')[0]]) {
            throw new GiveawayError('无效的RPC配置', ErrorCodes.CONFIG_ERROR);
        }

        // 验证WebSocket配置
        if (!config.websocket || !config.websocket[config.network.split('-')[0]]) {
            throw new GiveawayError('无效的WebSocket配置', ErrorCodes.CONFIG_ERROR);
        }

        return true;
    }

    // 根据环境加载特定配置
    async loadEnvironmentConfig() {
        const envConfig = {
            development: {
                api: {
                    baseUrl: 'http://localhost:3000'
                }
            },
            staging: {
                api: {
                    baseUrl: 'https://staging-api.example.com'
                }
            },
            production: {
                api: {
                    baseUrl: 'https://api.example.com'
                }
            },
            test: {
                api: {
                    baseUrl: 'https://test-api.example.com'
                }
            }
        };

        this.config = this.mergeConfigs(
            this.config,
            envConfig[this.config.environment] || {}
        );
    }

    // 加载存储的配置
    async loadStoredConfig() {
        try {
            const stored = await chrome.storage.local.get(['fans_config']);
            if (stored.fans_config) {
                this.config = this.mergeConfigs(
                    this.config,
                    JSON.parse(stored.fans_config)
                );
            }
        } catch (error) {
            console.warn('加载存储的配置失败:', error);
        }
    }

    // 保存配置到存储
    async saveConfig() {
        try {
            await chrome.storage.local.set({
                fans_config: JSON.stringify(this.config)
            });
            this.notifyObservers('saved');
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取配置值
    get(path) {
        return this.getConfigValue(this.config, path);
    }

    // 设置配置值
    async set(path, value) {
        try {
            this.setConfigValue(this.config, path, value);
            await this.saveConfig();
            this.notifyObservers('updated', { path, value });
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取配置值（支持点号路径）
    getConfigValue(obj, path) {
        const parts = path.split('.');
        let current = obj;

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[part];
        }

        return current;
    }

    // 设置配置值（支持点号路径）
    setConfigValue(obj, path, value) {
        const parts = path.split('.');
        let current = obj;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!(part in current)) {
                current[part] = {};
            }
            current = current[part];
        }

        current[parts[parts.length - 1]] = value;
    }

    // 添加观察者
    addObserver(observer) {
        if (typeof observer === 'function') {
            this.observers.add(observer);
        }
    }

    // 移除观察者
    removeObserver(observer) {
        this.observers.delete(observer);
    }

    // 通知观察者
    notifyObservers(event, data = {}) {
        for (const observer of this.observers) {
            try {
                observer({ event, data, config: this.config });
            } catch (error) {
                console.error('通知观察者失败:', error);
            }
        }
    }

    // 重置配置
    async reset() {
        try {
            this.config = { ...DEFAULT_CONFIG };
            await this.saveConfig();
            this.notifyObservers('reset');
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 导出配置
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    // 导入配置
    async import(configString) {
        try {
            const imported = JSON.parse(configString);
            await this.initialize(imported);
            await this.saveConfig();
            this.notifyObservers('imported');
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取当前环境
    getEnvironment() {
        return this.config.environment;
    }

    // 获取当前网络
    getNetwork() {
        return this.config.network;
    }

    // 获取RPC URL
    getRpcUrl() {
        return this.config.rpc[this.config.network];
    }

    // 获取WebSocket URL
    getWsUrl() {
        return this.config.websocket[this.config.network];
    }

    // 获取API URL
    getApiUrl(endpoint) {
        const baseUrl = this.config.api.baseUrl;
        const path = this.config.api.endpoints[endpoint];
        return path ? `${baseUrl}${path}` : baseUrl;
    }
}
