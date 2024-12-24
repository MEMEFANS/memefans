use borsh::{BorshDeserialize, BorshSerialize};
use num_derive::FromPrimitive;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    decode_error::DecodeError,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_token::state::{Account as TokenAccount, AccountState};
use thiserror::Error;

// 定义程序ID（部署后更新）
solana_program::declare_id!("11111111111111111111111111111111");

// 错误定义
#[derive(Error, Debug, Copy, Clone, FromPrimitive)]
pub enum GiveawayError {
    #[error("Invalid instruction")]
    InvalidInstruction,
    #[error("Not rent exempt")]
    NotRentExempt,
    #[error("Expected amount mismatch")]
    ExpectedAmountMismatch,
    #[error("Amount overflow")]
    AmountOverflow,
    #[error("Already claimed")]
    AlreadyClaimed,
    #[error("Giveaway not active")]
    GiveawayNotActive,
    #[error("Invalid token account owner")]
    InvalidTokenAccountOwner,
    #[error("Invalid owner")]
    InvalidOwner,
    #[error("Invalid token program")]
    InvalidTokenProgram,
    #[error("Invalid PDA")]
    InvalidPDA,
    #[error("Invalid token mint")]
    InvalidTokenMint,
}

impl From<GiveawayError> for ProgramError {
    fn from(e: GiveawayError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

// 指令定义
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub enum GiveawayInstruction {
    /// 初始化赠送
    /// 
    /// Accounts expected:
    /// 0. `[signer]` 创建者账户
    /// 1. `[writable]` 赠送账户 (PDA)
    /// 2. `[writable]` 创建者代币账户
    /// 3. `[writable]` 程序代币账户 (PDA)
    /// 4. `[writable]` 手续费接收账户
    /// 5. `[]` 代币程序
    /// 6. `[]` 系统程序
    Initialize {
        tweet_id: String,
        amount_per_user: u64,
        max_users: u64,
    },

    /// 领取代币
    /// 
    /// Accounts expected:
    /// 0. `[signer]` 领取者账户
    /// 1. `[writable]` 赠送账户 (PDA)
    /// 2. `[writable]` 用户余额账户 (PDA)
    Claim {
        tweet_id: String,
    },

    /// 提现代币
    /// 
    /// Accounts expected:
    /// 0. `[signer]` 用户账户
    /// 1. `[writable]` 用户余额账户 (PDA)
    /// 2. `[writable]` 用户代币账户
    /// 3. `[writable]` 程序代币账户 (PDA)
    /// 4. `[]` 代币程序
    Withdraw {
        amount: u64,
    },
}

// 赠送数据结构
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Giveaway {
    pub creator: Pubkey,
    pub tweet_id: String,
    pub amount_per_user: u64,
    pub max_users: u64,
    pub claimed_count: u64,
    pub is_active: bool,
    pub total_amount: u64,
    pub claimed_users: Vec<Pubkey>,
}

// 用户余额数据结构
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct UserBalance {
    pub owner: Pubkey,
    pub amount: u64,
    pub last_claim_time: i64,
    pub claim_count: u64,
}

// 常量
const FEE_PERCENTAGE: u64 = 100; // 1% = 100/10000
const GIVEAWAY_PDA_SEED: &[u8] = b"giveaway";
const USER_BALANCE_PDA_SEED: &[u8] = b"user_balance";
const TOKEN_MINT: &str = "EViQB8r2we14B4sA6jEg5Ujb85WepzKUcf7YwGeGpump";

// 程序入口点
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = GiveawayInstruction::try_from_slice(instruction_data)?;

    match instruction {
        GiveawayInstruction::Initialize {
            tweet_id,
            amount_per_user,
            max_users,
        } => {
            msg!("Instruction: Initialize Giveaway");
            process_initialize(program_id, accounts, tweet_id, amount_per_user, max_users)
        }
        GiveawayInstruction::Claim { tweet_id } => {
            msg!("Instruction: Claim Tokens");
            process_claim(program_id, accounts, tweet_id)
        }
        GiveawayInstruction::Withdraw { amount } => {
            msg!("Instruction: Withdraw Tokens");
            process_withdraw(program_id, accounts, amount)
        }
    }
}

// 初始化赠送
fn process_initialize(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    tweet_id: String,
    amount_per_user: u64,
    max_users: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let creator_info = next_account_info(account_info_iter)?;
    let giveaway_account = next_account_info(account_info_iter)?;
    let creator_token_account = next_account_info(account_info_iter)?;
    let program_token_account = next_account_info(account_info_iter)?;
    let fee_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // 验证签名
    if !creator_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 验证账户所有权
    if creator_token_account.owner != token_program.key {
        return Err(GiveawayError::InvalidTokenAccountOwner.into());
    }

    // 验证代币 mint 地址
    let creator_token_account_data = TokenAccount::unpack(&creator_token_account.data.borrow())?;
    if creator_token_account_data.mint != Pubkey::from_str(TOKEN_MINT).unwrap() {
        return Err(GiveawayError::InvalidTokenMint.into());
    }

    // 计算 PDA
    let (giveaway_pda, bump_seed) = Pubkey::find_program_address(
        &[GIVEAWAY_PDA_SEED, tweet_id.as_bytes()],
        program_id,
    );
    if giveaway_pda != *giveaway_account.key {
        return Err(GiveawayError::InvalidPDA.into());
    }

    // 计算总金额和手续费
    let total_amount = amount_per_user.checked_mul(max_users)
        .ok_or(GiveawayError::AmountOverflow)?;
    let fee_amount = total_amount.checked_mul(FEE_PERCENTAGE)
        .ok_or(GiveawayError::AmountOverflow)?
        .checked_div(10000)
        .ok_or(GiveawayError::AmountOverflow)?;
    let giveaway_amount = total_amount.checked_sub(fee_amount)
        .ok_or(GiveawayError::AmountOverflow)?;

    // 创建赠送账户
    let rent = Rent::get()?;
    let space = 1000; // 根据实际数据大小调整
    let rent_lamports = rent.minimum_balance(space);

    invoke_signed(
        &system_instruction::create_account(
            creator_info.key,
            &giveaway_pda,
            rent_lamports,
            space as u64,
            program_id,
        ),
        &[
            creator_info.clone(),
            giveaway_account.clone(),
            system_program.clone(),
        ],
        &[&[GIVEAWAY_PDA_SEED, tweet_id.as_bytes(), &[bump_seed]]],
    )?;

    // 转移代币到程序账户
    invoke(
        &spl_token::instruction::transfer(
            token_program.key,
            creator_token_account.key,
            program_token_account.key,
            creator_info.key,
            &[creator_info.key],
            giveaway_amount,
        )?,
        &[
            creator_token_account.clone(),
            program_token_account.clone(),
            creator_info.clone(),
            token_program.clone(),
        ],
    )?;

    // 转移手续费
    invoke(
        &spl_token::instruction::transfer(
            token_program.key,
            creator_token_account.key,
            fee_account.key,
            creator_info.key,
            &[creator_info.key],
            fee_amount,
        )?,
        &[
            creator_token_account.clone(),
            fee_account.clone(),
            creator_info.clone(),
            token_program.clone(),
        ],
    )?;

    // 初始化赠送数据
    let giveaway = Giveaway {
        creator: *creator_info.key,
        tweet_id,
        amount_per_user,
        max_users,
        claimed_count: 0,
        is_active: true,
        total_amount: giveaway_amount,
        claimed_users: Vec::new(),
    };
    giveaway.serialize(&mut &mut giveaway_account.data.borrow_mut()[..])?;

    Ok(())
}

// 领取代币
fn process_claim(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    tweet_id: String,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let claimer_info = next_account_info(account_info_iter)?;
    let giveaway_account = next_account_info(account_info_iter)?;
    let user_balance_account = next_account_info(account_info_iter)?;

    // 验证签名
    if !claimer_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 读取赠送数据
    let mut giveaway = Giveaway::try_from_slice(&giveaway_account.data.borrow())?;

    // 验证赠送状态
    if !giveaway.is_active {
        return Err(GiveawayError::GiveawayNotActive.into());
    }
    if giveaway.claimed_count >= giveaway.max_users {
        return Err(GiveawayError::ExpectedAmountMismatch.into());
    }
    if giveaway.claimed_users.contains(claimer_info.key) {
        return Err(GiveawayError::AlreadyClaimed.into());
    }

    // 计算用户余额 PDA
    let (user_balance_pda, bump_seed) = Pubkey::find_program_address(
        &[USER_BALANCE_PDA_SEED, claimer_info.key.as_ref()],
        program_id,
    );
    if user_balance_pda != *user_balance_account.key {
        return Err(GiveawayError::InvalidPDA.into());
    }

    // 更新或创建用户余额
    let mut user_balance = if user_balance_account.data_is_empty() {
        // 创建新的用户余额账户
        let rent = Rent::get()?;
        let space = 100; // 根据实际数据大小调整
        let rent_lamports = rent.minimum_balance(space);

        invoke_signed(
            &system_instruction::create_account(
                claimer_info.key,
                &user_balance_pda,
                rent_lamports,
                space as u64,
                program_id,
            ),
            &[
                claimer_info.clone(),
                user_balance_account.clone(),
            ],
            &[&[USER_BALANCE_PDA_SEED, claimer_info.key.as_ref(), &[bump_seed]]],
        )?;

        UserBalance {
            owner: *claimer_info.key,
            amount: 0,
            last_claim_time: 0,
            claim_count: 0,
        }
    } else {
        UserBalance::try_from_slice(&user_balance_account.data.borrow())?
    };

    // 更新数据
    user_balance.amount = user_balance.amount.checked_add(giveaway.amount_per_user)
        .ok_or(GiveawayError::AmountOverflow)?;
    user_balance.last_claim_time = solana_program::clock::Clock::get()?.unix_timestamp;
    user_balance.claim_count += 1;

    giveaway.claimed_count += 1;
    giveaway.claimed_users.push(*claimer_info.key);

    // 保存更新后的数据
    user_balance.serialize(&mut &mut user_balance_account.data.borrow_mut()[..])?;
    giveaway.serialize(&mut &mut giveaway_account.data.borrow_mut()[..])?;

    Ok(())
}

// 提现代币
fn process_withdraw(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    amount: u64,
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter();
    let user_info = next_account_info(account_info_iter)?;
    let user_balance_account = next_account_info(account_info_iter)?;
    let user_token_account = next_account_info(account_info_iter)?;
    let program_token_account = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // 验证签名
    if !user_info.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    // 验证账户所有权
    if user_token_account.owner != token_program.key {
        return Err(GiveawayError::InvalidTokenAccountOwner.into());
    }

    // 读取用户余额
    let mut user_balance = UserBalance::try_from_slice(&user_balance_account.data.borrow())?;

    // 验证余额
    if user_balance.amount < amount {
        return Err(GiveawayError::ExpectedAmountMismatch.into());
    }

    // 计算 PDA
    let (program_token_pda, bump_seed) = Pubkey::find_program_address(
        &[b"token_account"],
        program_id,
    );

    // 转移代币
    invoke_signed(
        &spl_token::instruction::transfer(
            token_program.key,
            program_token_account.key,
            user_token_account.key,
            &program_token_pda,
            &[],
            amount,
        )?,
        &[
            program_token_account.clone(),
            user_token_account.clone(),
            token_program.clone(),
        ],
        &[&[b"token_account", &[bump_seed]]],
    )?;

    // 更新用户余额
    user_balance.amount = user_balance.amount.checked_sub(amount)
        .ok_or(GiveawayError::AmountOverflow)?;
    user_balance.serialize(&mut &mut user_balance_account.data.borrow_mut()[..])?;

    Ok(())
}
