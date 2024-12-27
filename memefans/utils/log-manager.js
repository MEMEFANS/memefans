import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';

// 日志级别
export const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

// 日志类型
export const LogType = {
    SYSTEM: 'system',
    USER: 'user',
    NETWORK: 'network',
    TRANSACTION: 'transaction'
};

// 日志格式
export const LogFormat = {
    TEXT: 'text',
    JSON: 'json',
    CSV: 'csv'
};

// 日志存储
export const LogStorage = {
    MEMORY: 'memory',
    LOCAL: 'local',
    REMOTE: 'remote'
};

// 默认配置
const DEFAULT_CONFIG = {
    level: LogLevel.INFO,
    maxEntries: 1000,
    format: LogFormat.TEXT,
    storage: LogStorage.MEMORY,
    types: Object.values(LogType),
    useColors: true
};

export class LogManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logs = [];
        this.filters = new Set();
        this.subscribers = new Set();
        this.isInitialized = false;
        this.isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    }

    // 初始化
    async initialize() {
        try {
            if (this.isInitialized) return;

            // 初始化存储
            await this.initializeStorage();

            // 初始化样式
            if (!this.isNode && typeof document !== 'undefined') {
                this.initializeStyles();
            }

            this.isInitialized = true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 初始化存储
    async initializeStorage() {
        try {
            if (this.config.storage === LogStorage.LOCAL) {
                const stored = await chrome.storage.local.get('logs');
                this.logs = stored.logs || [];
            }
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 初始化样式
    initializeStyles() {
        if (this.config.useColors && !this.isNode && typeof document !== 'undefined') {
            const style = document.createElement('style');
            style.textContent = `
                .log-debug { color: #7f8c8d; }
                .log-info { color: #2ecc71; }
                .log-warn { color: #f1c40f; }
                .log-error { color: #e74c3c; }
            `;
            document.head.appendChild(style);
        }
    }

    // 添加日志
    async log(level, message, type = LogType.SYSTEM, data = {}) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                type,
                message,
                data
            };

            // 应用过滤器
            if (this.shouldFilter(logEntry)) {
                return;
            }

            // 添加到内存
            this.logs.push(logEntry);

            // 限制日志数量
            if (this.logs.length > this.config.maxEntries) {
                this.logs.shift();
            }

            // 保存到存储
            if (this.config.storage === LogStorage.LOCAL) {
                await chrome.storage.local.set({ logs: this.logs });
            }

            // 通知订阅者
            this.notifySubscribers(logEntry);

            // 控制台输出
            this.consoleOutput(logEntry);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 调试日志
    debug(message, type = LogType.SYSTEM, data = {}) {
        if (this.config.level === LogLevel.DEBUG) {
            return this.log(LogLevel.DEBUG, message, type, data);
        }
    }

    // 信息日志
    info(message, type = LogType.SYSTEM, data = {}) {
        if (this.config.level !== LogLevel.ERROR) {
            return this.log(LogLevel.INFO, message, type, data);
        }
    }

    // 警告日志
    warn(message, type = LogType.SYSTEM, data = {}) {
        if (this.config.level !== LogLevel.ERROR) {
            return this.log(LogLevel.WARN, message, type, data);
        }
    }

    // 错误日志
    error(message, type = LogType.SYSTEM, data = {}) {
        return this.log(LogLevel.ERROR, message, type, data);
    }

    // 添加过滤器
    addFilter(filter) {
        this.filters.add(filter);
    }

    // 移除过滤器
    removeFilter(filter) {
        this.filters.delete(filter);
    }

    // 检查是否应该过滤
    shouldFilter(logEntry) {
        for (const filter of this.filters) {
            if (filter(logEntry)) {
                return true;
            }
        }
        return false;
    }

    // 添加订阅者
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    // 通知订阅者
    notifySubscribers(logEntry) {
        for (const subscriber of this.subscribers) {
            try {
                subscriber(logEntry);
            } catch (error) {
                console.error('订阅者处理日志时出错:', error);
            }
        }
    }

    // 控制台输出
    consoleOutput(logEntry) {
        const { level, message, type, data } = logEntry;
        const prefix = `[${type.toUpperCase()}]`;

        if (this.isNode) {
            // Node.js环境
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(prefix, message, data);
                    break;
                case LogLevel.INFO:
                    console.info(prefix, message, data);
                    break;
                case LogLevel.WARN:
                    console.warn(prefix, message, data);
                    break;
                case LogLevel.ERROR:
                    console.error(prefix, message, data);
                    break;
            }
        } else if (this.config.useColors && typeof document !== 'undefined') {
            // 浏览器环境（带颜色）
            const style = `color: ${this.getColorForLevel(level)}`;
            console.log(`%c${prefix} ${message}`, style, data);
        } else {
            // 浏览器环境（无颜色）
            console.log(prefix, message, data);
        }
    }

    // 获取日志级别对应的颜色
    getColorForLevel(level) {
        switch (level) {
            case LogLevel.DEBUG:
                return '#7f8c8d';
            case LogLevel.INFO:
                return '#2ecc71';
            case LogLevel.WARN:
                return '#f1c40f';
            case LogLevel.ERROR:
                return '#e74c3c';
            default:
                return '#000000';
        }
    }

    // 清除日志
    async clear() {
        try {
            this.logs = [];
            if (this.config.storage === LogStorage.LOCAL) {
                await chrome.storage.local.remove('logs');
            }
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 导出日志
    export(format = LogFormat.TEXT) {
        try {
            switch (format) {
                case LogFormat.JSON:
                    return JSON.stringify(this.logs, null, 2);
                case LogFormat.CSV:
                    return this.exportToCsv();
                case LogFormat.TEXT:
                default:
                    return this.logs.map(log => 
                        `[${log.timestamp}] [${log.type}] ${log.level.toUpperCase()}: ${log.message}`
                    ).join('\n');
            }
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 导出为CSV格式
    exportToCsv() {
        const headers = ['timestamp', 'level', 'type', 'message', 'data'];
        const rows = this.logs.map(log => [
            log.timestamp,
            log.level,
            log.type,
            log.message,
            JSON.stringify(log.data)
        ]);
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // 获取统计信息
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {},
            byType: {}
        };

        for (const log of this.logs) {
            // 按级别统计
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            // 按类型统计
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
        }

        return stats;
    }

    // 搜索日志
    search(query, options = {}) {
        const {
            startTime,
            endTime,
            level,
            type,
            caseSensitive = false
        } = options;

        return this.logs.filter(log => {
            // 时间范围过滤
            if (startTime && new Date(log.timestamp) < new Date(startTime)) return false;
            if (endTime && new Date(log.timestamp) > new Date(endTime)) return false;

            // 级别过滤
            if (level && log.level !== level) return false;

            // 类型过滤
            if (type && log.type !== type) return false;

            // 内容搜索
            if (query) {
                const searchText = caseSensitive ? query : query.toLowerCase();
                const logText = caseSensitive ? 
                    `${log.message} ${JSON.stringify(log.data)}` :
                    `${log.message} ${JSON.stringify(log.data)}`.toLowerCase();
                return logText.includes(searchText);
            }

            return true;
        });
    }
}
