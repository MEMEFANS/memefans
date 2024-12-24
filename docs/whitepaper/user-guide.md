# User Guide

## Getting Started

### Installation

1. **Chrome Extension Installation**
   - Visit Chrome Web Store
   - Search for "MEMEFANS"
   - Click "Add to Chrome"
   - Complete installation

2. **Initial Setup**
   - Auto-generated SOL wallet
   - View wallet details
   - Backup private key
   - Basic settings

3. **Wallet Management**
   - **Built-in Wallet**
     * Automatic secure generation
     * View public address
     * Check balance
     * View transaction history
   
   - **Import/Export**
     * Export private key
     * Backup recovery phrase
     * Import existing wallet
     * Secure storage

### Basic Features

1. **Using on Twitter/X**
   ```
   Step 1: Visit Twitter/X
   Step 2: Find a tweet you want to interact with
   Step 3: Click extension icon
   Step 4: Create distribution for the tweet
   Step 5: Set distribution parameters
   ```

2. **Distribution Settings**
   - Amount per user
   - Total distribution amount
   - Distribution duration
   - Recipient limit

3. **View Status**
   - Distribution progress
   - Participant count
   - Remaining amount
   - Completion status

### Advanced Features

1. **Wallet Features**
   - Balance check
   - Transaction history
   - Token management
   - Backup options

2. **Distribution Types**
   - Fixed amount
   - Random amount
   - Time-based
   - Action-based

3. **Analytics**
   - Distribution stats
   - Engagement metrics
   - Success rate
   - Performance data

## User Journey

<div class="mermaid">
graph TD
    A[User Journey] -->|Start| B[Onboarding]
    A -->|Use| C[Platform Usage]
    A -->|Grow| D[User Growth]
    
    subgraph Onboarding
    B -->|Register| E[Registration]
    B -->|Setup| F[Profile Setup]
    B -->|Learn| G[Platform Guide]
    end
    
    subgraph Platform Usage
    C -->|Content| H[Content Interaction]
    C -->|Social| I[Social Features]
    C -->|Token| J[Token Usage]
    end
    
    subgraph User Growth
    D -->|Level| K[Level System]
    D -->|Reward| L[Reward System]
    D -->|Achieve| M[Achievements]
    end
    
    style A fill:#0000FF,color:#FFFFFF
    style B fill:#FFFF00,color:#000000
    style C fill:#90EE90,color:#000000
    style D fill:#DDA0DD,color:#000000
    style E fill:#FFB6C1,color:#000000
    style F fill:#FFA07A,color:#000000
    style G fill:#20B2AA,color:#000000
    style H fill:#BA55D3,color:#000000
    style I fill:#4682B4,color:#FFFFFF
    style J fill:#FF6347,color:#000000
    style K fill:#32CD32,color:#000000
    style L fill:#FF69B4,color:#000000
    style M fill:#DEB887,color:#000000
</div>

## Registration Flow

<div class="mermaid">
sequenceDiagram
    participant U as User
    participant R as Registration
    participant V as Verification
    participant S as System
    
    U->>R: Start Registration
    R->>V: Verify Information
    V-->>R: Verification Result
    R->>S: Create Account
    S-->>R: Account Created
    R-->>U: Welcome User
    
    Note over U,R: Registration Start
    Note over R,V: Verification
    Note over R,S: Account Creation
</div>

## Content Flow

<div class="mermaid">
graph TD
    A[Content System] -->|Create| B[Content Creation]
    A -->|Interact| C[Content Interaction]
    A -->|Manage| D[Content Management]
    
    subgraph Content Creation
    B -->|Upload| E[Content Upload]
    B -->|Edit| F[Content Editing]
    B -->|Publish| G[Content Publishing]
    end
    
    subgraph Content Interaction
    C -->|View| H[Content Viewing]
    C -->|Like| I[Content Liking]
    C -->|Comment| J[Content Commenting]
    end
    
    subgraph Content Management
    D -->|Organize| K[Organization]
    D -->|Monitor| L[Monitoring]
    D -->|Archive| M[Archiving]
    end
    
    style A fill:#0000FF,color:#FFFFFF
    style B fill:#FFFF00,color:#000000
    style C fill:#90EE90,color:#000000
    style D fill:#DDA0DD,color:#000000
    style E fill:#FFB6C1,color:#000000
    style F fill:#FFA07A,color:#000000
    style G fill:#20B2AA,color:#000000
    style H fill:#BA55D3,color:#000000
    style I fill:#4682B4,color:#FFFFFF
    style J fill:#FF6347,color:#000000
    style K fill:#32CD32,color:#000000
    style L fill:#FF69B4,color:#000000
    style M fill:#DEB887,color:#000000
