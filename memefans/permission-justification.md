# Permission Justification

## Storage Permission
The `storage` permission is required to:
- Store user wallet addresses securely
- Save user preferences and settings
- Cache token balances for better performance
- Maintain transaction history
- Store Twitter authentication status

## ActiveTab Permission
The `activeTab` permission is required to:
- Detect when user is viewing a Twitter post
- Read tweet information for giveaway verification
- Inject claim buttons on eligible tweets
- Verify user interactions (likes, retweets) with tweets

## Scripting Permission
The `scripting` permission is required to:
- Inject claim buttons dynamically on Twitter posts
- Update UI elements based on user interactions
- Execute wallet connection scripts
- Handle token claiming transactions
- Manage real-time balance updates

## Tabs Permission
The `tabs` permission is required to:
- Monitor Twitter tab status for giveaway verification
- Handle wallet connection popups
- Manage authentication windows
- Coordinate between different extension components

## Host Permissions

### https://twitter.com/* and https://x.com/*
These host permissions are required to:
- Detect and verify Twitter interactions
- Add claim buttons to eligible tweets
- Monitor user engagement with giveaway posts
- Verify tweet authenticity
- Support both Twitter.com and X.com domains

### https://api.twitter.com/*
This host permission is required to:
- Verify tweet interactions through Twitter API
- Validate user engagement (likes, retweets)
- Fetch tweet metadata
- Ensure giveaway eligibility

All these permissions are essential for the core functionality of the Twitter Token Plugin, ensuring secure and seamless token giveaway operations while maintaining user privacy and security standards.
