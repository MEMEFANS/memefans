// 常量定义
const ENV = 'development';
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx';
const MEME_TOKEN_MINT = 'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL';
const FEE_ADDRESS = '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx';
const GIVEAWAY_PDA_SEED = 'giveaway';
const TOKEN_ACCOUNT_SEED = 'token_account';

// 等待 Solana 初始化完成
function waitForSolanaInit() {
  return new Promise((resolve, reject) => {
    if (window.connection) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('等待 Solana 初始化超时'));
    }, 10000); // 10 秒超时

    window.addEventListener('solana-initialized', () => {
      clearTimeout(timeout);
      resolve();
    });

    window.addEventListener('solana-init-failed', (event) => {
      clearTimeout(timeout);
      reject(event.detail);
    });
  });
}

// 初始化钱包
async function initializeWallet() {
  try {
    console.log('开始初始化钱包...');
    const result = await chrome.storage.local.get(['walletKey']);
    if (result.walletKey) {
      console.log('找到钱包密钥');
      const secretKey = Uint8Array.from(Array.isArray(result.walletKey) ? result.walletKey : JSON.parse(result.walletKey));
      const keypair = window.solanaWeb3.Keypair.fromSecretKey(secretKey);
      
      // 设置钱包对象
      window.wallet = {
        publicKey: keypair.publicKey,
        signTransaction: async (transaction) => {
          transaction.partialSign(keypair);
          return transaction;
        },
        signAndSendTransaction: async (transaction) => {
          transaction.partialSign(keypair);
          const rawTransaction = transaction.serialize();
          const signature = await window.connection.sendRawTransaction(rawTransaction);
          return signature;
        }
      };
      window.publicKey = keypair.publicKey;
      
      const address = keypair.publicKey.toString();
      console.log('钱包地址:', address);
      document.getElementById('wallet-address').textContent = address;
      return true;
    } else {
      console.log('未找到钱包');
      document.getElementById('wallet-address').textContent = '请先创建或导入钱包';
      return false;
    }
  } catch (error) {
    console.error('初始化钱包失败:', error);
    return false;
  }
}

// 刷新 SOL 余额
async function refreshSolBalance() {
  try {
    if (!window.publicKey) {
      console.log('未找到钱包地址');
      return;
    }

    if (!window.connection) {
      console.error('Solana 连接未初始化');
      return;
    }

    console.log('开始获取 SOL 余额...');
    console.log('钱包地址:', window.publicKey.toString());
    console.log('使用的网络:', window.connection._rpcEndpoint);

    // 获取 SOL 余额
    const balance = await window.connection.getBalance(window.publicKey);
    console.log('原始 SOL 余额 (lamports):', balance);
    
    const solBalance = balance / window.solanaWeb3.LAMPORTS_PER_SOL;
    console.log('转换后的 SOL 余额:', solBalance);
    
    document.getElementById('sol-balance').textContent = solBalance.toFixed(4) + ' SOL';
  } catch (error) {
    console.error('获取 SOL 余额失败:', error);
    document.getElementById('sol-balance').textContent = '获取失败';
  }
}

// 刷新 FANS 代币余额
async function refreshFansBalance() {
  try {
    if (!window.publicKey || !window.FANS_TOKEN_MINT) {
      console.log('未找到钱包地址或代币 Mint 地址');
      return;
    }

    console.log('开始获取 FANS 余额...');
    console.log('钱包地址:', window.publicKey.toString());
    console.log('FANS Token Mint:', window.FANS_TOKEN_MINT.toString());

    // 获取代币账户
    const accounts = await window.connection.getParsedTokenAccountsByOwner(
      window.publicKey,
      { mint: window.FANS_TOKEN_MINT }
    );
    console.log('找到的代币账户:', accounts);

    if (accounts.value.length > 0) {
      // 获取代币余额
      const accountInfo = await window.connection.getTokenAccountBalance(accounts.value[0].pubkey);
      console.log('代币账户信息:', accountInfo);
      
      const fansBalance = accountInfo.value.uiAmount;
      console.log('FANS 余额:', fansBalance);
      
      document.getElementById('fans-balance').textContent = fansBalance.toFixed(2) + ' FANS';
      document.getElementById('accumulated-balance').textContent = fansBalance.toFixed(2) + ' FANS';
    } else {
      console.log('未找到 FANS 代币账户，可能需要创建');
      document.getElementById('fans-balance').textContent = '0.00 FANS';
      document.getElementById('accumulated-balance').textContent = '0.00 FANS';
    }
  } catch (error) {
    console.error('获取 FANS 余额失败:', error);
    document.getElementById('fans-balance').textContent = '获取失败';
    document.getElementById('accumulated-balance').textContent = '获取失败';
  }
}

