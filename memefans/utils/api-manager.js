import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { LogManager, LogType } from './log-manager.js';
import { CacheManager, CacheLevel } from './cache-manager.js';
import { SecurityManager } from './security-manager.js';

// API方法
export const ApiMethod = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH'
};

// 缓存策略
export const CacheStrategy = {
    NONE: 'none',
    CACHE_FIRST: 'cache_first',
    NETWORK_FIRST: 'network_first',
    CACHE_ONLY: 'cache_only',
    NETWORK_ONLY: 'network_only'
};

// 默认配置
const DEFAULT_CONFIG = {
    baseUrl: '',
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    cacheStrategy: CacheStrategy.NETWORK_FIRST,
    cacheTTL: 5 * 60 * 1000, // 5分钟
    headers: {
        'Content-Type': 'application/json'
    },
    validateStatus: (status) => status >= 200 && status < 300
};

export class ApiManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logManager = new LogManager(config);
        this.cacheManager = new CacheManager(config);
        this.securityManager = new SecurityManager(config);
        this.endpoints = new Map();
        this.interceptors = {
            request: [],
            response: []
        };
        this.initialized = false;
    }

    // 初始化
    async initialize() {
        try {
            if (this.initialized) return;

            await this.cacheManager.initialize();
            await this.securityManager.initialize();

            this.initialized = true;
            this.logManager.info('API系统已初始化', LogType.SYSTEM);
        } catch (error) {
            this.logManager.error('API系统初始化失败', LogType.SYSTEM, { error });
            throw ErrorHandler.handleError(error);
        }
    }

    // 注册端点
    registerEndpoint(name, config) {
        try {
            if (this.endpoints.has(name)) {
                throw new GiveawayError('端点已存在', ErrorCodes.API_ERROR);
            }

            this.endpoints.set(name, {
                ...this.config,
                ...config
            });
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 添加请求拦截器
    addRequestInterceptor(interceptor) {
        this.interceptors.request.push(interceptor);
        return () => {
            const index = this.interceptors.request.indexOf(interceptor);
            if (index !== -1) {
                this.interceptors.request.splice(index, 1);
            }
        };
    }

    // 添加响应拦截器
    addResponseInterceptor(interceptor) {
        this.interceptors.response.push(interceptor);
        return () => {
            const index = this.interceptors.response.indexOf(interceptor);
            if (index !== -1) {
                this.interceptors.response.splice(index, 1);
            }
        };
    }

    // 发送请求
    async request(endpointName, options = {}) {
        try {
            await this.ensureInitialized();

            const endpoint = this.endpoints.get(endpointName);
            if (!endpoint) {
                throw new GiveawayError('端点不存在', ErrorCodes.API_ERROR);
            }

            const config = {
                ...endpoint,
                ...options,
                headers: {
                    ...endpoint.headers,
                    ...options.headers
                }
            };

            // 处理URL
            const url = this.buildUrl(config);

            // 应用请求拦截器
            const modifiedConfig = await this.applyRequestInterceptors(config);

            // 检查缓存
            const cacheKey = this.generateCacheKey(url, modifiedConfig);
            const cachedResponse = await this.checkCache(cacheKey, modifiedConfig.cacheStrategy);
            if (cachedResponse) {
                return cachedResponse;
            }

            // 发送请求
            const response = await this.sendRequest(url, modifiedConfig);

            // 应用响应拦截器
            const modifiedResponse = await this.applyResponseInterceptors(response);

            // 更新缓存
            await this.updateCache(cacheKey, modifiedResponse, modifiedConfig);

            return modifiedResponse;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 构建URL
    buildUrl(config) {
        const { baseUrl, path, params } = config;
        let url = baseUrl;

        if (path) {
            url += path.startsWith('/') ? path : `/${path}`;
        }

        if (params) {
            const queryString = Object.entries(params)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');
            url += url.includes('?') ? `&${queryString}` : `?${queryString}`;
        }

        return url;
    }

    // 应用请求拦截器
    async applyRequestInterceptors(config) {
        let modifiedConfig = { ...config };

        for (const interceptor of this.interceptors.request) {
            modifiedConfig = await interceptor(modifiedConfig);
        }

        return modifiedConfig;
    }

    // 应用响应拦截器
    async applyResponseInterceptors(response) {
        let modifiedResponse = { ...response };

        for (const interceptor of this.interceptors.response) {
            modifiedResponse = await interceptor(modifiedResponse);
        }

        return modifiedResponse;
    }

    // 发送请求
    async sendRequest(url, config) {
        const { method, body, headers, timeout, retries, retryDelay, validateStatus } = config;

        for (let i = 0; i <= retries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    method,
                    headers,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!validateStatus(response.status)) {
                    throw new GiveawayError('请求失败', ErrorCodes.API_ERROR, {
                        status: response.status,
                        statusText: response.statusText
                    });
                }

                return {
                    status: response.status,
                    headers: response.headers,
                    data: await response.json()
                };
            } catch (error) {
                if (i === retries) {
                    throw error;
                }
                await this.delay(retryDelay);
            }
        }
    }

    // 检查缓存
    async checkCache(key, strategy) {
        if (strategy === CacheStrategy.NONE || strategy === CacheStrategy.NETWORK_ONLY) {
            return null;
        }

        const cached = await this.cacheManager.get(key);
        if (!cached) {
            return null;
        }

        if (strategy === CacheStrategy.CACHE_ONLY || strategy === CacheStrategy.CACHE_FIRST) {
            return cached;
        }

        return null;
    }

    // 更新缓存
    async updateCache(key, response, config) {
        const { cacheStrategy, cacheTTL } = config;

        if (cacheStrategy === CacheStrategy.NONE || 
            cacheStrategy === CacheStrategy.NETWORK_ONLY ||
            cacheStrategy === CacheStrategy.CACHE_ONLY) {
            return;
        }

        await this.cacheManager.set(key, response, CacheLevel.MEMORY, {
            maxAge: cacheTTL
        });
    }

    // 生成缓存键
    generateCacheKey(url, config) {
        const { method, body, headers } = config;
        return `${method}:${url}:${JSON.stringify(body)}:${JSON.stringify(headers)}`;
    }

    // GET请求
    async get(endpointName, options = {}) {
        return this.request(endpointName, {
            ...options,
            method: ApiMethod.GET
        });
    }

    // POST请求
    async post(endpointName, data, options = {}) {
        return this.request(endpointName, {
            ...options,
            method: ApiMethod.POST,
            body: data
        });
    }

    // PUT请求
    async put(endpointName, data, options = {}) {
        return this.request(endpointName, {
            ...options,
            method: ApiMethod.PUT,
            body: data
        });
    }

    // DELETE请求
    async delete(endpointName, options = {}) {
        return this.request(endpointName, {
            ...options,
            method: ApiMethod.DELETE
        });
    }

    // PATCH请求
    async patch(endpointName, data, options = {}) {
        return this.request(endpointName, {
            ...options,
            method: ApiMethod.PATCH,
            body: data
        });
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 确保已初始化
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}
