import React from 'react';
import { AppBar, Toolbar, Typography, Box, Chip } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TwitterIcon from '@mui/icons-material/Twitter';

const Header = ({ walletConnected, twitterConnected, account }) => {
  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Token Giveaway
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            icon={<TwitterIcon />}
            label={twitterConnected ? "Twitter Connected" : "Twitter Disconnected"}
            color={twitterConnected ? "success" : "default"}
          />
          
          <Chip
            icon={<AccountBalanceWalletIcon />}
            label={walletConnected ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Wallet Disconnected"}
            color={walletConnected ? "success" : "default"}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
