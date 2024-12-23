import React from 'react';
import { Button, Card, CardContent, Typography } from '@mui/material';
import { ethers } from 'ethers';

const WalletConnect = ({ onConnect, setAccount }) => {
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          onConnect(true);
        }
      } else {
        alert('Please install MetaMask or another Web3 wallet!');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Connect Wallet
        </Typography>
        <Button
          variant="contained"
          onClick={connectWallet}
          startIcon={<span role="img" aria-label="wallet">👛</span>}
        >
          Connect Wallet
        </Button>
      </CardContent>
    </Card>
  );
};

export default WalletConnect;
