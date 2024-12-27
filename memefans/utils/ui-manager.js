import { ErrorHandler } from './error.js';

// UI 状态
const UIState = {
    HIDDEN: 'HIDDEN',
    LOADING: 'LOADING',
    READY: 'READY',
    ERROR: 'ERROR'
};

export class UIManager {
    constructor() {
        this.components = new Map();
        this.state = UIState.HIDDEN;
        this.errorMessage = null;
    }

    // 创建赠送按钮
    createGiveawayButton(tweet, giveaway) {
        try {
            const button = document.createElement('button');
            button.className = 'fans-giveaway-button';
            button.innerHTML = `
                <span class="icon">🎁</span>
                <span class="text">赠送 FANS</span>
            `;

            // 添加样式
            this.addStyles(`
                .fans-giveaway-button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border: none;
                    border-radius: 20px;
                    background: linear-gradient(45deg, #FF6B6B, #FF8E53);
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .fans-giveaway-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
                }

                .fans-giveaway-button .icon {
                    font-size: 18px;
                }
            `);

            return button;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 创建验证进度条
    createProgressBar(task) {
        try {
            const container = document.createElement('div');
            container.className = 'fans-progress-container';
            
            const progress = document.createElement('div');
            progress.className = 'fans-progress-bar';
            progress.style.width = `${this.calculateProgress(task)}%`;

            container.appendChild(progress);

            // 添加样式
            this.addStyles(`
                .fans-progress-container {
                    width: 100%;
                    height: 4px;
                    background: #E0E0E0;
                    border-radius: 2px;
                    overflow: hidden;
                    margin: 8px 0;
                }

                .fans-progress-bar {
                    height: 100%;
                    background: linear-gradient(45deg, #4CAF50, #8BC34A);
                    transition: width 0.3s ease;
                }
            `);

            return container;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 创建验证清单
    createChecklist(requirements) {
        try {
            const container = document.createElement('div');
            container.className = 'fans-checklist';

            requirements.actions.forEach(action => {
                const item = document.createElement('div');
                item.className = 'fans-checklist-item';
                item.innerHTML = `
                    <span class="icon">${this.getActionIcon(action.type)}</span>
                    <span class="text">${this.getActionText(action.type)}</span>
                    <span class="status pending">待验证</span>
                `;
                container.appendChild(item);
            });

            // 添加样式
            this.addStyles(`
                .fans-checklist {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    margin: 16px 0;
                }

                .fans-checklist-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px;
                    background: #F5F5F5;
                    border-radius: 8px;
                }

                .fans-checklist-item .icon {
                    font-size: 16px;
                }

                .fans-checklist-item .text {
                    flex: 1;
                    font-size: 14px;
                }

                .fans-checklist-item .status {
                    font-size: 12px;
                    font-weight: 600;
                }

                .fans-checklist-item .status.pending {
                    color: #FFA000;
                }

                .fans-checklist-item .status.completed {
                    color: #4CAF50;
                }

                .fans-checklist-item .status.failed {
                    color: #F44336;
                }
            `);

            return container;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 创建错误提示
    createErrorMessage(error) {
        try {
            const container = document.createElement('div');
            container.className = 'fans-error';
            container.innerHTML = `
                <span class="icon">⚠️</span>
                <span class="message">${error.message}</span>
            `;

            // 添加样式
            this.addStyles(`
                .fans-error {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px;
                    background: #FFEBEE;
                    border: 1px solid #FFCDD2;
                    border-radius: 8px;
                    color: #D32F2F;
                    margin: 8px 0;
                }

                .fans-error .icon {
                    font-size: 16px;
                }

                .fans-error .message {
                    font-size: 14px;
                }
            `);

            return container;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 更新验证状态
    updateVerificationStatus(taskId, action, status) {
        try {
            const item = document.querySelector(`[data-task="${taskId}"][data-action="${action}"]`);
            if (!item) return;

            const statusElement = item.querySelector('.status');
            if (!statusElement) return;

            statusElement.className = `status ${status.toLowerCase()}`;
            statusElement.textContent = this.getStatusText(status);
        } catch (error) {
            console.error('更新验证状态失败:', error);
        }
    }

    // 计算进度
    calculateProgress(task) {
        if (!task || !task.completedActions) return 0;
        const total = task.requirements.actions.length;
        const completed = task.completedActions.size;
        return (completed / total) * 100;
    }

    // 获取动作图标
    getActionIcon(type) {
        const icons = {
            LIKE: '❤️',
            RETWEET: '🔄',
            FOLLOW: '👥',
            COMMENT: '💬'
        };
        return icons[type] || '📝';
    }

    // 获取动作文本
    getActionText(type) {
        const texts = {
            LIKE: '点赞推文',
            RETWEET: '转发推文',
            FOLLOW: '关注作者',
            COMMENT: '评论推文'
        };
        return texts[type] || '未知动作';
    }

    // 获取状态文本
    getStatusText(status) {
        const texts = {
            PENDING: '待验证',
            VERIFIED: '已完成',
            FAILED: '验证失败'
        };
        return texts[status] || status;
    }

    // 添加样式
    addStyles(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    // 显示加载状态
    showLoading() {
        this.state = UIState.LOADING;
        this.updateUI();
    }

    // 显示错误状态
    showError(error) {
        this.state = UIState.ERROR;
        this.errorMessage = error.message;
        this.updateUI();
    }

    // 显示就绪状态
    showReady() {
        this.state = UIState.READY;
        this.errorMessage = null;
        this.updateUI();
    }

    // 更新 UI
    updateUI() {
        // 根据状态更新 UI
        switch (this.state) {
            case UIState.LOADING:
                this.showLoadingIndicator();
                break;
            case UIState.ERROR:
                this.showErrorMessage();
                break;
            case UIState.READY:
                this.showContent();
                break;
        }
    }

    // 显示加载指示器
    showLoadingIndicator() {
        // 实现加载动画
    }

    // 显示错误消息
    showErrorMessage() {
        if (this.errorMessage) {
            const errorElement = this.createErrorMessage({
                message: this.errorMessage
            });
            // 显示错误消息
        }
    }

    // 显示内容
    showContent() {
        // 显示主要内容
    }
}
