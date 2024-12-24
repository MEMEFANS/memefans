import React from 'react';
import { Button, Card, CardContent, Typography } from '@mui/material';
import TwitterIcon from '@mui/icons-material/Twitter';

const TwitterConnect = ({ onConnect }) => {
  const connectTwitter = async () => {
    try {
      // 这里将来需要实现Twitter OAuth认证
      // 目前先模拟连接成功
      onConnect(true);
    } catch (error) {
      console.error('Error connecting Twitter:', error);
      alert('Failed to connect Twitter. Please try again.');
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Connect Twitter
        </Typography>
        <Button
          variant="contained"
          onClick={connectTwitter}
          startIcon={<TwitterIcon />}
          sx={{ backgroundColor: '#1DA1F2' }}
        >
          Connect Twitter
        </Button>
      </CardContent>
    </Card>
  );
};

export default TwitterConnect;
