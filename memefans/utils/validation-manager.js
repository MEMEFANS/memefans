import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { PublicKey } from '@solana/web3.js';

// 验证规则类型
export const ValidationType = {
    REQUIRED: 'required',
    MIN: 'min',
    MAX: 'max',
    PATTERN: 'pattern',
    CUSTOM: 'custom'
};

// 预定义的验证规则
const VALIDATION_RULES = {
    // 钱包地址验证
    walletAddress: {
        type: ValidationType.CUSTOM,
        validate: (value) => {
            try {
                new PublicKey(value);
                return true;
            } catch {
                return false;
            }
        },
        message: '无效的钱包地址'
    },

    // 推文ID验证
    tweetId: {
        type: ValidationType.PATTERN,
        pattern: /^\d{1,19}$/,
        message: '无效的推文ID'
    },

    // 金额验证
    amount: {
        type: ValidationType.CUSTOM,
        validate: (value, config) => {
            const amount = Number(value);
            return !isNaN(amount) && 
                   amount >= config.contracts.giveaway.minAmount && 
                   amount <= config.contracts.giveaway.maxAmount;
        },
        message: '无效的金额'
    },

    // 用户数量验证
    userCount: {
        type: ValidationType.CUSTOM,
        validate: (value, config) => {
            const count = Number(value);
            return !isNaN(count) && 
                   count > 0 && 
                   count <= config.contracts.giveaway.maxUsers;
        },
        message: '无效的用户数量'
    },

    // 时间验证
    timestamp: {
        type: ValidationType.CUSTOM,
        validate: (value) => {
            const timestamp = Number(value);
            return !isNaN(timestamp) && timestamp > 0;
        },
        message: '无效的时间戳'
    },

    // URL验证
    url: {
        type: ValidationType.PATTERN,
        pattern: /^https?:\/\/.+/,
        message: '无效的URL'
    }
};

export class ValidationManager {
    constructor(config) {
        this.config = config;
        this.customRules = new Map();
    }

    // 添加自定义验证规则
    addRule(name, rule) {
        try {
            this.validateRule(rule);
            this.customRules.set(name, rule);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证规则格式
    validateRule(rule) {
        if (!rule.type || !Object.values(ValidationType).includes(rule.type)) {
            throw new GiveawayError('无效的验证规则类型', ErrorCodes.VALIDATION_ERROR);
        }

        if (rule.type === ValidationType.CUSTOM && typeof rule.validate !== 'function') {
            throw new GiveawayError('自定义验证规则必须包含验证函数', ErrorCodes.VALIDATION_ERROR);
        }

        if (rule.type === ValidationType.PATTERN && !(rule.pattern instanceof RegExp)) {
            throw new GiveawayError('模式验证规则必须包含正则表达式', ErrorCodes.VALIDATION_ERROR);
        }

        if (!rule.message) {
            throw new GiveawayError('验证规则必须包含错误消息', ErrorCodes.VALIDATION_ERROR);
        }
    }

    // 验证单个值
    validate(value, ruleName) {
        try {
            const rule = this.customRules.get(ruleName) || VALIDATION_RULES[ruleName];
            if (!rule) {
                throw new GiveawayError(`找不到验证规则: ${ruleName}`, ErrorCodes.VALIDATION_ERROR);
            }

            let isValid = true;
            let message = '';

            switch (rule.type) {
                case ValidationType.REQUIRED:
                    isValid = value !== null && value !== undefined && value !== '';
                    break;

                case ValidationType.MIN:
                    isValid = Number(value) >= rule.min;
                    break;

                case ValidationType.MAX:
                    isValid = Number(value) <= rule.max;
                    break;

                case ValidationType.PATTERN:
                    isValid = rule.pattern.test(value);
                    break;

                case ValidationType.CUSTOM:
                    isValid = rule.validate(value, this.config);
                    break;
            }

            if (!isValid) {
                message = typeof rule.message === 'function' 
                    ? rule.message(value)
                    : rule.message;
                throw new GiveawayError(message, ErrorCodes.VALIDATION_ERROR);
            }

            return true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证多个值
    validateAll(values, rules) {
        const errors = new Map();

        for (const [field, ruleName] of Object.entries(rules)) {
            try {
                this.validate(values[field], ruleName);
            } catch (error) {
                errors.set(field, error.message);
            }
        }

        if (errors.size > 0) {
            throw new GiveawayError('验证失败', ErrorCodes.VALIDATION_ERROR, {
                errors: Object.fromEntries(errors)
            });
        }

        return true;
    }

    // 验证钱包
    validateWallet(wallet) {
        try {
            if (!wallet) {
                throw new GiveawayError('钱包不能为空', ErrorCodes.VALIDATION_ERROR);
            }

            if (!wallet.publicKey) {
                throw new GiveawayError('钱包必须包含公钥', ErrorCodes.VALIDATION_ERROR);
            }

            if (typeof wallet.signTransaction !== 'function') {
                throw new GiveawayError('钱包必须支持签名交易', ErrorCodes.VALIDATION_ERROR);
            }

            return true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证赠送参数
    validateGiveawayParams(params) {
        try {
            const rules = {
                tweetId: 'tweetId',
                amountPerUser: 'amount',
                maxUsers: 'userCount'
            };

            if (params.startTime) {
                rules.startTime = 'timestamp';
            }

            if (params.endTime) {
                rules.endTime = 'timestamp';
            }

            return this.validateAll(params, rules);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证领取参数
    validateClaimParams(params) {
        try {
            const rules = {
                tweetId: 'tweetId'
            };

            if (params.proof) {
                rules.proof = {
                    type: ValidationType.CUSTOM,
                    validate: (value) => Buffer.isBuffer(value) && value.length === 64,
                    message: '无效的证明签名'
                };
            }

            return this.validateAll(params, rules);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证提现参数
    validateWithdrawParams(params) {
        try {
            const rules = {
                amount: 'amount'
            };

            return this.validateAll(params, rules);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证配置
    validateConfig(config) {
        try {
            const rules = {
                'contracts.giveaway.programId': 'walletAddress',
                'tokens.fans.mint': 'walletAddress',
                'api.baseUrl': 'url'
            };

            const flatConfig = this.flattenObject(config);
            return this.validateAll(flatConfig, rules);
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 展平对象（用于验证嵌套配置）
    flattenObject(obj, prefix = '') {
        const flattened = {};

        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(flattened, this.flattenObject(value, newKey));
            } else {
                flattened[newKey] = value;
            }
        }

        return flattened;
    }
}