</div>

## Token Usage Flow

<div class="mermaid">
graph TD
    A[Token Usage] -->|Earn| B[Token Earning]
    A -->|Spend| C[Token Spending]
    A -->|Manage| D[Token Management]
    
    subgraph Token Earning
    B -->|Create| E[Content Creation]
    B -->|Engage| F[Engagement]
    B -->|Refer| G[Referrals]
    end
    
    subgraph Token Spending
    C -->|Gift| H[Send Gifts]
    C -->|Subscribe| I[Subscriptions]
    C -->|Purchase| J[Purchases]
    end
    
    subgraph Token Management
    D -->|View| K[Balance View]
    D -->|Transfer| L[Transfers]
    D -->|History| M[Transaction History]
    end
    
    style A fill:#0000FF,color:#FFFFFF
    style B fill:#FFFF00,color:#000000
    style C fill:#90EE90,color:#000000
    style D fill:#DDA0DD,color:#000000
    style E fill:#FFB6C1,color:#000000
    style F fill:#FFA07A,color:#000000
    style G fill:#20B2AA,color:#000000
    style H fill:#BA55D3,color:#000000
    style I fill:#4682B4,color:#FFFFFF
    style J fill:#FF6347,color:#000000
    style K fill:#32CD32,color:#000000
    style L fill:#FF69B4,color:#000000
    style M fill:#DEB887,color:#000000
</div>

## Support Flow

<div class="mermaid">
graph TD
    A[Support System] -->|Help| B[Help Center]
    A -->|Ticket| C[Ticket System]
    A -->|FAQ| D[FAQ System]
    
    subgraph Help Center
    B -->|Guide| E[User Guide]
    B -->|Tutorial| F[Tutorials]
    B -->|Tips| G[Tips & Tricks]
    end
    
    subgraph Ticket System
    C -->|Create| H[Create Ticket]
    C -->|Track| I[Track Status]
    C -->|Resolve| J[Resolution]
    end
    
    subgraph FAQ System
    D -->|Browse| K[Browse FAQs]
    D -->|Search| L[Search FAQs]
    D -->|Update| M[FAQ Updates]
    end
    
    style A fill:#0000FF,color:#FFFFFF
    style B fill:#FFFF00,color:#000000
    style C fill:#90EE90,color:#000000
    style D fill:#DDA0DD,color:#000000
    style E fill:#FFB6C1,color:#000000
    style F fill:#FFA07A,color:#000000
    style G fill:#20B2AA,color:#000000
    style H fill:#BA55D3,color:#000000
    style I fill:#4682B4,color:#FFFFFF
    style J fill:#FF6347,color:#000000
    style K fill:#32CD32,color:#000000
    style L fill:#FF69B4,color:#000000
    style M fill:#DEB887,color:#000000
</div>

## Security Guide

### Account Security

1. **Wallet Protection**
   - Encrypted storage
   - Automatic backup
   - Recovery options
   - Security best practices

2. **Transaction Security**
   - Confirmation mechanism
   - Amount verification
   - Risk warnings
   - Emergency handling

3. **Privacy Protection**
   - No account linking required
   - Local data encryption
   - Secure key storage
   - Private interactions

### Best Practices

1. **Security Habits**
   - Regular key backup
   - Safe key storage
   - Careful verification
   - Transaction review

2. **Risk Prevention**
   - Key protection
   - Secure backup
   - Transaction verification
   - Emergency recovery

3. **Safety Guidelines**
   - Private key protection
   - Backup verification
   - Safe usage practices
   - Recovery procedures
