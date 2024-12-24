import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';
import Header from './components/Header';
import WalletConnect from './components/WalletConnect';
import GiveawayForm from './components/GiveawayForm';
import TwitterConnect from './components/TwitterConnect';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1DA1F2', // Twitter blue
    },
  },
});

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);
  const [account, setAccount] = useState(null);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <Header 
          walletConnected={walletConnected} 
          twitterConnected={twitterConnected}
          account={account}
        />
        
        <Box sx={{ p: 3 }}>
          <WalletConnect 
            onConnect={setWalletConnected}
            setAccount={setAccount}
          />
          
          <TwitterConnect 
            onConnect={setTwitterConnected}
          />
          
          {walletConnected && twitterConnected && (
            <GiveawayForm 
              account={account}
            />
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
