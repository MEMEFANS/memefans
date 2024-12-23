# Twitter Token Plugin

A Chrome extension that enables automated token giveaways on Twitter through Solana smart contracts.

![Plugin Demo](images/screenshots/demo.png)

## Features

- **Twitter Integration**
  - Automatic interaction verification (likes, retweets)
  - Real-time status updates
  - Support for both Twitter.com and X.com

- **Solana Integration**
  - Built-in wallet connection
  - Secure token claiming
  - Transaction history tracking
  - Custom token support

- **Security**
  - Non-custodial wallet integration
  - Smart contract-based verification
  - Open source code
  - Regular security audits

## Installation

### For Users
1. Install from [Chrome Web Store](https://chrome.google.com/webstore/detail/twitter-token-plugin)
2. Click the extension icon
3. Connect your Twitter account
4. Connect your Solana wallet

### For Developers
1. Clone the repository
```bash
git clone https://github.com/twitter-token-plugin/twitter-token-plugin.git
cd twitter-token-plugin
```

2. Install dependencies
```bash
npm install
```

3. Build the extension
```bash
npm run build
```

4. Load in Chrome
- Open `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked"
- Select the `build` directory

## Smart Contract

The giveaway smart contract is built using the Anchor framework:
- Program ID: [To be updated after deployment]
- [View on Solana Explorer](https://explorer.solana.com)

### Contract Features
- Token giveaway creation
- Automatic verification
- Secure claiming process
- Admin withdrawal
- Custom token support

## Configuration

1. Twitter API
- Requires Basic tier or higher
- Set up API keys in `config.js`

2. Solana Network
- Default: Mainnet
- Configure RPC endpoint in `config.js`

## Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Security

- Report vulnerabilities to security@twitter-token-plugin.com
- DO NOT create public issues for security problems

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- [Documentation](docs/README.md)
- [Support Guide](SUPPORT.md)
- [GitHub Issues](https://github.com/twitter-token-plugin/issues)
- Email: support@twitter-token-plugin.com

## Acknowledgments

- Solana Foundation
- Anchor Framework
- Twitter API Team
