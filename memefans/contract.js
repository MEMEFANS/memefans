import { 
    Connection, 
    PublicKey, 
    SystemProgram, 
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl_token';
import * as borsh from 'borsh';
import {
    SOLANA_RPC_URL,
    GIVEAWAY_PROGRAM_ID,
    MEME_TOKEN_MINT,
    GIVEAWAY_PDA_SEED,
    USER_BALANCE_PDA_SEED,
    TOKEN_ACCOUNT_SEED,
    FEE_RECEIVER,
} from './config';
import { TransactionHelper } from './utils/transaction';
import { ValidationHelper } from './utils/validation';

// 初始化连接
const connection = new Connection(SOLANA_RPC_URL);
const programId = new PublicKey(GIVEAWAY_PROGRAM_ID);
const tokenMint = new PublicKey(MEME_TOKEN_MINT);

// 指令枚举
const InstructionVariant = {
    Initialize: 0,
    Claim: 1,
    Withdraw: 2,
};

// 序列化函数
class InitializeArgs {
    constructor(props) {
        this.tweet_id = props.tweet_id;
        this.amount_per_user = props.amount_per_user;
        this.max_users = props.max_users;
    }
}

class ClaimArgs {
    constructor(props) {
        this.tweet_id = props.tweet_id;
    }
}

class WithdrawArgs {
    constructor(props) {
        this.amount = props.amount;
    }
}

class UserBalance {
    constructor(props) {
        this.amount = props.amount;
    }
}

class Giveaway {
    constructor(props) {
        this.tweet_id = props.tweet_id;
        this.amount_per_user = props.amount_per_user;
        this.max_users = props.max_users;
    }
}

const schema = new Map([
    [InitializeArgs, { 
        kind: 'struct',
        fields: [
            ['tweet_id', 'string'],
            ['amount_per_user', 'u64'],
            ['max_users', 'u64'],
        ]
    }],
    [ClaimArgs, {
        kind: 'struct',
        fields: [
            ['tweet_id', 'string'],
        ]
    }],
    [WithdrawArgs, {
        kind: 'struct',
        fields: [
            ['amount', 'u64'],
        ]
    }],
    [UserBalance, {
        kind: 'struct',
        fields: [
            ['amount', 'u64'],
        ]
    }],
    [Giveaway, {
        kind: 'struct',
        fields: [
            ['tweet_id', 'string'],
            ['amount_per_user', 'u64'],
            ['max_users', 'u64'],
        ]
    }],
]);

// 创建工具类实例
const transactionHelper = new TransactionHelper();

// 创建赠送
export async function createGiveaway(wallet, tweetId, amountPerUser, maxUsers) {
    try {
        // 验证参数
        ValidationHelper.validateWallet(wallet);
        ValidationHelper.validateTweetId(tweetId);
        ValidationHelper.validateGiveawayParams(amountPerUser, maxUsers);

        const [giveawayPda] = await PublicKey.findProgramAddress(
            [Buffer.from(GIVEAWAY_PDA_SEED), Buffer.from(tweetId)],
            programId
        );

        const [programTokenPda] = await PublicKey.findProgramAddress(
            [Buffer.from(TOKEN_ACCOUNT_SEED)],
            programId
        );

        // 获取代币账户
        const userTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            wallet.publicKey
        );

        const feeReceiverAccount = await getAssociatedTokenAddress(
            tokenMint,
            new PublicKey(FEE_RECEIVER)
        );

        // 创建指令数据
        const args = new InitializeArgs({
            tweet_id: tweetId,
            amount_per_user: amountPerUser,
            max_users: maxUsers,
        });
        const instructionData = borsh.serialize(schema, args);
        const dataBuffer = Buffer.from([InstructionVariant.Initialize, ...instructionData]);

        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                { pubkey: giveawayPda, isSigner: false, isWritable: true },
                { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                { pubkey: programTokenPda, isSigner: false, isWritable: true },
                { pubkey: feeReceiverAccount, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data: dataBuffer,
        });

        const transaction = new Transaction().add(instruction);
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // 使用重试机制发送交易
        return await transactionHelper.retryTransaction(async () => {
            try {
                const signature = await wallet.signAndSendTransaction(transaction);
                await transactionHelper.waitForConfirmation(signature);
                return {
                    success: true,
                    signature,
                    giveawayPda: giveawayPda.toString()
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    } catch (error) {
        console.error('创建赠送失败:', error);
        throw error;
    }
}

// 领取代币
export async function claimTokens(wallet, tweetId) {
    try {
        // 验证参数
        ValidationHelper.validateWallet(wallet);
        ValidationHelper.validateTweetId(tweetId);

        const [giveawayPda] = await PublicKey.findProgramAddress(
            [Buffer.from(GIVEAWAY_PDA_SEED), Buffer.from(tweetId)],
            programId
        );

        const [userBalancePda] = await PublicKey.findProgramAddress(
            [Buffer.from(USER_BALANCE_PDA_SEED), wallet.publicKey.toBuffer()],
            programId
        );

        // 创建指令数据
        const args = new ClaimArgs({ tweet_id: tweetId });
        const instructionData = borsh.serialize(schema, args);
        const dataBuffer = Buffer.from([InstructionVariant.Claim, ...instructionData]);

        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
                { pubkey: giveawayPda, isSigner: false, isWritable: true },
                { pubkey: userBalancePda, isSigner: false, isWritable: true },
            ],
            data: dataBuffer,
        });

        const transaction = new Transaction().add(instruction);
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // 使用重试机制发送交易
        return await transactionHelper.retryTransaction(async () => {
            try {
                const signature = await wallet.signAndSendTransaction(transaction);
                await transactionHelper.waitForConfirmation(signature);
                return {
                    success: true,
                    signature,
                    giveawayPda: giveawayPda.toString()
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    } catch (error) {
        console.error('领取代币失败:', error);
        throw error;
    }
}

// 提现代币
export async function withdrawTokens(wallet, amount) {
    try {
        ValidationHelper.validateWallet(wallet);
        ValidationHelper.validateAmount(amount);

        const [userBalancePda] = await PublicKey.findProgramAddress(
            [Buffer.from(USER_BALANCE_PDA_SEED), wallet.publicKey.toBuffer()],
            programId
        );

        const [programTokenPda] = await PublicKey.findProgramAddress(
            [Buffer.from(TOKEN_ACCOUNT_SEED)],
            programId
        );

        const userTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            wallet.publicKey
        );

        // 创建指令数据
        const args = new WithdrawArgs({ amount });
        const instructionData = borsh.serialize(schema, args);
        const dataBuffer = Buffer.from([InstructionVariant.Withdraw, ...instructionData]);

        // 检查用户是否有代币账户，如果没有则创建
        let transaction = new Transaction();
        
        try {
            await connection.getTokenAccountBalance(userTokenAccount);
        } catch {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    wallet.publicKey,
                    userTokenAccount,
                    wallet.publicKey,
                    tokenMint
                )
            );
        }

        const instruction = new TransactionInstruction({
            programId,
            keys: [
                { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
                { pubkey: userBalancePda, isSigner: false, isWritable: true },
                { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                { pubkey: programTokenPda, isSigner: false, isWritable: true },
                { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ],
            data: dataBuffer,
        });

        transaction.add(instruction);
        const { blockhash } = await connection.getRecentBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // 使用重试机制发送交易
        return await transactionHelper.retryTransaction(async () => {
            try {
                const signature = await wallet.signAndSendTransaction(transaction);
                await transactionHelper.waitForConfirmation(signature);
                return {
                    success: true,
                    signature
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    } catch (error) {
        console.error('提现代币失败:', error);
        throw error;
    }
}

// 获取用户余额
export async function getUserBalance(wallet) {
    try {
        ValidationHelper.validateWallet(wallet);

        const [userBalancePda] = await PublicKey.findProgramAddress(
            [Buffer.from(USER_BALANCE_PDA_SEED), wallet.publicKey.toBuffer()],
            programId
        );

        const accountInfo = await connection.getAccountInfo(userBalancePda);
        if (!accountInfo) {
            return { amount: 0 };
        }

        const userBalance = borsh.deserialize(
            schema,
            UserBalance,
            accountInfo.data
        );

        return userBalance;
    } catch (error) {
        console.error('获取用户余额失败:', error);
        throw error;
    }
}

// 获取赠送信息
export async function getGiveawayInfo(tweetId) {
    try {
        ValidationHelper.validateTweetId(tweetId);

        const [giveawayPda] = await PublicKey.findProgramAddress(
            [Buffer.from(GIVEAWAY_PDA_SEED), Buffer.from(tweetId)],
            programId
        );

        const accountInfo = await connection.getAccountInfo(giveawayPda);
        if (!accountInfo) {
            throw new Error('赠送不存在');
        }

        const giveaway = borsh.deserialize(
            schema,
            Giveaway,
            accountInfo.data
        );

        return giveaway;
    } catch (error) {
        console.error('获取赠送信息失败:', error);
        throw error;
    }
}
