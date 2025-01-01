// 环境配置
export const ENV = 'development';

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
        rpc: 'https://white-empty-shard.solana-mainnet.quiknode.pro/ff813f8ec04d7e6eb1879195a437da9dc36aeeac/',
        wsEndpoint: 'wss://api.mainnet-beta.solana.com',
        commitment: 'confirmed'
    }
};

// Solana 程序相关配置
export const SOLANA_NETWORK = ENV === 'production' ? 'mainnet-beta' : 'devnet';
export const SOLANA_RPC_URL = NETWORK_CONFIG[ENV].rpc;

// 系统程序ID
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

// 测试环境配置
export const TEST_CONFIG = {
    MOCK_PROGRAM_ID: '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx',
    MOCK_GIVEAWAY_ADDRESS: '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx',
    MOCK_TOKEN_MINT: '6xfa7wnrsNR3DsK5xHuSGWjYLayFQUiemb8FmnvLBwes',
    MOCK_FEE_RECEIVER: '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx'
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
            address: '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx',
            program: '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx'
        }
    },
    production: {
        GIVEAWAY_POOL: {
            address: 'GvWbr3RjqxA5Rp3YyNQvVGGYDwKP1ZhNd4nKM9WJqp4T',
            program: 'GvWbr3RjqxA5Rp3YyNQvVGGYDwKP1ZhNd4nKM9WJqp4T'
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
        MEME_TOKEN_MINT: 'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL',
        FEE_RECEIVER: TEST_CONFIG.MOCK_FEE_RECEIVER
    },
    development: {
        FANS_TOKEN_MINT: '6xfa7wnrsNR3DsK5xHuSGWjYLayFQUiemb8FmnvLBwes',
        MEME_TOKEN_MINT: 'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL',
        FEE_RECEIVER: '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx'
    },
    production: {
        FANS_TOKEN_MINT: 'FANSXnVq6k3R9buRNBJ5kP3xFVKHNkgC5yYvZsHgiZ9f',
        MEME_TOKEN_MINT: 'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL',
        FEE_RECEIVER: 'GvWbr3RjqxA5Rp3YyNQvVGGYDwKP1ZhNd4nKM9WJqp4T'
    }
};

// 获取当前环境的代币配置
export const CURRENT_TOKEN_CONFIG = TOKEN_CONFIG[ENV];
