# System Architecture

## Overview

### System Components

<div class="mermaid">
graph TD
    subgraph Frontend [Chrome Extension]
        A[User Interface] -->|Interact| B[Built-in Wallet]
        A -->|Monitor| C[Page Detection]
        B -->|Manage| D[Key Management]
        C -->|Process| E[Distribution Logic]
    end
    
    subgraph Backend [Backend Services]
        F[API Gateway] -->|Handle| G[Wallet Service]
        F -->|Process| H[Distribution Service]
        F -->|Track| I[Analytics Service]
        G -->|Cache| J[Redis]
        H -->|Store| K[PostgreSQL]
        I -->|Process| L[Queue Service]
    end
    
    subgraph Blockchain [Blockchain Layer]
        M[Smart Contracts] -->|Manage| N[Token Contract]
        M -->|Handle| O[Distribution Contract]
        M -->|Verify| P[Security Module]
    end
    
    Frontend -->|API Calls| Backend
    Backend -->|Transactions| Blockchain
</div>

### Data Flow

<div class="mermaid">
sequenceDiagram
    participant U as User
    participant E as Extension
    participant B as Backend
    participant C as Blockchain
    
    U->>E: Create Distribution
    E->>B: Validate Request
    B->>C: Check Balance
    C->>B: Balance OK
    B->>E: Request Approved
    E->>U: Sign Transaction
    U->>E: Confirm
    E->>C: Submit Transaction
    C->>B: Update Status
    B->>E: Success
    E->>U: Complete
</div>

## Component Details

### Chrome Extension

1. **Page Detection**
   ```typescript
   class PageDetector {
       // Detect Twitter/X page
       async detectPage(): Promise<TwitterPage> {
           const url = window.location.href;
           if (this.isTwitterPage(url)) {
               return this.analyzePage(url);
           }
           return null;
       }
       
       // Extract post info with engagement metrics
       async extractPostInfo(): Promise<PostInfo> {
           const elements = document.querySelectorAll('[data-testid="tweet"]');
           const postInfo = await this.parseElements(elements);
           return {
               ...postInfo,
               engagement: await this.getEngagementMetrics(postInfo.id),
               reach: await this.getReachEstimate(postInfo.id)
           };
       }
       
       // Monitor page changes
       private async monitorPageChanges(): Promise<void> {
           const observer = new MutationObserver(async (mutations) => {
               for (const mutation of mutations) {
                   if (this.isRelevantChange(mutation)) {
                       await this.handlePageChange(mutation);
                   }
               }
           });
           observer.observe(document.body, { childList: true, subtree: true });
       }
   }
   ```

2. **Wallet Management**
   ```typescript
   class WalletManager {
       // Generate new wallet with enhanced security
       async generateWallet(): Promise<SolanaWallet> {
           const entropy = await this.getSecureEntropy();
           const keyPair = await this.generateKeyPair(entropy);
           const wallet = await this.createWallet(keyPair);
           await this.setupAutoBackup(wallet);
           return wallet;
       }
       
       // Secure key management
       private async getSecureEntropy(): Promise<Uint8Array> {
           const random1 = crypto.getRandomValues(new Uint8Array(32));
           const random2 = await this.getHardwareEntropy();
           return this.mixEntropy(random1, random2);
       }
       
       // Automatic backup system
       private async setupAutoBackup(wallet: SolanaWallet): Promise<void> {
           const encrypted = await this.encryptWallet(wallet);
           await this.scheduleBackup(encrypted);
           await this.setupRecoveryOptions(wallet);
       }
   }
   ```

3. **Distribution Logic**
   ```typescript
   class DistributionManager {
       // Create distribution with validation
       async createDistribution(params: DistributionParams): Promise<Distribution> {
           // Validate parameters
           await this.validateParams(params);
           
           // Prepare distribution
           const wallet = await this.getWallet();
           const postInfo = await this.getPostInfo();
           const rules = await this.compileRules(params.rules);
           
           // Execute with retry mechanism
           return await this.executeWithRetry(async () => {
               const tx = await this.buildDistributionTx(wallet, postInfo, rules);
               const simulation = await this.simulateTransaction(tx);
               if (simulation.success) {
                   return await this.executeDistribution(tx);
               }
               throw new Error('Simulation failed');
           });
       }
       
       // Monitor distribution status
       async monitorDistribution(id: string): Promise<DistributionStatus> {
           const status = await this.getDistributionStatus(id);
           await this.updateAnalytics(status);
           await this.notifyStatusChange(status);
           return status;
       }
   }
   ```

### Backend Services

