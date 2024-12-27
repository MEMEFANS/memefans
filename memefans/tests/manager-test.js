import { ConfigManager } from '../utils/config-manager.js';
import { EventManager } from '../utils/event-manager.js';
import { LogManager, LogType } from '../utils/log-manager.js';
import { MonitorManager, MetricType } from '../utils/monitor-manager.js';
import { CryptoManager } from '../utils/crypto-manager.js';
import { SecurityManager, SecurityLevel } from '../utils/security-manager.js';
import { CacheManager, CacheStrategy } from '../utils/cache-manager.js';
import { StateManager, StateType } from '../utils/state-manager.js';
import { WorkflowManager, TaskType } from '../utils/workflow-manager.js';
import { ApiManager, ApiMethod } from '../utils/api-manager.js';
import { ErrorHandler, GiveawayError, ErrorCodes } from '../utils/error.js';
import { TEST_CONFIG, CURRENT_CONTRACT_CONFIG } from '../config.js';

// 设置测试环境
process.env.NODE_ENV = 'test';

// Mock fetch API
global.fetch = async (url, options) => {
    // 模拟API响应
    if (url.includes('/users')) {
        return {
            status: 200,
            headers: new Map(),
            json: async () => ({ users: [{ id: 1, name: 'John' }] })
        };
    }
    throw new Error('未知的API端点');
};

// Mock chrome.storage API
global.chrome = {
    storage: {
        local: {
            get: async () => ({}),
            set: async () => {},
            remove: async () => {}
        }
    }
};

// Mock crypto functions
const mockCrypto = {
    generateKey: async () => ({}),
    encrypt: async (iv, key, data) => new Uint8Array([1, 2, 3]),
    decrypt: async (iv, key, data) => new TextEncoder().encode(JSON.stringify({ test: 'data' })),
    digest: async () => new Uint8Array([1, 2, 3]),
    sign: async () => new Uint8Array([1, 2, 3]),
    verify: async () => true
};

// Mock TextEncoder and TextDecoder if not available
if (typeof TextEncoder === 'undefined') {
    global.TextEncoder = class {
        encode(str) {
            return Buffer.from(str);
        }
    };
}

if (typeof TextDecoder === 'undefined') {
    global.TextDecoder = class {
        decode(arr) {
            return Buffer.from(arr).toString();
        }
    };
}

// 测试配置
const config = {
    environment: 'test',
    network: 'devnet',
    rpc: {
        mainnet: 'https://api.mainnet-beta.solana.com',
        testnet: 'https://api.testnet.solana.com',
        devnet: 'https://api.devnet.solana.com',
        localnet: 'http://localhost:8899'
    },
    websocket: {
        mainnet: 'wss://api.mainnet-beta.solana.com',
        testnet: 'wss://api.testnet.solana.com',
        devnet: 'wss://api.devnet.solana.com',
        localnet: 'ws://localhost:8900'
    },
    commitment: 'confirmed',
    contracts: {
        giveaway: {
            programId: TEST_CONFIG.MOCK_PROGRAM_ID,
            address: TEST_CONFIG.MOCK_GIVEAWAY_ADDRESS,
            minAmount: 1,
            maxAmount: 1000000,
            maxUsers: 1000,
            feeBasisPoints: 100,
            timeoutMinutes: 30
        }
    },
    tokens: {
        fans: {
            mint: TEST_CONFIG.MOCK_TOKEN_MINT,
            decimals: 6,
            symbol: 'FANS',
            name: 'FANS Token'
        }
    },
    api: {
        baseUrl: 'http://localhost:3000',
        endpoints: {
            claim: '/api/claim',
            verify: '/api/verify-interaction',
            withdraw: '/api/withdraw'
        }
    },
    security: {
        level: SecurityLevel.HIGH
    },
    mockCrypto
};

// 初始化所有管理器
async function initializeManagers() {
    try {
        console.log('初始化管理器...');

        const configManager = new ConfigManager();
        await configManager.initialize(config);
        console.log('配置管理器初始化完成');

        const eventManager = new EventManager(configManager);
        await eventManager.initialize();
        console.log('事件管理器初始化完成');

        const logManager = new LogManager(configManager);
        await logManager.initialize();
        console.log('日志管理器初始化完成');

        const monitorManager = new MonitorManager(configManager);
        await monitorManager.initialize();
        console.log('监控管理器初始化完成');

        const cryptoManager = new CryptoManager(configManager);
        await cryptoManager.initialize();
        console.log('加密管理器初始化完成');

        const securityManager = new SecurityManager(configManager);
        await securityManager.initialize();
        console.log('安全管理器初始化完成');

        const cacheManager = new CacheManager(configManager);
        await cacheManager.initialize();
        console.log('缓存管理器初始化完成');

        const stateManager = new StateManager(configManager);
        await stateManager.initialize();
        console.log('状态管理器初始化完成');

        const workflowManager = new WorkflowManager(configManager);
        await workflowManager.initialize();
        console.log('工作流管理器初始化完成');

        const apiManager = new ApiManager(configManager);
        await apiManager.initialize();
        console.log('API管理器初始化完成');

        // 运行各个管理器的测试
        await testConfigManager(configManager);
        await testEventManager(eventManager);
        await testLogManager(logManager);
        await testMonitorManager(monitorManager);
        await testCryptoManager(cryptoManager);
        await testSecurityManager(securityManager);
        await testCacheManager(cacheManager);
        await testStateManager(stateManager);
        await testWorkflowManager(workflowManager);
        await testApiManager(apiManager);

        console.log('所有测试完成');
    } catch (error) {
        const result = ErrorHandler.handleError(error);
        console.error('测试过程中发生错误:', result);
        process.exit(1);
    }
}

