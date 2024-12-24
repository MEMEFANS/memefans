const express = require('express');
const { Connection, PublicKey } = require('@solana/web3.js');
const { Program } = require('@project-serum/anchor');
const { TwitterApi } = require('twitter-api-v2');

const app = express();
app.use(express.json());

// 初始化 Solana 连接
const connection = new Connection(process.env.SOLANA_RPC_URL);
const program = new Program(/* program config */);

// 初始化 Twitter API 客户端
const twitterClient = new TwitterApi(process.env.TWITTER_API_KEY);

// 验证推文互动
async function verifyInteractions(tweetId, userId, requirements) {
    const tweet = await twitterClient.v2.singleTweet(tweetId);
    
    if (requirements.like) {
        const liked = await twitterClient.v2.tweetLikedBy(tweetId, userId);
        if (!liked) return false;
    }
    
    if (requirements.retweet) {
        const retweeted = await twitterClient.v2.tweetRetweetedBy(tweetId, userId);
        if (!retweeted) return false;
    }
    
    return true;
}

// 处理领取请求
app.post('/api/claim', async (req, res) => {
    try {
        const { tweetId, userAddress, requirements } = req.body;
        
        // 验证互动要求
        const interactionsValid = await verifyInteractions(tweetId, req.body.userId, requirements);
        if (!interactionsValid) {
            return res.status(400).json({ error: '请先完成互动要求' });
        }
        
        // 检查是否可以领取
        const canClaim = await program.methods
            .canClaim(new PublicKey(userAddress), tweetId)
            .view();
            
        if (!canClaim) {
            return res.status(400).json({ error: '无法领取' });
        }
        
        // 记录领取
        const tx = await program.methods
            .recordClaim(new PublicKey(userAddress), tweetId)
            .rpc();
            
        res.json({ 
            success: true, 
            transaction: tx 
        });
        
    } catch (error) {
        console.error('领取失败:', error);
        res.status(500).json({ error: '领取失败' });
    }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
