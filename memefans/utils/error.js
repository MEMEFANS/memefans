// 自定义错误类
export class GiveawayError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'GiveawayError';
        this.code = code;
    }
}

// 错误代码
export const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TRANSACTION_ERROR: 'TRANSACTION_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    WALLET_ERROR: 'WALLET_ERROR',
    CONTRACT_ERROR: 'CONTRACT_ERROR',
    CONFIG_ERROR: 'CONFIG_ERROR',
    INITIALIZATION_ERROR: 'INITIALIZATION_ERROR'
};

// 错误处理工具
export class ErrorHandler {
    static handleError(error) {
        // 如果错误是字符串，包装成Error对象
        if (typeof error === 'string') {
            error = new Error(error);
        }
        
        // 如果错误是对象但不是Error实例，包装成Error对象
        if (error && typeof error === 'object' && !(error instanceof Error)) {
            error = new Error(JSON.stringify(error));
        }

        // 确保error是Error实例
        if (!(error instanceof Error)) {
            error = new Error('Unknown error occurred');
        }

        // 处理GiveawayError
        if (error instanceof GiveawayError) {
            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }

        // 根据错误消息分类处理
        const message = error.message.toLowerCase();

        // 处理钱包错误
        if (message.includes('wallet')) {
            return {
                success: false,
                error: '钱包操作失败: ' + error.message,
                code: ErrorCodes.WALLET_ERROR
            };
        }

        // 处理网络错误
        if (message.includes('network') || message.includes('connection')) {
            return {
                success: false,
                error: '网络连接失败: ' + error.message,
                code: ErrorCodes.NETWORK_ERROR
            };
        }

        // 处理交易错误
        if (message.includes('transaction')) {
            return {
                success: false,
                error: '交易失败: ' + error.message,
                code: ErrorCodes.TRANSACTION_ERROR
            };
        }

        // 处理配置错误
        if (message.includes('config')) {
            return {
                success: false,
                error: '配置错误: ' + error.message,
                code: ErrorCodes.CONFIG_ERROR
            };
        }

        // 处理初始化错误
        if (message.includes('initialize') || message.includes('init')) {
            return {
                success: false,
                error: '初始化失败: ' + error.message,
                code: ErrorCodes.INITIALIZATION_ERROR
            };
        }

        // 处理合约错误
        if (error.message.includes('program') || error.message.includes('instruction')) {
            return {
                success: false,
                error: '合约执行失败: ' + error.message,
                code: ErrorCodes.CONTRACT_ERROR
            };
        }

        // 默认错误处理
        return {
            success: false,
            error: error.message,
            code: ErrorCodes.VALIDATION_ERROR
        };
    }

    static async wrapAsync(promise) {
        try {
            const result = await promise;
            return {
                success: true,
                data: result
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    static isRetryableError(error) {
        const retryableCodes = [
            ErrorCodes.NETWORK_ERROR,
            ErrorCodes.TRANSACTION_ERROR
        ];
        return retryableCodes.includes(error.code);
    }
}
