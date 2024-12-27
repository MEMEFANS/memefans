import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';

export class TwitterAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.twitter.com/2';
        this.cache = new Map();
    }

    // 获取推文信息
    async getTweet(tweetId) {
        try {
            const cacheKey = `tweet_${tweetId}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const response = await fetch(`${this.baseUrl}/tweets/${tweetId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new GiveawayError('获取推文失败', ErrorCodes.API_ERROR);
            }

            const data = await response.json();
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取用户信息
    async getUser(userId) {
        try {
            const cacheKey = `user_${userId}`;
            if (this.cache.has(cacheKey)) {
                return this.cache.get(cacheKey);
            }

            const response = await fetch(`${this.baseUrl}/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new GiveawayError('获取用户信息失败', ErrorCodes.API_ERROR);
            }

            const data = await response.json();
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 检查是否点赞
    async checkLike(userId, tweetId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/users/${userId}/likes/${tweetId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.ok;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 检查是否转发
    async checkRetweet(userId, tweetId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/users/${userId}/retweets/${tweetId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.ok;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 检查是否关注
    async checkFollow(sourceUserId, targetUserId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/users/${sourceUserId}/following/${targetUserId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.ok;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取用户的评论
    async getUserComments(userId, tweetId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/tweets/search/recent?query=conversation_id:${tweetId} from:${userId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new GiveawayError('获取评论失败', ErrorCodes.API_ERROR);
            }

            const data = await response.json();
            return data.data || [];
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
    }

    // 获取缓存大小
    getCacheSize() {
        return this.cache.size;
    }

    // 移除过期缓存
    cleanupCache() {
        const now = Date.now();
        const expiryTime = 5 * 60 * 1000; // 5 minutes

        for (const [key, value] of this.cache) {
            if (now - value.timestamp > expiryTime) {
                this.cache.delete(key);
            }
        }
    }
}
