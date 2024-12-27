import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { ValidationHelper } from './validation.js';

// 余额状态
const BalanceState = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    FAILED: 'FAILED'
};

export class BalanceManager {
    constructor() {
        this.pendingClaims = new Map();
        this.confirmedClaims = new Map();
    }

    // 获取用户余额
    async getUserBalance() {
        try {
            const result = await chrome.storage.local.get([
                'pendingAmount',
                'totalAmount',
                'claims',
                'withdrawHistory'
            ]);

            return {
                success: true,
                data: {
                    pendingAmount: result.pendingAmount || 0,
                    totalAmount: result.totalAmount || 0,
                    claims: result.claims || [],
                    withdrawHistory: result.withdrawHistory || []
                }
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 添加新的代币领取记录
    async addClaim(amount, tweetId, tokenInfo) {
        try {
            // 验证参数
            ValidationHelper.validateAmount(amount);
            ValidationHelper.validateTweetId(tweetId);
            ValidationHelper.validateTokenInfo(tokenInfo);

            console.log('添加新的代币领取记录...');

            // 获取当前余额
            const result = await chrome.storage.local.get([
                'pendingAmount',
                'totalAmount',
                'claims'
            ]);

            const pendingAmount = (result.pendingAmount || 0) + amount;
            const totalAmount = (result.totalAmount || 0) + amount;
            const claims = result.claims || [];

            // 创建新的领取记录
            const claim = {
                id: this.generateClaimId(),
                amount,
                tweetId,
                timestamp: Date.now(),
                tokenInfo,
                status: BalanceState.PENDING,
                retryCount: 0
            };

            // 添加到待处理列表
            this.pendingClaims.set(claim.id, claim);
            claims.push(claim);

            // 更新存储
            await chrome.storage.local.set({
                pendingAmount,
                totalAmount,
                claims
            });

            console.log('领取记录已更新:', {
                pendingAmount,
                totalAmount,
                claimsCount: claims.length
            });

            return {
                success: true,
                data: {
                    claim,
                    pendingAmount,
                    totalAmount
                }
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 确认领取
    async confirmClaim(claimId) {
        try {
            const claim = this.pendingClaims.get(claimId);
            if (!claim) {
                throw new GiveawayError('找不到领取记录', ErrorCodes.VALIDATION_ERROR);
            }

            // 更新状态
            claim.status = BalanceState.CONFIRMED;
            claim.confirmedAt = Date.now();

            // 移动到已确认列表
            this.confirmedClaims.set(claimId, claim);
            this.pendingClaims.delete(claimId);

            // 更新存储
            await this.updateStorage();

            return {
                success: true,
                data: claim
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 标记领取失败
    async markClaimFailed(claimId, error) {
        try {
            const claim = this.pendingClaims.get(claimId);
            if (!claim) {
                throw new GiveawayError('找不到领取记录', ErrorCodes.VALIDATION_ERROR);
            }

            // 更新状态
            claim.status = BalanceState.FAILED;
            claim.error = error;
            claim.failedAt = Date.now();

            // 更新重试次数
            claim.retryCount += 1;

            // 如果还可以重试，保留在待处理列表
            if (claim.retryCount < 3) {
                this.pendingClaims.set(claimId, claim);
            } else {
                this.pendingClaims.delete(claimId);
            }

            // 更新存储
            await this.updateStorage();

            return {
                success: true,
                data: claim
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 生成唯一的领取ID
    generateClaimId() {
        return `claim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 更新存储
    async updateStorage() {
        try {
            const claims = Array.from(this.pendingClaims.values())
                .concat(Array.from(this.confirmedClaims.values()));

            const pendingAmount = Array.from(this.pendingClaims.values())
                .reduce((sum, claim) => sum + claim.amount, 0);

            const totalAmount = Array.from(this.confirmedClaims.values())
                .reduce((sum, claim) => sum + claim.amount, 0);

            await chrome.storage.local.set({
                claims,
                pendingAmount,
                totalAmount
            });
        } catch (error) {
            throw new GiveawayError('更新存储失败', ErrorCodes.STORAGE_ERROR);
        }
    }

    // 清除过期的领取记录
    async cleanupExpiredClaims() {
        const now = Date.now();
        const expiryTime = 24 * 60 * 60 * 1000; // 24 hours

        for (const [id, claim] of this.pendingClaims) {
            if (now - claim.timestamp > expiryTime) {
                this.pendingClaims.delete(id);
            }
        }

        await this.updateStorage();
    }
}