// 刷新所有余额
async function refreshAllBalances() {
  await refreshSolBalance();
  await refreshFansBalance();
}

// 监听 Solana 初始化完成事件
window.addEventListener('solana-initialized', async () => {
  try {
    console.log('Solana 初始化完成，开始初始化钱包');
    // 初始化钱包
    const hasWallet = await initializeWallet();
    if (hasWallet) {
      console.log('钱包初始化成功，开始获取余额');
      // 初始刷新余额
      await refreshAllBalances();
      // 每 30 秒刷新一次余额
      setInterval(refreshAllBalances, 30000);
    }
  } catch (error) {
    console.error('钱包初始化或余额刷新失败:', error);
  }
});

// 等待所有库加载完成
window.addEventListener('load', async () => {
  try {
    // 初始化 Buffer
    window.Buffer = buffer.Buffer;

    // BN 类用于处理大数
    class BN {
      constructor(number) {
        if (typeof number === 'number') {
          this.number = BigInt(Math.floor(number * 1e9));
        } else if (typeof number === 'string') {
          this.number = BigInt(number);
        } else if (number instanceof BigInt) {
          this.number = number;
        } else {
          throw new Error('不支持的数字类型');
        }
      }

      toArray() {
        const buffer = Buffer.alloc(8);
        const value = this.number;
        buffer.writeBigInt64LE(value);
        return Array.from(buffer);
      }

      toArrayLike(BufferType, endian, length) {
        const buffer = Buffer.alloc(length || 8);
        const value = this.number;
        if (endian === 'le') {
          buffer.writeBigInt64LE(value);
        } else {
          buffer.writeBigInt64BE(value);
        }
        if (BufferType === Buffer) {
          return buffer;
        }
        return Array.from(buffer);
      }

      toString() {
        return this.number.toString();
      }
    }

    // 将 BN 添加到全局对象
    window.BN = BN;

    // 初始化 SPL Token
    window.splToken = {
      getAssociatedTokenAddress: async function(mint, owner) {
        const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new window.solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
        const TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        
        const [address] = await window.solanaWeb3.PublicKey.findProgramAddress(
          [
            owner.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mint.toBuffer(),
          ],
          SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
        );
        
        return address;
      }
    };

    // 初始化 Solana Web3
    if (typeof solanaWeb3 !== 'undefined') {
      window.solanaWeb3 = solanaWeb3;
    } else if (typeof solana !== 'undefined') {
      window.solanaWeb3 = solana;
    }

    // 初始化 Borsh
    const schema = new Map([
      [
        'CreateGiveawayArgs',
        {
          kind: 'struct',
          fields: [
            ['tweet_id', 'string'],
            ['amount_per_user', 'u64'],
            ['max_users', 'u64']
          ]
        }
      ]
    ]);

    if (typeof borsh !== 'undefined') {
      window.borsh = borsh;
      window.schema = schema;
      console.log('Borsh 初始化完成');
    } else {
      console.error('找不到 Borsh');
    }

    console.log('库初始化完成:', {
      Buffer: !!window.Buffer,
      BN: !!window.BN,
      solanaWeb3: !!window.solanaWeb3,
      splToken: !!window.splToken,
      borsh: !!window.borsh
    });

    // 初始化页面
    initializePage();
  } catch (error) {
    console.error('库初始化失败:', error);
  }
});

