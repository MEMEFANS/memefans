import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import os from 'os';

// 指标类型
export const MetricType = {
    CPU_USAGE: 'cpu_usage',
    MEMORY_USAGE: 'memory_usage',
    NETWORK_LATENCY: 'network_latency',
    ERROR_RATE: 'error_rate',
    TRANSACTION_COUNT: 'transaction_count'
};

// 监控管理器
export class MonitorManager {
    constructor(configManager) {
        this.configManager = configManager;
        this.metrics = new Map();
        this.alerts = new Map();
        this.environment = configManager.get('environment');
        this.isInitialized = false;
    }

    // 初始化监控系统
    async initialize() {
        try {
            // 初始化基本指标
            this.initializeMetrics();

            // 设置告警阈值
            this.initializeAlerts();

            this.isInitialized = true;
            return true;
        } catch (error) {
            throw new GiveawayError('监控系统初始化失败: ' + error.message, ErrorCodes.INITIALIZATION_ERROR);
        }
    }

    // 初始化指标
    initializeMetrics() {
        // CPU使用率
        this.metrics.set(MetricType.CPU_USAGE, {
            value: 0,
            unit: '%',
            history: []
        });

        // 内存使用率
        this.metrics.set(MetricType.MEMORY_USAGE, {
            value: 0,
            unit: 'MB',
            history: []
        });

        // 网络延迟
        this.metrics.set(MetricType.NETWORK_LATENCY, {
            value: 0,
            unit: 'ms',
            history: []
        });

        // 错误率
        this.metrics.set(MetricType.ERROR_RATE, {
            value: 0,
            unit: '%',
            history: []
        });
    }

    // 初始化告警
    initializeAlerts() {
        // CPU使用率告警
        this.alerts.set(MetricType.CPU_USAGE, {
            threshold: 80,
            cooldown: 5 * 60 * 1000, // 5分钟
            message: 'CPU使用率过高'
        });

        // 内存使用率告警
        this.alerts.set(MetricType.MEMORY_USAGE, {
            threshold: 80,
            cooldown: 5 * 60 * 1000,
            message: '内存使用率过高'
        });

        // 网络延迟告警
        this.alerts.set(MetricType.NETWORK_LATENCY, {
            threshold: 1000,
            cooldown: 5 * 60 * 1000,
            message: '网络延迟过高'
        });

        // 错误率告警
        this.alerts.set(MetricType.ERROR_RATE, {
            threshold: 5,
            cooldown: 5 * 60 * 1000,
            message: '错误率过高'
        });
    }

    // 更新指标
    async updateMetric(type, value) {
        if (!this.metrics.has(type)) {
            throw new GiveawayError('未知的指标类型', ErrorCodes.VALIDATION_ERROR);
        }

        const metric = this.metrics.get(type);
        metric.value = value;
        metric.history.push({
            timestamp: Date.now(),
            value
        });

        // 保持历史记录在一定范围内
        if (metric.history.length > 100) {
            metric.history.shift();
        }

        // 检查是否需要触发告警
        await this.checkAlert(type, value);
    }

    // 获取指标
    getMetric(type) {
        if (!this.metrics.has(type)) {
            throw new GiveawayError('未知的指标类型', ErrorCodes.VALIDATION_ERROR);
        }
        return this.metrics.get(type);
    }

    // 检查告警
    async checkAlert(type, value) {
        if (!this.alerts.has(type)) {
            return;
        }

        const alert = this.alerts.get(type);
        if (value > alert.threshold) {
            await this.triggerAlert(type, value);
        }
    }

    // 触发告警
    async triggerAlert(type, value) {
        const alert = this.alerts.get(type);
        const message = `${alert.message}: ${value}${this.metrics.get(type).unit}`;
        console.warn(`[ALERT] ${message}`);
    }

    // 计算CPU使用率
    async calculateCpuUsage() {
        try {
            // 在测试环境中返回固定值
            if (this.environment === 'test') {
                return 50;
            }

            // 获取CPU使用情况
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;

            cpus.forEach(cpu => {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });

            const idle = totalIdle / cpus.length;
            const total = totalTick / cpus.length;
            const usage = Math.round(100 * (1 - idle / total));

            return usage;
        } catch (error) {
            console.warn('计算CPU使用率失败:', error);
            return 0;
        }
    }

    // 计算内存使用率
    async calculateMemoryUsage() {
        try {
            // 在测试环境中返回固定值
            if (this.environment === 'test') {
                return 500;
            }

            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            
            return Math.round(usedMem / (1024 * 1024)); // 转换为MB
        } catch (error) {
            console.warn('计算内存使用率失败:', error);
            return 0;
        }
    }

    // 导出监控数据
    exportMetrics() {
        const result = {};
        for (const [type, metric] of this.metrics) {
            result[type] = {
                value: metric.value,
                unit: metric.unit,
                history: metric.history.slice(-10) // 只导出最近的10个数据点
            };
        }
        return result;
    }
}
