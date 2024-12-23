// 网络配置
export const NETWORK_CONFIG = {
    rpc: 'https://api.mainnet-beta.solana.com',
    wsEndpoint: 'wss://api.mainnet-beta.solana.com',
    commitment: 'confirmed'
};

// Solana 程序相关配置
export const SOLANA_NETWORK = 'mainnet-beta';
export const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

// 代币配置
export const FANS_TOKEN_MINT = 'EViQB8r2we14B4sA6jEg5Ujb85WepzKUcf7YwGeGpump';

// 合约配置
export const CONTRACT_CONFIG = {
    GIVEAWAY_POOL: {
        address: 'YOUR_DEPLOYED_CONTRACT_ADDRESS', // 需要替换为实际部署的地址
        program: '11111111111111111111111111111111'                // 需要替换为实际的程序 ID
    }
};

// PDA Seeds
export const GIVEAWAY_PDA_SEED = 'giveaway';
export const USER_BALANCE_PDA_SEED = 'user_balance';
export const TOKEN_ACCOUNT_SEED = 'token_account';

// 手续费接收账户
export const FEE_RECEIVER = 'YOUR_FEE_RECEIVER_ADDRESS';  // 替换为您的地址

// API配置
export const API_CONFIG = {
    baseUrl: 'YOUR_BACKEND_API_URL',             // 需要替换为实际的后端API地址
    endpoints: {
        claim: '/api/claim',
        verify: '/api/verify-interaction',
        withdraw: '/api/withdraw'
    }
};

//giveaway程序id
//export const GIVEAWAY_PROGRAM_ID = "";

