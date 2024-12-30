// 用户余额管理
class BalanceManager {
  static async getUserBalance() {
    const result = await chrome.storage.local.get(['pendingAmount', 'totalAmount', 'claims', 'withdrawHistory']);
    return {
      pendingAmount: result.pendingAmount || 0,
      totalAmount: result.totalAmount || 0,
      claims: result.claims || [],
      withdrawHistory: result.withdrawHistory || []
    };
  }

  static async addClaim(amount, tweetId, tokenInfo) {
    try {
      console.log('添加新的代币领取记录...');
      
      // 获取当前余额
      const result = await chrome.storage.local.get([
        'pendingAmount',
        'totalAmount',
        'claims'
      ]);

      const pendingAmount = (result.pendingAmount || 0) + amount;
      const totalAmount = (result.totalAmount || 0) + amount;
      const claims = result.claims || [];

      // 添加新的领取记录
      claims.push({
        amount,
        tweetId,
        timestamp: Date.now(),
        tokenInfo,
        status: 'pending'
      });

      // 更新存储
      await chrome.storage.local.set({
        pendingAmount,
        totalAmount,
        claims
      });

      console.log('领取记录已更新:', {
        pendingAmount,
        totalAmount,
        claimsCount: claims.length
      });

      return { pendingAmount, totalAmount, claims };
    } catch (error) {
      console.error('添加领取记录失败:', error);
      throw error;
    }
  }

  static async withdraw(amount) {
    try {
      console.log('开始提现处理...');
      
      // 获取当前余额
      const result = await chrome.storage.local.get([
        'pendingAmount',
        'withdrawHistory'
      ]);

      const pendingAmount = result.pendingAmount || 0;
      if (pendingAmount < amount) {
        throw new Error('待提取余额不足');
      }

      // 创建新的提现记录
      const withdrawHistory = result.withdrawHistory || [];
      const withdrawal = {
        amount,
        timestamp: Date.now(),
        status: 'pending',
        txHash: null
      };
      withdrawHistory.push(withdrawal);

      // 更新余额
      await chrome.storage.local.set({
        pendingAmount: pendingAmount - amount,
        withdrawHistory
      });

      console.log('提现记录已创建:', withdrawal);
      return withdrawal;
    } catch (error) {
      console.error('提现处理失败:', error);
      throw error;
    }
  }

  static async updateWithdrawal(amount, txHash) {
    try {
      console.log('更新提现记录...');
      
      // 获取提现历史
      const result = await chrome.storage.local.get(['withdrawHistory']);
      const withdrawHistory = result.withdrawHistory || [];

      // 找到对应的提现记录
      const withdrawal = withdrawHistory.find(w => 
        w.amount === amount && 
        w.status === 'pending' && 
        !w.txHash
      );

      if (withdrawal) {
        withdrawal.status = 'completed';
        withdrawal.txHash = txHash;
        await chrome.storage.local.set({ withdrawHistory });
        console.log('提现记录已更新:', withdrawal);
      }
    } catch (error) {
      console.error('更新提现记录失败:', error);
      throw error;
    }
  }

  static async refreshBalances() {
    try {
      console.log('刷新余额信息...');
      
      // 获取所有余额信息
      const result = await chrome.storage.local.get([
        'claims',
        'withdrawHistory'
      ]);

      // 计算已领取的总金额
      const claims = result.claims || [];
      let pendingAmount = claims.reduce((total, claim) => total + claim.amount, 0);
      
      // 减去所有已完成的提现
      const withdrawHistory = result.withdrawHistory || [];
      withdrawHistory.forEach(withdrawal => {
        if (withdrawal.status === 'completed') {
          pendingAmount -= withdrawal.amount;
        }
      });

      // 确保余额不会为负数
      pendingAmount = Math.max(0, pendingAmount);

      // 更新存储
      await chrome.storage.local.set({ pendingAmount });

      console.log('余额已刷新:', { pendingAmount });
      return { pendingAmount };
    } catch (error) {
      console.error('刷新余额失败:', error);
      throw error;
    }
  }
}

// 导出
window.BalanceManager = BalanceManager;
