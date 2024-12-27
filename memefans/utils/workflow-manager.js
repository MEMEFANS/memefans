import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { LogManager, LogType } from './log-manager.js';
import { StateManager, StateType } from './state-manager.js';
import { EventManager } from './event-manager.js';

// 工作流状态
export const WorkflowStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PAUSED: 'paused'
};

// 任务类型
export const TaskType = {
    ACTION: 'action',
    CONDITION: 'condition',
    PARALLEL: 'parallel',
    SEQUENCE: 'sequence',
    RETRY: 'retry',
    TIMEOUT: 'timeout'
};

// 默认配置
const DEFAULT_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 30000,
    maxParallel: 5,
    maxQueueSize: 100
};

export class WorkflowManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.logManager = new LogManager(config);
        this.stateManager = new StateManager(config);
        this.eventManager = new EventManager(config);
        this.workflows = new Map();
        this.tasks = new Map();
        this.queue = [];
        this.running = new Set();
        this.initialized = false;
    }

    // 初始化
    async initialize() {
        try {
            if (this.initialized) return;

            await this.stateManager.initialize();
            await this.eventManager.initialize();

            // 恢复未完成的工作流
            await this.restoreWorkflows();

            this.initialized = true;
            this.logManager.info('工作流系统已初始化', LogType.SYSTEM);
        } catch (error) {
            this.logManager.error('工作流系统初始化失败', LogType.SYSTEM, { error });
            throw ErrorHandler.handleError(error);
        }
    }

    // 创建工作流
    async createWorkflow(name, tasks, options = {}) {
        try {
            await this.ensureInitialized();

            const workflow = {
                id: this.generateId(),
                name,
                tasks: this.validateTasks(tasks),
                status: WorkflowStatus.PENDING,
                currentTask: null,
                results: new Map(),
                errors: [],
                startTime: null,
                endTime: null,
                options: { ...this.config, ...options }
            };

            this.workflows.set(workflow.id, workflow);
            return workflow.id;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 启动工作流
    async startWorkflow(workflowId, input = {}) {
        try {
            const workflow = this.getWorkflow(workflowId);
            if (!workflow) {
                throw new GiveawayError('工作流不存在', ErrorCodes.WORKFLOW_ERROR);
            }

            if (workflow.status === WorkflowStatus.RUNNING) {
                throw new GiveawayError('工作流已在运行', ErrorCodes.WORKFLOW_ERROR);
            }

            workflow.status = WorkflowStatus.RUNNING;
            workflow.startTime = Date.now();
            workflow.input = input;

            await this.executeWorkflow(workflow);
            return workflow.id;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 暂停工作流
    async pauseWorkflow(workflowId) {
        try {
            const workflow = this.getWorkflow(workflowId);
            if (!workflow) {
                throw new GiveawayError('工作流不存在', ErrorCodes.WORKFLOW_ERROR);
            }

            if (workflow.status !== WorkflowStatus.RUNNING) {
                throw new GiveawayError('工作流未运行', ErrorCodes.WORKFLOW_ERROR);
            }

            workflow.status = WorkflowStatus.PAUSED;
            return true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 恢复工作流
    async resumeWorkflow(workflowId) {
        try {
            const workflow = this.getWorkflow(workflowId);
            if (!workflow) {
                throw new GiveawayError('工作流不存在', ErrorCodes.WORKFLOW_ERROR);
            }

            if (workflow.status !== WorkflowStatus.PAUSED) {
                throw new GiveawayError('工作流未暂停', ErrorCodes.WORKFLOW_ERROR);
            }

            workflow.status = WorkflowStatus.RUNNING;
            await this.executeWorkflow(workflow);
            return true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 取消工作流
    async cancelWorkflow(workflowId) {
        try {
            const workflow = this.getWorkflow(workflowId);
            if (!workflow) {
                throw new GiveawayError('工作流不存在', ErrorCodes.WORKFLOW_ERROR);
            }

            workflow.status = WorkflowStatus.CANCELLED;
            workflow.endTime = Date.now();
            return true;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取工作流状态
    getWorkflowStatus(workflowId) {
        try {
            const workflow = this.getWorkflow(workflowId);
            if (!workflow) {
                throw new GiveawayError('工作流不存在', ErrorCodes.WORKFLOW_ERROR);
            }

            return {
                id: workflow.id,
                name: workflow.name,
                status: workflow.status,
                currentTask: workflow.currentTask,
                progress: this.calculateProgress(workflow),
                startTime: workflow.startTime,
                endTime: workflow.endTime,
                errors: workflow.errors
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 执行工作流
    async executeWorkflow(workflow) {
        try {
            const tasks = workflow.tasks;
            for (const task of tasks) {
                if (workflow.status !== WorkflowStatus.RUNNING) {
                    break;
                }

                workflow.currentTask = task.id;
                const result = await this.executeTask(task, workflow);
                workflow.results.set(task.id, result);

                if (result.error) {
                    workflow.errors.push({
                        taskId: task.id,
                        error: result.error
                    });

                    if (!task.options?.continueOnError) {
                        workflow.status = WorkflowStatus.FAILED;
                        break;
                    }
                }
            }

            if (workflow.status === WorkflowStatus.RUNNING) {
                workflow.status = WorkflowStatus.COMPLETED;
            }

            workflow.endTime = Date.now();
            await this.saveWorkflowState(workflow);
        } catch (error) {
            workflow.status = WorkflowStatus.FAILED;
            workflow.errors.push({
                error: error.message
            });
            throw ErrorHandler.handleError(error);
        }
    }

    // 执行任务
    async executeTask(task, workflow) {
        try {
            const startTime = Date.now();
            let result = null;
            let error = null;

            switch (task.type) {
                case TaskType.ACTION:
                    result = await this.executeAction(task, workflow);
                    break;
                case TaskType.CONDITION:
                    result = await this.evaluateCondition(task, workflow);
                    break;
                case TaskType.PARALLEL:
                    result = await this.executeParallel(task, workflow);
                    break;
                case TaskType.SEQUENCE:
                    result = await this.executeSequence(task, workflow);
                    break;
                case TaskType.RETRY:
                    result = await this.executeWithRetry(task, workflow);
                    break;
                case TaskType.TIMEOUT:
                    result = await this.executeWithTimeout(task, workflow);
                    break;
                default:
                    throw new GiveawayError('未知的任务类型', ErrorCodes.WORKFLOW_ERROR);
            }

            return {
                taskId: task.id,
                startTime,
                endTime: Date.now(),
                result,
                error
            };
        } catch (error) {
            return {
                taskId: task.id,
                startTime,
                endTime: Date.now(),
                result: null,
                error: error.message
            };
        }
    }

    // 执行动作
    async executeAction(task, workflow) {
        const { action, input } = task;
        if (typeof action !== 'function') {
            throw new GiveawayError('无效的动作函数', ErrorCodes.WORKFLOW_ERROR);
        }

        const context = {
            workflow,
            task,
            input: { ...workflow.input, ...input }
        };

        return await action(context);
    }

    // 评估条件
    async evaluateCondition(task, workflow) {
        const { condition, input } = task;
        if (typeof condition !== 'function') {
            throw new GiveawayError('无效的条件函数', ErrorCodes.WORKFLOW_ERROR);
        }

        const context = {
            workflow,
            task,
            input: { ...workflow.input, ...input }
        };

        return await condition(context);
    }

    // 执行并行任务
    async executeParallel(task, workflow) {
        const { tasks } = task;
        const promises = tasks.map(t => this.executeTask(t, workflow));
        return await Promise.all(promises);
    }

    // 执行序列任务
    async executeSequence(task, workflow) {
        const { tasks } = task;
        const results = [];
        for (const t of tasks) {
            const result = await this.executeTask(t, workflow);
            results.push(result);
            if (result.error && !task.options?.continueOnError) {
                break;
            }
        }
        return results;
    }

    // 执行重试任务
    async executeWithRetry(task, workflow) {
        const { maxRetries = this.config.maxRetries, retryDelay = this.config.retryDelay } = task.options || {};
        let lastError = null;

        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await this.executeTask(task.task, workflow);
            } catch (error) {
                lastError = error;
                if (i < maxRetries) {
                    await this.delay(retryDelay);
                }
            }
        }

        throw lastError;
    }

    // 执行超时任务
    async executeWithTimeout(task, workflow) {
        const { timeout = this.config.timeout } = task.options || {};

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new GiveawayError('任务超时', ErrorCodes.WORKFLOW_ERROR));
            }, timeout);
        });

        return await Promise.race([
            this.executeTask(task.task, workflow),
            timeoutPromise
        ]);
    }

    // 验证任务
    validateTasks(tasks) {
        if (!Array.isArray(tasks)) {
            throw new GiveawayError('任务必须是数组', ErrorCodes.WORKFLOW_ERROR);
        }

        return tasks.map(task => ({
            id: task.id || this.generateId(),
            type: task.type,
            ...task
        }));
    }

    // 计算进度
    calculateProgress(workflow) {
        const total = workflow.tasks.length;
        const completed = workflow.results.size;
        return (completed / total) * 100;
    }

    // 保存工作流状态
    async saveWorkflowState(workflow) {
        await this.stateManager.setState(
            StateType.WORKFLOW,
            workflow.id,
            {
                status: workflow.status,
                results: Array.from(workflow.results.entries()),
                errors: workflow.errors,
                currentTask: workflow.currentTask,
                startTime: workflow.startTime,
                endTime: workflow.endTime
            }
        );
    }

    // 恢复工作流
    async restoreWorkflows() {
        const workflows = await this.stateManager.getState(StateType.WORKFLOW);
        if (workflows) {
            for (const [id, state] of Object.entries(workflows)) {
                const workflow = this.workflows.get(id);
                if (workflow) {
                    workflow.status = state.status;
                    workflow.results = new Map(state.results);
                    workflow.errors = state.errors;
                    workflow.currentTask = state.currentTask;
                    workflow.startTime = state.startTime;
                    workflow.endTime = state.endTime;
                }
            }
        }
    }

    // 获取工作流
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }

    // 生成ID
    generateId() {
        return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 确保已初始化
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}
