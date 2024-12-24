pub fn initialize(
    ctx: Context<Initialize>,
    tweet_id: String,
    amount_per_user: u64,
    max_users: u64,
) -> Result<()>use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use std::str::FromStr;

declare_id!("11111111111111111111111111111111"); // 这里需要替换为实际部署后的程序ID

#[program]
pub mod giveaway {
    use super::*;

    // 初始化赠送
    pub fn initialize(
        ctx: Context<Initialize>,
        tweet_id: String,
        amount_per_user: u64,
        max_users: u64,
    ) -> Result<()> {
        let giveaway = &mut ctx.accounts.giveaway;
        giveaway.tweet_id = tweet_id;
        giveaway.amount_per_user = amount_per_user;
        giveaway.max_users = max_users;
        giveaway.claimed_users = 0;
        giveaway.authority = ctx.accounts.authority.key();

        // 转移代币到程序账户
        let total_amount = amount_per_user.checked_mul(max_users)
            .ok_or(ErrorCode::NumericalOverflow)?;

        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.program_token_account.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, total_amount)?;

        Ok(())
    }

    // 领取代币
    pub fn claim(ctx: Context<Claim>, tweet_id: String) -> Result<()> {
        let giveaway = &mut ctx.accounts.giveaway;
        require!(giveaway.tweet_id == tweet_id, ErrorCode::InvalidTweetId);
        require!(
            giveaway.claimed_users < giveaway.max_users,
            ErrorCode::GiveawayFull
        );

        // 更新用户余额
        let user_balance = &mut ctx.accounts.user_balance;
        user_balance.amount = user_balance
            .amount
            .checked_add(giveaway.amount_per_user)
            .ok_or(ErrorCode::NumericalOverflow)?;

        giveaway.claimed_users = giveaway
            .claimed_users
            .checked_add(1)
            .ok_or(ErrorCode::NumericalOverflow)?;

        Ok(())
    }

    // 提现代币
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let user_balance = &mut ctx.accounts.user_balance;
        require!(user_balance.amount >= amount, ErrorCode::InsufficientBalance);

        // 从程序账户转移代币到用户账户
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.program_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.program_token_account.to_account_info(),
            },
            &[&[
                b"token_account".as_ref(),
                &[*ctx.bumps.get("program_token_account").unwrap()],
            ]],
        );
        token::transfer(transfer_ctx, amount)?;

        user_balance.amount = user_balance
            .amount
            .checked_sub(amount)
            .ok_or(ErrorCode::NumericalOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(tweet_id: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 32,
        seeds = [b"giveaway", tweet_id.as_bytes()],
        bump
    )]
    pub giveaway: Account<'info, Giveaway>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"token_account"],
        bump
    )]
    pub program_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(tweet_id: String)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"giveaway", tweet_id.as_bytes()],
        bump
    )]
    pub giveaway: Account<'info, Giveaway>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 8,
        seeds = [b"user_balance", user.key().as_ref()],
        bump
    )]
    pub user_balance: Account<'info, UserBalance>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_balance", user.key().as_ref()],
        bump
    )]
    pub user_balance: Account<'info, UserBalance>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"token_account"],
        bump
    )]
    pub program_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Giveaway {
    pub tweet_id: String,
    pub amount_per_user: u64,
    pub max_users: u64,
    pub claimed_users: u64,
    pub authority: Pubkey,
}

#[account]
pub struct UserBalance {
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("数值计算溢出")]
    NumericalOverflow,
    #[msg("无效的推文ID")]
    InvalidTweetId,
    #[msg("赠送已满")]
    GiveawayFull,
    #[msg("余额不足")]
    InsufficientBalance,
}