// 测试配置管理器
async function testConfigManager(configManager) {
    console.log('\n开始测试配置管理器...');
    try {
        const programId = configManager.get('contracts.giveaway.programId');
        console.log('获取到程序ID:', programId);
        
        if (!programId) {
            throw new GiveawayError('缺少合约程序ID', ErrorCodes.CONTRACT_ERROR);
        }

        const network = configManager.getNetwork();
        console.log('当前网络:', network);

        const rpcUrl = configManager.getRpcUrl();
        console.log('RPC URL:', rpcUrl);

        console.log('配置管理器测试通过');
    } catch (error) {
        throw error;
    }
}

// 测试事件管理器
async function testEventManager(eventManager) {
    console.log('\n测试事件管理器...');

    // 添加事件监听器
    const unsubscribe = eventManager.on('userAction', (data) => {
        console.log('收到用户动作事件:', data);
    });

    // 触发事件
    await eventManager.emit('userAction', { type: 'click', target: 'button' });

    // 移除监听器
    unsubscribe();
}

// 测试日志管理器
async function testLogManager(logManager) {
    console.log('\n测试日志管理器...');

    // 记录不同级别的日志
    logManager.debug('这是一条调试日志', LogType.SYSTEM);
    logManager.info('这是一条信息日志', LogType.USER);
    logManager.warn('这是一条警告日志', LogType.NETWORK);
    logManager.error('这是一条错误日志', LogType.TRANSACTION);

    // 导出日志
    const logs = logManager.export('text');
    console.log('导出的日志:', logs);
}

// 测试监控管理器
async function testMonitorManager(monitorManager) {
    console.log('\n测试监控管理器...');
    try {
        // 测试CPU使用率计算
        const cpuUsage = await monitorManager.calculateCpuUsage();
        console.log('CPU使用率:', cpuUsage, '%');

        // 测试内存使用率计算
        const memoryUsage = await monitorManager.calculateMemoryUsage();
        console.log('内存使用率:', memoryUsage, 'MB');

        // 更新一些指标
        await monitorManager.updateMetric(MetricType.CPU_USAGE, cpuUsage);
        await monitorManager.updateMetric(MetricType.MEMORY_USAGE, memoryUsage);
        await monitorManager.updateMetric(MetricType.ERROR_RATE, 2.5);

        // 导出监控数据
        const metrics = monitorManager.exportMetrics();
        console.log('监控指标:', metrics);

        console.log('监控管理器测试通过');
    } catch (error) {
        throw error;
    }
}

// 测试加密管理器
async function testCryptoManager(cryptoManager) {
    console.log('\n测试加密管理器...');

    // 测试加密和解密
    const data = { secret: 'sensitive data' };
    const encrypted = await cryptoManager.encrypt(data, 'password123');
    console.log('加密数据:', encrypted);

    const decrypted = await cryptoManager.decrypt(encrypted, 'password123');
    console.log('解密数据:', decrypted);

    // 测试哈希
    const hash = await cryptoManager.hash(data);
    console.log('数据哈希:', hash);
}

// 测试安全管理器
async function testSecurityManager(securityManager) {
    console.log('\n测试安全管理器...');

    // 测试会话管理
    const session = await securityManager.createSession('user123');
    console.log('创建的会话:', session);

    const isValid = securityManager.validateSession(session.id);
    console.log('会话是否有效:', isValid);

    // 测试密码验证
    const isPasswordValid = securityManager.validatePassword('StrongPass123!');
    console.log('密码是否有效:', isPasswordValid);
}

// 测试缓存管理器
async function testCacheManager(cacheManager) {
    console.log('\n测试缓存管理器...');

    // 测试缓存操作
    await cacheManager.set('user', { id: 1, name: 'John' });
    const user = await cacheManager.get('user');
    console.log('缓存的用户数据:', user);

    // 测试缓存统计
    const stats = cacheManager.getStats();
    console.log('缓存统计:', stats);
}

// 测试状态管理器
async function testStateManager(stateManager) {
    console.log('\n测试状态管理器...');

    // 测试状态操作
    await stateManager.setState(StateType.USER, 'preferences', { theme: 'dark' });
    const preferences = await stateManager.getState(StateType.USER, 'preferences');
    console.log('用户偏好:', preferences);

    // 测试状态历史
    const history = stateManager.getHistory(StateType.USER, 'preferences');
    console.log('状态历史:', history);
}

// 测试工作流管理器
async function testWorkflowManager(workflowManager) {
    console.log('\n测试工作流管理器...');

    // 创建工作流
    const workflowId = await workflowManager.createWorkflow('test', [
        {
            type: TaskType.ACTION,
            action: async () => console.log('执行任务1')
        },
        {
            type: TaskType.ACTION,
            action: async () => console.log('执行任务2')
        }
    ]);

    // 启动工作流
    await workflowManager.startWorkflow(workflowId);

    // 获取工作流状态
    const status = workflowManager.getWorkflowStatus(workflowId);
    console.log('工作流状态:', status);
}

// 测试API管理器
async function testApiManager(apiManager) {
    console.log('\n测试API管理器...');

    // 注册API端点
    apiManager.registerEndpoint('users', {
        baseUrl: 'https://api.example.com',
        path: '/users'
    });

    // 添加请求拦截器
    apiManager.addRequestInterceptor(config => {
        config.headers['Authorization'] = 'Bearer token123';
        return config;
    });

    // 发送请求
    try {
        const response = await apiManager.get('users');
        console.log('API响应:', response);
    } catch (error) {
        console.log('API错误:', error.message);
    }
}

// 运行测试
initializeManagers();