1. **API Gateway**
   ```typescript
   class APIGateway {
       // Route handler with rate limiting
       async handleRequest(req: Request): Promise<Response> {
           try {
               await this.checkRateLimit(req);
               await this.validateAuth(req);
               const result = await this.routeRequest(req);
               await this.logRequest(req, result);
               return result;
           } catch (error) {
               await this.handleError(error);
               throw error;
           }
       }
       
       // Load balancing
       private async routeRequest(req: Request): Promise<Response> {
           const service = await this.selectService(req);
           const response = await service.handle(req);
           await this.cacheResponse(req, response);
           return response;
       }
   }
   ```

2. **Distribution Service**
   ```typescript
   class DistributionService {
       // Process distribution request
       async processDistribution(req: DistributionRequest): Promise<void> {
           const session = await this.startTransaction();
           try {
               const validation = await this.validateRequest(req);
               const distribution = await this.createDistribution(req, validation);
               await this.notifyUsers(distribution);
               await session.commit();
           } catch (error) {
               await session.rollback();
               throw error;
           }
       }
       
       // Analytics tracking
       private async trackAnalytics(distribution: Distribution): Promise<void> {
           await this.updateStats(distribution);
           await this.generateReport(distribution);
           await this.notifyAdmin(distribution);
       }
   }
   ```

### Blockchain Layer

1. **Smart Contract System**
   ```solidity
   contract DistributionSystem {
       // Core distribution logic
       struct Distribution {
           address creator;
           uint256 amount;
           bytes32 rules;
           uint256 startTime;
           uint256 endTime;
           mapping(address => bool) claimed;
       }
       
       // Create distribution with validation
       function createDistribution(
           uint256 amount,
           bytes32 rules,
           uint256 duration
       ) external {
           require(amount > 0, "Invalid amount");
           require(duration > 0, "Invalid duration");
           
           uint256 startTime = block.timestamp;
           uint256 endTime = startTime + duration;
           
           distributions[nextDistributionId] = Distribution({
               creator: msg.sender,
               amount: amount,
               rules: rules,
               startTime: startTime,
               endTime: endTime
           });
           
           emit DistributionCreated(nextDistributionId, msg.sender, amount);
           nextDistributionId++;
       }
       
       // Claim with verification
       function claimDistribution(
           uint256 distributionId,
           bytes calldata proof
       ) external {
           Distribution storage dist = distributions[distributionId];
           require(block.timestamp >= dist.startTime, "Not started");
           require(block.timestamp <= dist.endTime, "Ended");
           require(!dist.claimed[msg.sender], "Already claimed");
           require(verifyProof(dist.rules, proof), "Invalid proof");
           
           dist.claimed[msg.sender] = true;
           token.transfer(msg.sender, dist.amount);
           
           emit DistributionClaimed(distributionId, msg.sender);
       }
   }
   ```

### Security Implementation

### Wallet Security

1. **Key Generation**
   ```typescript
   class KeyGenerator {
       // Generate key pair
       async generateKeyPair(): Promise<KeyPair> {
           const entropy = await this.getSecureEntropy();
           return this.createKeyPair(entropy);
       }
       
       // Create backup
       async createBackup(keyPair: KeyPair): Promise<string> {
           const mnemonic = await this.generateMnemonic(keyPair);
           return this.encryptMnemonic(mnemonic);
       }
   }
   ```

2. **Secure Storage**
   ```typescript
   class StorageManager {
       // Store private key
       async storePrivateKey(key: string): Promise<void> {
           const encrypted = await this.encrypt(key);
           return this.secureStore(encrypted);
       }
       
       // Retrieve private key
       async retrievePrivateKey(): Promise<string> {
           const encrypted = await this.secureRetrieve();
           return this.decrypt(encrypted);
       }
   }
   ```

### Page Security

1. **Content Detection**
   ```typescript
   class ContentDetector {
       // Verify page content
       async verifyContent(url: string): Promise<boolean> {
           const content = await this.getPageContent(url);
           return this.validateContent(content);
       }
       
       // Extract safe data
       async extractSafeData(content: any): Promise<SafeData> {
           return this.sanitizeData(content);
       }
   }
   ```

2. **Safe Interaction**
   ```typescript
   class SafeInteraction {
       // Safe DOM operation
       async safeOperation(operation: Operation): Promise<void> {
           const verified = await this.verifyOperation(operation);
           if (verified) {
               return this.executeOperation(operation);
           }
       }
       
       // Safe data extraction
       async safeExtraction(selector: string): Promise<Data> {
           const element = await this.findElement(selector);
           return this.extractData(element);
       }
   }
   ```

