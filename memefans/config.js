// 环境配置
export const ENV = process.env.NODE_ENV || 'development';

// 网络配置
export const NETWORK_CONFIG = {
    test: {
        rpc: 'http://localhost:8899',
        wsEndpoint: 'ws://localhost:8900',
        commitment: 'confirmed'
    },
    development: {
        rpc: 'https://api.devnet.solana.com',
        wsEndpoint: 'wss://api.devnet.solana.com',
        commitment: 'confirmed'
    },
    production: {
        rpc: 'https://api.mainnet-beta.solana.com',
        wsEndpoint: 'wss://api.mainnet-beta.solana.com',
        commitment: 'confirmed'
    }
};

// Solana 程序相关配置
export const SOLANA_NETWORK = ENV === 'production' ? 'mainnet-beta' : 'devnet';
export const SOLANA_RPC_URL = NETWORK_CONFIG[ENV].rpc;

// 测试环境配置
export const TEST_CONFIG = {
    MOCK_PROGRAM_ID: 'TEST_PROGRAM_ID_11111111111111111111111111111111',
    MOCK_GIVEAWAY_ADDRESS: 'TEST_ADDRESS_22222222222222222222222222222222',
    MOCK_TOKEN_MINT: 'TEST_TOKEN_33333333333333333333333333333333',
    MOCK_FEE_RECEIVER: 'TEST_RECEIVER_44444444444444444444444444444444'
};

// 合约配置
export const CONTRACT_CONFIG = {
    test: {
        GIVEAWAY_POOL: {
            address: TEST_CONFIG.MOCK_GIVEAWAY_ADDRESS,
            program: TEST_CONFIG.MOCK_PROGRAM_ID
        }
    },
    development: {
        GIVEAWAY_POOL: {
            address: 'DEVELOPMENT_CONTRACT_ADDRESS',  // 开发环境下将由部署脚本自动填充
            program: 'DEVELOPMENT_PROGRAM_ID'        // 开发环境下将由部署脚本自动填充
        }
    },
    production: {
        GIVEAWAY_POOL: {
            address: 'GvWbr3RjqxA5Rp3YyNQvVGGYDwKP1ZhNd4nKM9WJqp4T',  // 生产环境下的合约地址
            program: 'FANSXnVq6k3R9buRNBJ5kP3xFVKHNkgC5yYvZsHgiZ9f'   // 生产环境下的程序ID
        }
    }
};

// 获取当前环境的合约配置
export const CURRENT_CONTRACT_CONFIG = CONTRACT_CONFIG[ENV];

// PDA Seeds
export const GIVEAWAY_PDA_SEED = 'giveaway';
export const USER_BALANCE_PDA_SEED = 'user_balance';
export const TOKEN_ACCOUNT_SEED = 'token_account';

// API配置
export const API_CONFIG = {
    test: {
        baseUrl: 'http://localhost:3000',
        endpoints: {
            claim: '/api/claim',
            verify: '/api/verify-interaction',
            withdraw: '/api/withdraw'
        }
    },
    development: {
        baseUrl: 'http://localhost:3000',
        endpoints: {
            claim: '/api/claim',
            verify: '/api/verify-interaction',
            withdraw: '/api/withdraw'
        }
    },
    production: {
        baseUrl: 'https://api.memefans.xyz',
        endpoints: {
            claim: '/api/claim',
            verify: '/api/verify-interaction',
            withdraw: '/api/withdraw'
        }
    }
};

// 获取当前环境的API配置
export const CURRENT_API_CONFIG = API_CONFIG[ENV];

// 代币配置
export const TOKEN_CONFIG = {
    test: {
        FANS_TOKEN_MINT: TEST_CONFIG.MOCK_TOKEN_MINT,
        FEE_RECEIVER: TEST_CONFIG.MOCK_FEE_RECEIVER
    },
    development: {
        FANS_TOKEN_MINT: 'FANSdevXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',   // 开发环境代币地址（待定）
        FEE_RECEIVER: 'DEVELOPMENT_FEE_RECEIVER'      // 开发环境手续费接收地址（待定）
    },
    production: {
        FANS_TOKEN_MINT: 'EViQB8r2we14B4sA6jEg5Ujb85WepzKUcf7YwGeGpump',  // 主网代币地址
        FEE_RECEIVER: 'FANSXnVq6k3R9buRNBJ5kP3xFVKHNkgC5yYvZsHgiZ9f'   // 生产环境手续费接收地址
    }
};

// 获取当前环境的代币配置
export const CURRENT_TOKEN_CONFIG = TOKEN_CONFIG[ENV];
