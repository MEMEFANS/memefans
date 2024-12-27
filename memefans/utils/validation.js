import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// 常量定义
export const VALIDATION_CONSTANTS = {
    MAX_GIVEAWAY_AMOUNT: 1000000 * LAMPORTS_PER_SOL, // 最大赠送总额
    MIN_GIVEAWAY_AMOUNT: 0.1 * LAMPORTS_PER_SOL,     // 最小赠送金额
    MAX_USERS: 1000,                                 // 最大用户数
    MIN_USERS: 1,                                    // 最小用户数
};

export class ValidationHelper {
    static validateGiveawayParams(amount, maxUsers) {
        const errors = [];

        // 验证金额
        if (amount <= 0) {
            errors.push('金额必须大于0');
        }
        if (amount < VALIDATION_CONSTANTS.MIN_GIVEAWAY_AMOUNT) {
            errors.push(`金额不能小于 ${VALIDATION_CONSTANTS.MIN_GIVEAWAY_AMOUNT / LAMPORTS_PER_SOL} SOL`);
        }

        // 验证用户数量
        if (maxUsers <= 0) {
            errors.push('用户数量必须大于0');
        }
        if (maxUsers > VALIDATION_CONSTANTS.MAX_USERS) {
            errors.push(`用户数量不能超过 ${VALIDATION_CONSTANTS.MAX_USERS}`);
        }
        if (maxUsers < VALIDATION_CONSTANTS.MIN_USERS) {
            errors.push(`用户数量不能小于 ${VALIDATION_CONSTANTS.MIN_USERS}`);
        }

        // 验证总金额
        const totalAmount = amount * maxUsers;
        if (totalAmount > VALIDATION_CONSTANTS.MAX_GIVEAWAY_AMOUNT) {
            errors.push(`总金额不能超过 ${VALIDATION_CONSTANTS.MAX_GIVEAWAY_AMOUNT / LAMPORTS_PER_SOL} SOL`);
        }

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }

        return true;
    }

    static validateTweetId(tweetId) {
        if (!tweetId || typeof tweetId !== 'string') {
            throw new Error('无效的推文ID');
        }
        // Twitter ID格式验证
        if (!/^\d+$/.test(tweetId)) {
            throw new Error('推文ID格式不正确');
        }
        return true;
    }

    static validateWallet(wallet) {
        if (!wallet) {
            throw new Error('钱包未连接');
        }
        if (!wallet.publicKey) {
            throw new Error('无法获取钱包公钥');
        }
        return true;
    }
}