### Smart Contracts

1. **Distribution Contract**
   ```solidity
   contract Distribution {
       // Distribution data
       struct DistributionData {
           address creator;
           uint256 amount;
           uint256 recipientCount;
           uint256 endTime;
           bool active;
       }
       
       // Create distribution
       function createDistribution(
           uint256 amount,
           uint256 recipientCount,
           uint256 duration
       ) external {
           // Create new distribution
           // Transfer tokens
           // Set parameters
       }
       
       // Claim tokens
       function claim(uint256 distributionId) external {
           // Verify eligibility
           // Process claim
           // Update state
       }
   }
   ```

2. **Token Contract**
   ```solidity
   contract Token {
       // Token data
       string public name = "MEMEFANS";
       string public symbol = "MF";
       uint8 public decimals = 18;
       
       // Transfer tokens
       function transfer(
           address recipient,
           uint256 amount
       ) external returns (bool) {
           _transfer(msg.sender, recipient, amount);
           return true;
       }
       
       // Distribution transfer
       function distributionTransfer(
           address[] calldata recipients,
           uint256[] calldata amounts
       ) external returns (bool) {
           require(
               recipients.length == amounts.length,
               "Length mismatch"
           );
           
           for (uint i = 0; i < recipients.length; i++) {
               _transfer(msg.sender, recipients[i], amounts[i]);
           }
           
           return true;
       }
   }
   ```

## Security Implementation

### Wallet Security

1. **Key Generation**
   ```typescript
   class KeyGenerator {
       // Generate key pair
       async generateKeyPair(): Promise<KeyPair> {
           const entropy = await this.getSecureEntropy();
           return this.createKeyPair(entropy);
       }
       
       // Create backup
       async createBackup(keyPair: KeyPair): Promise<string> {
           const mnemonic = await this.generateMnemonic(keyPair);
           return this.encryptMnemonic(mnemonic);
       }
   }
   ```

2. **Secure Storage**
   ```typescript
   class StorageManager {
       // Store private key
       async storePrivateKey(key: string): Promise<void> {
           const encrypted = await this.encrypt(key);
           return this.secureStore(encrypted);
       }
       
       // Retrieve private key
       async retrievePrivateKey(): Promise<string> {
           const encrypted = await this.secureRetrieve();
           return this.decrypt(encrypted);
       }
   }
   ```

### Page Security

1. **Content Detection**
   ```typescript
   class ContentDetector {
       // Verify page content
       async verifyContent(url: string): Promise<boolean> {
           const content = await this.getPageContent(url);
           return this.validateContent(content);
       }
       
       // Extract safe data
       async extractSafeData(content: any): Promise<SafeData> {
           return this.sanitizeData(content);
       }
   }
   ```

2. **Safe Interaction**
   ```typescript
   class SafeInteraction {
       // Safe DOM operation
       async safeOperation(operation: Operation): Promise<void> {
           const verified = await this.verifyOperation(operation);
           if (verified) {
               return this.executeOperation(operation);
           }
       }
       
       // Safe data extraction
       async safeExtraction(selector: string): Promise<Data> {
           const element = await this.findElement(selector);
           return this.extractData(element);
       }
   }
   ```

### Smart Contracts

1. **Distribution Contract**
   ```solidity
   contract Distribution {
       // Distribution data
       struct DistributionData {
           address creator;
           uint256 amount;
           uint256 recipientCount;
           uint256 endTime;
           bool active;
       }
       
       // Create distribution
       function createDistribution(
           uint256 amount,
           uint256 recipientCount,
           uint256 duration
       ) external {
           // Create new distribution
           // Transfer tokens
           // Set parameters
       }
       
       // Claim tokens
       function claim(uint256 distributionId) external {
           // Verify eligibility
           // Process claim
           // Update state
       }
   }
   ```

2. **Token Contract**
   ```solidity
   contract Token {
       // Token data
       string public name = "MEMEFANS";
       string public symbol = "MF";
       uint8 public decimals = 18;
       
       // Transfer tokens
       function transfer(
           address recipient,
           uint256 amount
       ) external returns (bool) {
           _transfer(msg.sender, recipient, amount);
           return true;
       }
       
       // Distribution transfer
       function distributionTransfer(
           address[] calldata recipients,
           uint256[] calldata amounts
       ) external returns (bool) {
           require(
               recipients.length == amounts.length,
               "Length mismatch"
           );
           
           for (uint i = 0; i < recipients.length; i++) {
               _transfer(msg.sender, recipients[i], amounts[i]);
           }
           
           return true;
       }
   }
   ```