// 初始化页面
async function initializePage() {
  try {
    // 初始化连接
    const rpcUrl = SOLANA_RPC_URL;
    window.connection = new window.solanaWeb3.Connection(rpcUrl);
    
    // 检查钱包是否已连接
    const walletAddress = localStorage.getItem('walletAddress');
    if (walletAddress) {
      document.getElementById('wallet-address').textContent = walletAddress;
      await refreshBalance();
    }
    
    console.log('页面初始化完成');
  } catch (error) {
    console.error('初始化页面失败:', error);
  }
}

// 初始化合约
async function initializeContract() {
  try {
    console.log('开始初始化合约...');
    const contract = {
      createGiveaway: async (wallet, tweetId, amountPerUser, maxUsers) => {
        try {
          console.log('开始创建赠送...');
          console.log('参数:', {
            tweetId,
            amountPerUser: amountPerUser.toString(),
            maxUsers: maxUsers.toString()
          });

          // 获取 PDA 地址
          const [giveawayPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from(GIVEAWAY_PDA_SEED), Buffer.from(tweetId)],
            new window.solanaWeb3.PublicKey(PROGRAM_ID)
          );
          console.log('赠送 PDA:', giveawayPda.toString());

          const [programTokenPda] = await window.solanaWeb3.PublicKey.findProgramAddress(
            [Buffer.from(TOKEN_ACCOUNT_SEED)],
            new window.solanaWeb3.PublicKey(PROGRAM_ID)
          );
          console.log('程序代币账户 PDA:', programTokenPda.toString());

          // 获取用户代币账户
          const userTokenAccount = await window.splToken.getAssociatedTokenAddress(
            new window.solanaWeb3.PublicKey(MEME_TOKEN_MINT),
            wallet.publicKey
          );
          console.log('用户代币账户:', userTokenAccount.toString());

          // 获取手续费账户
          const feeReceiverAccount = await window.splToken.getAssociatedTokenAddress(
            new window.solanaWeb3.PublicKey(MEME_TOKEN_MINT),
            new window.solanaWeb3.PublicKey(FEE_ADDRESS)
          );
          console.log('手续费账户:', feeReceiverAccount.toString());

          // 创建指令数据
          const args = {
            tweet_id: tweetId,
            amount_per_user: amountPerUser,
            max_users: maxUsers
          };
          console.log('指令参数:', args);

          // 序列化指令数据
          const instructionData = window.borsh.serialize(window.schema, args);
          const dataBuffer = Buffer.from([0, ...instructionData]);
          console.log('序列化数据长度:', dataBuffer.length);

          // 创建交易指令
          const instruction = new window.solanaWeb3.TransactionInstruction({
            programId: new window.solanaWeb3.PublicKey(PROGRAM_ID),
            keys: [
              { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
              { pubkey: giveawayPda, isSigner: false, isWritable: true },
              { pubkey: userTokenAccount, isSigner: false, isWritable: true },
              { pubkey: programTokenPda, isSigner: false, isWritable: true },
              { pubkey: feeReceiverAccount, isSigner: false, isWritable: true },
              { pubkey: window.splToken.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
              { pubkey: window.solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: dataBuffer
          });

          // 创建并签名交易
          console.log('创建交易...');
          const transaction = new window.solanaWeb3.Transaction().add(instruction);
          const { blockhash } = await window.connection.getRecentBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = wallet.publicKey;

          console.log('签名交易...');
          const signedTransaction = await wallet.signTransaction(transaction);

          // 发送交易
          console.log('发送交易...');
          const signature = await window.connection.sendRawTransaction(signedTransaction.serialize());
          console.log('等待交易确认...');
          await window.connection.confirmTransaction(signature);

          console.log('赠送创建成功!');
          return {
            success: true,
            signature,
            giveawayPda: giveawayPda.toString()
          };
        } catch (error) {
          console.error('创建赠送失败:', error);
          return {
            success: false,
            error: error.message
          };
        }
      }
    };

    window.contract = contract;
    console.log('合约初始化完成');
    return true;
  } catch (error) {
    console.error('初始化合约失败:', error);
    return false;
  }
}

// 监听 Solana 初始化完成事件
window.addEventListener('solana-initialized', async () => {
  try {
    console.log('Solana 初始化完成，开始初始化钱包');
    const hasWallet = await initializeWallet();
    if (hasWallet) {
      await initializeContract();
      await refreshAllBalances();
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
});

initializePage();
