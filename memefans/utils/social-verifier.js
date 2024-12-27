import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { ValidationHelper } from './validation.js';

// 社交动作类型
export const SocialActionType = {
    LIKE: 'LIKE',
    RETWEET: 'RETWEET',
    FOLLOW: 'FOLLOW',
    COMMENT: 'COMMENT'
};

// 验证状态
export const VerificationState = {
    PENDING: 'PENDING',
    VERIFIED: 'VERIFIED',
    FAILED: 'FAILED'
};

export class SocialVerifier {
    constructor() {
        this.verificationQueue = new Map();
        this.observers = new Map();
        this.initializeObservers();
    }

    // 初始化观察器
    initializeObservers() {
        // 观察推文变化
        const tweetObserver = new MutationObserver((mutations) => {
            if (this.shouldProcessMutations(mutations)) {
                this.processNewTweets();
            }
        });

        // 观察互动按钮变化
        const actionObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.target.matches('[data-testid^="like"], [data-testid^="retweet"]')) {
                    this.handleActionChange(mutation.target);
                }
            });
        });

        this.observers.set('tweet', tweetObserver);
        this.observers.set('action', actionObserver);
    }

    // 开始观察
    startObserving() {
        const tweetObserver = this.observers.get('tweet');
        const actionObserver = this.observers.get('action');

        // 观察推文列表变化
        tweetObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // 观察互动按钮变化
        actionObserver.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['aria-label', 'class']
        });
    }

    // 停止观察
    stopObserving() {
        this.observers.forEach(observer => observer.disconnect());
    }

    // 处理新推文
    async processNewTweets() {
        const tweets = this.findTweets();
        for (const tweet of tweets) {
            await this.processSingleTweet(tweet);
        }
    }

    // 处理单个推文
    async processSingleTweet(tweet) {
        try {
            const tweetUrl = this.findTweetUrl(tweet);
            if (!tweetUrl) return;

            const tweetId = this.getTweetIdFromUrl(tweetUrl);
            if (!tweetId) return;

            // 检查是否需要验证
            const verification = await this.getVerificationRequirements(tweetId);
            if (!verification) return;

            // 添加验证UI
            this.addVerificationUI(tweet, verification);

            // 开始验证
            await this.startVerification(tweetId, verification);
        } catch (error) {
            console.error('处理推文时出错:', error);
        }
    }

    // 获取验证要求
    async getVerificationRequirements(tweetId) {
        try {
            const result = await chrome.storage.local.get(['verifications']);
            const verifications = result.verifications || {};
            return verifications[tweetId];
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 开始验证
    async startVerification(tweetId, requirements) {
        try {
            // 验证参数
            ValidationHelper.validateTweetId(tweetId);
            this.validateRequirements(requirements);

            // 创建验证任务
            const verificationTask = {
                id: this.generateVerificationId(),
                tweetId,
                requirements,
                state: VerificationState.PENDING,
                completedActions: new Set(),
                startTime: Date.now()
            };

            // 添加到队列
            this.verificationQueue.set(verificationTask.id, verificationTask);

            // 开始验证各个动作
            for (const action of requirements.actions) {
                await this.verifyAction(verificationTask.id, action);
            }

            return verificationTask;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证单个动作
    async verifyAction(taskId, action) {
        const task = this.verificationQueue.get(taskId);
        if (!task) return;

        try {
            switch (action.type) {
                case SocialActionType.LIKE:
                    await this.verifyLike(task.tweetId);
                    break;
                case SocialActionType.RETWEET:
                    await this.verifyRetweet(task.tweetId);
                    break;
                case SocialActionType.FOLLOW:
                    await this.verifyFollow(action.userId);
                    break;
                case SocialActionType.COMMENT:
                    await this.verifyComment(task.tweetId);
                    break;
            }

            // 标记动作完成
            task.completedActions.add(action.type);

            // 检查是否所有动作都完成
            if (this.isVerificationComplete(task)) {
                await this.completeVerification(taskId);
            }
        } catch (error) {
            await this.handleVerificationError(taskId, action, error);
        }
    }

    // 验证点赞
    async verifyLike(tweetId) {
        const likeButton = document.querySelector(`[data-testid="like"][data-tweet-id="${tweetId}"]`);
        if (!likeButton) {
            throw new GiveawayError('找不到点赞按钮', ErrorCodes.VERIFICATION_ERROR);
        }

        const isLiked = likeButton.getAttribute('aria-label').includes('已点赞');
        if (!isLiked) {
            throw new GiveawayError('尚未点赞', ErrorCodes.VERIFICATION_ERROR);
        }
    }

    // 验证转发
    async verifyRetweet(tweetId) {
        const retweetButton = document.querySelector(`[data-testid="retweet"][data-tweet-id="${tweetId}"]`);
        if (!retweetButton) {
            throw new GiveawayError('找不到转发按钮', ErrorCodes.VERIFICATION_ERROR);
        }

        const isRetweeted = retweetButton.getAttribute('aria-label').includes('已转发');
        if (!isRetweeted) {
            throw new GiveawayError('尚未转发', ErrorCodes.VERIFICATION_ERROR);
        }
    }

    // 验证关注
    async verifyFollow(userId) {
        const followButton = document.querySelector(`[data-testid="follow"][data-user-id="${userId}"]`);
        if (!followButton) {
            throw new GiveawayError('找不到关注按钮', ErrorCodes.VERIFICATION_ERROR);
        }

        const isFollowing = followButton.getAttribute('aria-label').includes('正在关注');
        if (!isFollowing) {
            throw new GiveawayError('尚未关注', ErrorCodes.VERIFICATION_ERROR);
        }
    }

    // 验证评论
    async verifyComment(tweetId) {
        // 这里需要实现评论验证逻辑
        throw new Error('Not implemented');
    }

    // 完成验证
    async completeVerification(taskId) {
        const task = this.verificationQueue.get(taskId);
        if (!task) return;

        try {
            task.state = VerificationState.VERIFIED;
            task.completedAt = Date.now();

            // 触发验证完成事件
            await this.onVerificationComplete(task);

            // 从队列中移除
            this.verificationQueue.delete(taskId);

            return task;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 处理验证错误
    async handleVerificationError(taskId, action, error) {
        const task = this.verificationQueue.get(taskId);
        if (!task) return;

        try {
            // 记录错误
            if (!task.errors) task.errors = [];
            task.errors.push({
                action: action.type,
                error: error.message,
                timestamp: Date.now()
            });

            // 如果错误次数超过限制，标记为失败
            if (task.errors.length >= 3) {
                task.state = VerificationState.FAILED;
                await this.onVerificationFailed(task);
                this.verificationQueue.delete(taskId);
            }

            return task;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 验证要求是否有效
    validateRequirements(requirements) {
        if (!requirements || !requirements.actions || !Array.isArray(requirements.actions)) {
            throw new GiveawayError('无效的验证要求', ErrorCodes.VALIDATION_ERROR);
        }

        const validTypes = Object.values(SocialActionType);
        for (const action of requirements.actions) {
            if (!validTypes.includes(action.type)) {
                throw new GiveawayError(`无效的动作类型: ${action.type}`, ErrorCodes.VALIDATION_ERROR);
            }
        }
    }

    // 检查验证是否完成
    isVerificationComplete(task) {
        const requiredActions = new Set(task.requirements.actions.map(a => a.type));
        return Array.from(requiredActions).every(action => task.completedActions.has(action));
    }

    // 生成验证ID
    generateVerificationId() {
        return `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 验证完成回调
    async onVerificationComplete(task) {
        // 这里实现验证完成后的逻辑
        console.log('验证完成:', task);
    }

    // 验证失败回调
    async onVerificationFailed(task) {
        // 这里实现验证失败后的逻辑
        console.log('验证失败:', task);
    }

    // 清理过期验证
    async cleanupExpiredVerifications() {
        const now = Date.now();
        const expiryTime = 30 * 60 * 1000; // 30 minutes

        for (const [id, task] of this.verificationQueue) {
            if (now - task.startTime > expiryTime) {
                await this.handleVerificationError(id, { type: 'TIMEOUT' }, new Error('验证超时'));
            }
        }
    }
}
