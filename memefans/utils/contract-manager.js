import { 
    Connection, 
    PublicKey, 
    SystemProgram, 
    Transaction,
    TransactionInstruction,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import * as borsh from 'borsh.js';
import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { TransactionHelper } from './transaction.js';
import { ValidationHelper } from './validation.js';

// 合约状态
export const ContractState = {
    UNINITIALIZED: 'UNINITIALIZED',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    ENDED: 'ENDED'
};

// 指令类型
export const InstructionType = {
    INITIALIZE: 0,
    CREATE_GIVEAWAY: 1,
    CLAIM_TOKENS: 2,
    WITHDRAW_TOKENS: 3,
    UPDATE_CONFIG: 4,
    PAUSE: 5,
    RESUME: 6,
    END: 7
};

// 序列化模式
const SCHEMA = new Map([
    [InitializeArgs, {
        kind: 'struct',
        fields: [
            ['admin', [32]], // Pubkey
            ['fee_receiver', [32]], // Pubkey
            ['fee_basis_points', 'u16'],
            ['min_amount', 'u64'],
            ['max_amount', 'u64']
        ]
    }],
    [CreateGiveawayArgs, {
        kind: 'struct',
        fields: [
            ['tweet_id', 'string'],
            ['amount_per_user', 'u64'],
            ['max_users', 'u32'],
            ['start_time', 'u64'],
            ['end_time', 'u64'],
            ['is_random', 'u8']
        ]
    }],
    [ClaimArgs, {
        kind: 'struct',
        fields: [
            ['tweet_id', 'string'],
            ['proof', ['u8', 64]] // Signature
        ]
    }],
    [WithdrawArgs, {
        kind: 'struct',
        fields: [
            ['amount', 'u64']
        ]
    }]
]);

export class ContractManager {
    constructor(config) {
        this.connection = new Connection(config.rpcUrl);
        this.programId = new PublicKey(config.programId);
        this.tokenMint = new PublicKey(config.tokenMint);
        this.feeReceiver = new PublicKey(config.feeReceiver);
        this.state = ContractState.UNINITIALIZED;
        this.transactionHelper = new TransactionHelper(this.connection);
    }

    // 初始化合约
    async initialize(wallet, config) {
        try {
            ValidationHelper.validateWallet(wallet);
            ValidationHelper.validateConfig(config);

            const [statePda] = await PublicKey.findProgramAddress(
                [Buffer.from('state')],
                this.programId
            );

            const initializeArgs = new InitializeArgs({
                admin: wallet.publicKey.toBytes(),
                fee_receiver: this.feeReceiver.toBytes(),
                fee_basis_points: config.feeBasisPoints,
                min_amount: config.minAmount,
                max_amount: config.maxAmount
            });

            const data = borsh.serialize(SCHEMA, initializeArgs);
            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                    { pubkey: statePda, isSigner: false, isWritable: true },
                    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
                ],
                programId: this.programId,
                data: Buffer.from([InstructionType.INITIALIZE, ...data])
            });

            const result = await this.transactionHelper.sendAndConfirmTransaction(
                [instruction],
                [wallet],
                'initialize'
            );

            this.state = ContractState.ACTIVE;
            return result;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 创建赠送
    async createGiveaway(wallet, params) {
        try {
            ValidationHelper.validateWallet(wallet);
            ValidationHelper.validateGiveawayParams(params);

            const [giveawayPda] = await PublicKey.findProgramAddress(
                [Buffer.from('giveaway'), Buffer.from(params.tweetId)],
                this.programId
            );

            const tokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                giveawayPda,
                true
            );

            const createGiveawayArgs = new CreateGiveawayArgs({
                tweet_id: params.tweetId,
                amount_per_user: params.amountPerUser,
                max_users: params.maxUsers,
                start_time: params.startTime || Date.now(),
                end_time: params.endTime || (Date.now() + 7 * 24 * 60 * 60 * 1000),
                is_random: params.isRandom ? 1 : 0
            });

            const data = borsh.serialize(SCHEMA, createGiveawayArgs);
            const instructions = [];

            // 检查代币账户是否存在
            const tokenAccountInfo = await this.connection.getAccountInfo(tokenAccount);
            if (!tokenAccountInfo) {
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        tokenAccount,
                        giveawayPda,
                        this.tokenMint
                    )
                );
            }

            instructions.push(
                new TransactionInstruction({
                    keys: [
                        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                        { pubkey: giveawayPda, isSigner: false, isWritable: true },
                        { pubkey: tokenAccount, isSigner: false, isWritable: true },
                        { pubkey: this.tokenMint, isSigner: false, isWritable: false },
                        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }
                    ],
                    programId: this.programId,
                    data: Buffer.from([InstructionType.CREATE_GIVEAWAY, ...data])
                })
            );

            return await this.transactionHelper.sendAndConfirmTransaction(
                instructions,
                [wallet],
                'createGiveaway'
            );
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 领取代币
    async claimTokens(wallet, params) {
        try {
            ValidationHelper.validateWallet(wallet);
            ValidationHelper.validateClaimParams(params);

            const [giveawayPda] = await PublicKey.findProgramAddress(
                [Buffer.from('giveaway'), Buffer.from(params.tweetId)],
                this.programId
            );

            const [userBalancePda] = await PublicKey.findProgramAddress(
                [Buffer.from('balance'), wallet.publicKey.toBytes()],
                this.programId
            );

            const giveawayTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                giveawayPda,
                true
            );

            const userTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                wallet.publicKey,
                true
            );

            const claimArgs = new ClaimArgs({
                tweet_id: params.tweetId,
                proof: params.proof
            });

            const data = borsh.serialize(SCHEMA, claimArgs);
            const instructions = [];

            // 检查用户代币账户是否存在
            const userTokenAccountInfo = await this.connection.getAccountInfo(userTokenAccount);
            if (!userTokenAccountInfo) {
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        userTokenAccount,
                        wallet.publicKey,
                        this.tokenMint
                    )
                );
            }

            instructions.push(
                new TransactionInstruction({
                    keys: [
                        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                        { pubkey: giveawayPda, isSigner: false, isWritable: true },
                        { pubkey: userBalancePda, isSigner: false, isWritable: true },
                        { pubkey: giveawayTokenAccount, isSigner: false, isWritable: true },
                        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                        { pubkey: this.tokenMint, isSigner: false, isWritable: false },
                        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                        { pubkey: this.feeReceiver, isSigner: false, isWritable: true }
                    ],
                    programId: this.programId,
                    data: Buffer.from([InstructionType.CLAIM_TOKENS, ...data])
                })
            );

            return await this.transactionHelper.sendAndConfirmTransaction(
                instructions,
                [wallet],
                'claimTokens'
            );
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 提现代币
    async withdrawTokens(wallet, amount) {
        try {
            ValidationHelper.validateWallet(wallet);
            ValidationHelper.validateAmount(amount);

            const [userBalancePda] = await PublicKey.findProgramAddress(
                [Buffer.from('balance'), wallet.publicKey.toBytes()],
                this.programId
            );

            const userTokenAccount = await getAssociatedTokenAddress(
                this.tokenMint,
                wallet.publicKey,
                true
            );

            const withdrawArgs = new WithdrawArgs({
                amount: amount
            });

            const data = borsh.serialize(SCHEMA, withdrawArgs);
            const instructions = [];

            // 检查用户代币账户是否存在
            const userTokenAccountInfo = await this.connection.getAccountInfo(userTokenAccount);
            if (!userTokenAccountInfo) {
                instructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        userTokenAccount,
                        wallet.publicKey,
                        this.tokenMint
                    )
                );
            }

            instructions.push(
                new TransactionInstruction({
                    keys: [
                        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
                        { pubkey: userBalancePda, isSigner: false, isWritable: true },
                        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                        { pubkey: this.tokenMint, isSigner: false, isWritable: false },
                        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
                    ],
                    programId: this.programId,
                    data: Buffer.from([InstructionType.WITHDRAW_TOKENS, ...data])
                })
            );

            return await this.transactionHelper.sendAndConfirmTransaction(
                instructions,
                [wallet],
                'withdrawTokens'
            );
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取赠送信息
    async getGiveawayInfo(tweetId) {
        try {
            ValidationHelper.validateTweetId(tweetId);

            const [giveawayPda] = await PublicKey.findProgramAddress(
                [Buffer.from('giveaway'), Buffer.from(tweetId)],
                this.programId
            );

            const accountInfo = await this.connection.getAccountInfo(giveawayPda);
            if (!accountInfo) {
                return null;
            }

            return borsh.deserialize(
                SCHEMA,
                Giveaway,
                accountInfo.data
            );
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取用户余额
    async getUserBalance(wallet) {
        try {
            ValidationHelper.validateWallet(wallet);

            const [userBalancePda] = await PublicKey.findProgramAddress(
                [Buffer.from('balance'), wallet.publicKey.toBytes()],
                this.programId
            );

            const accountInfo = await this.connection.getAccountInfo(userBalancePda);
            if (!accountInfo) {
                return 0;
            }

            const userBalance = borsh.deserialize(
                SCHEMA,
                UserBalance,
                accountInfo.data
            );

            return userBalance.amount;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取合约状态
    async getContractState() {
        try {
            const [statePda] = await PublicKey.findProgramAddress(
                [Buffer.from('state')],
                this.programId
            );

            const accountInfo = await this.connection.getAccountInfo(statePda);
            if (!accountInfo) {
                return ContractState.UNINITIALIZED;
            }

            const state = borsh.deserialize(
                SCHEMA,
                State,
                accountInfo.data
            );

            return state.status;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 暂停合约
    async pauseContract(wallet) {
        try {
            ValidationHelper.validateWallet(wallet);

            const [statePda] = await PublicKey.findProgramAddress(
                [Buffer.from('state')],
                this.programId
            );

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
                    { pubkey: statePda, isSigner: false, isWritable: true }
                ],
                programId: this.programId,
                data: Buffer.from([InstructionType.PAUSE])
            });

            const result = await this.transactionHelper.sendAndConfirmTransaction(
                [instruction],
                [wallet],
                'pauseContract'
            );

            this.state = ContractState.PAUSED;
            return result;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 恢复合约
    async resumeContract(wallet) {
        try {
            ValidationHelper.validateWallet(wallet);

            const [statePda] = await PublicKey.findProgramAddress(
                [Buffer.from('state')],
                this.programId
            );

            const instruction = new TransactionInstruction({
                keys: [
                    { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
                    { pubkey: statePda, isSigner: false, isWritable: true }
                ],
                programId: this.programId,
                data: Buffer.from([InstructionType.RESUME])
            });

            const result = await this.transactionHelper.sendAndConfirmTransaction(
                [instruction],
                [wallet],
                'resumeContract'
            );

            this.state = ContractState.ACTIVE;
            return result;
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }
}
