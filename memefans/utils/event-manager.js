import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';

// 事件类型
export const EventType = {
    WALLET_CONNECTED: 'WALLET_CONNECTED',
    WALLET_DISCONNECTED: 'WALLET_DISCONNECTED',
    TRANSACTION_STARTED: 'TRANSACTION_STARTED',
    TRANSACTION_SUCCESS: 'TRANSACTION_SUCCESS',
    TRANSACTION_ERROR: 'TRANSACTION_ERROR',
    GIVEAWAY_CREATED: 'GIVEAWAY_CREATED',
    GIVEAWAY_CLAIMED: 'GIVEAWAY_CLAIMED',
    VERIFICATION_STARTED: 'VERIFICATION_STARTED',
    VERIFICATION_COMPLETED: 'VERIFICATION_COMPLETED',
    VERIFICATION_FAILED: 'VERIFICATION_FAILED',
    BALANCE_UPDATED: 'BALANCE_UPDATED',
    CONTRACT_STATE_CHANGED: 'CONTRACT_STATE_CHANGED',
    UI_STATE_CHANGED: 'UI_STATE_CHANGED',
    ERROR_OCCURRED: 'ERROR_OCCURRED'
};

// 默认配置
const DEFAULT_CONFIG = {
    maxListeners: 10,
    maxQueueSize: 1000,
    retryAttempts: 3,
    retryDelay: 1000
};

export class EventManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.listeners = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
        this.isInitialized = false;
    }

    // 初始化
    async initialize() {
        try {
            if (this.isInitialized) return;

            // 初始化事件队列处理
            this.startQueueProcessing();

            this.isInitialized = true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 启动队列处理
    startQueueProcessing() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.processEventQueue();
    }

    // 处理事件队列
    async processEventQueue() {
        while (this.isProcessing) {
            if (this.eventQueue.length > 0) {
                const event = this.eventQueue.shift();
                await this.processEvent(event);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // 处理单个事件
    async processEvent(event) {
        try {
            const { type, data } = event;
            const listeners = this.listeners.get(type) || [];

            for (const listener of listeners) {
                try {
                    await listener(data);
                } catch (error) {
                    console.error(`事件监听器执行失败: ${error.message}`);
                }
            }
        } catch (error) {
            console.error(`事件处理失败: ${error.message}`);
        }
    }

    // 添加事件监听器
    on(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }

        const listeners = this.listeners.get(type);

        if (listeners.size >= this.config.maxListeners) {
            console.warn(`警告: 事件类型 ${type} 的监听器数量超过最大限制`);
        }

        listeners.add(listener);
        return () => this.off(type, listener);
    }

    // 移除事件监听器
    off(type, listener) {
        const listeners = this.listeners.get(type);
        if (listeners) {
            listeners.delete(listener);
        }
    }

    // 触发事件
    async emit(type, data = {}) {
        try {
            // 添加到事件队列
            this.eventQueue.push({ type, data });

            // 限制队列大小
            if (this.eventQueue.length > this.config.maxQueueSize) {
                this.eventQueue.shift();
                console.warn('事件队列已满，丢弃最早的事件');
            }

            return true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取事件监听器数量
    listenerCount(type) {
        const listeners = this.listeners.get(type);
        return listeners ? listeners.size : 0;
    }

    // 获取所有事件类型
    eventTypes() {
        return Array.from(this.listeners.keys());
    }

    // 清除所有监听器
    removeAllListeners(type) {
        if (type) {
            this.listeners.delete(type);
        } else {
            this.listeners.clear();
        }
    }

    // 停止事件处理
    stop() {
        this.isProcessing = false;
    }
}
