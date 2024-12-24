// Solana 程序 ID
const TOKEN_PROGRAM_ID = new solana.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new solana.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYSTEM_PROGRAM_ID = new solana.PublicKey('11111111111111111111111111111111');

// MEME 代币 Mint 地址
const MEME_TOKEN_MINT = new solana.PublicKey('METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL');

// QuickNode RPC URL
const QUICKNODE_RPC_URL = 'https://white-empty-shard.solana-mainnet.quiknode.pro/ff813f8ec04d7e6eb1879195a437da9dc36aeeac/';

// 其他常量
const LAMPORTS_PER_SOL = 1000000000;

export {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  MEME_TOKEN_MINT,
  QUICKNODE_RPC_URL,
  LAMPORTS_PER_SOL
};
