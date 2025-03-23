# 🌟 Moderia AI - Digital Deal Mediator

Moderia is an AI agent that mediates digital deals between service providers and clients, powered by Recall Network's secure data storage.

> "Modern mediator for digital deals"

## 🌐 Core Concept

Moderia creates a secure marketplace where:

- Service providers list their availabilities and services
- Clients browse and book services
- The AI agent mediates the entire process
- Payments are held in escrow until successful completion
- The agent joins calls to take notes and mediate disputes

## 🔐 Secure Data Storage with Recall Network

The platform uses Recall Network for secure, decentralized data storage:

- Service listings are securely stored with rich metadata
- Bookings and transaction history are tracked
- Meeting data and quality assessments are preserved
- Payment records and escrow transactions are immutable
- Review data and dispute information is securely managed

## 💰 Payment Processing with ERC20 Escrow

The platform uses a secure escrow system for USDC token payments:

- Client funds are held in escrow by the agent
- Payment is only released after service verification
- Otter AI analyzes service quality to authorize payments
- All transactions are recorded on Base Sepolia blockchain
- Complete transparency with transaction history

## 🎙️ Service Quality Verification with Otter AI

The platform uses AI to monitor and verify service quality:

- AI joins service delivery calls (like Google Meet)
- Generates detailed transcripts of conversations
- Creates summaries with action items and keywords
- Analyzes service quality against predefined metrics
- Recommends payment authorization based on quality scores
- Provides valuable feedback for service improvement

## 📊 Database Schema

### Service Collection
- Provider information
- Service details
- Availability
- Pricing information

### Booking Collection
- Service and client references
- Booking details
- Payment information
- Status tracking

### Review Collection
- Service ratings
- Client feedback
- Provider responses
- Dispute information

### Transaction Collection
- Escrow details
- Payment records
- Token transfers
- Transaction status

### Meeting Collection
- Transcript data
- Quality analysis
- Summary information
- Action items
- Approval status

## 🤖 Mediation Features

### Service Management
- List and discover available services
- Real-time availability tracking
- Automatic scheduling

### Payment Handling
- Secure USDC token escrow on Base Sepolia
- Release upon quality verification
- Dispute resolution with partial refunds
- Complete transaction history

### Meeting Participation
- AI joins service calls
- Takes objective notes
- Records key points for potential disputes
- Ensures quality standards

### Dispute Resolution
- Review meeting notes
- Compare against service claims
- Issue fair judgments
- Handle compensation when necessary

## 🚀 Operating Modes

The agent supports four operating modes:

1. **💬 Chat Mode**: Interactive command-line interface for direct user interaction
2. **🤖 Autonomous Mode**: Bot operates independently, checking for disputes or upcoming bookings
3. **📱 Telegram Mode**: Interface through Telegram messenger
4. **🎮 Demo Mode**: Run a guided demonstration of Moderia's capabilities

### 🎮 Demo Mode
The demo mode walks you through a complete service lifecycle:
- Creating a new service
- Browsing available services
- Booking a service
- Generating meeting links
- Completing bookings with reviews
- Handling disputes

You can access demo mode in two ways:
- Terminal: Select "demo" or "4" when choosing a mode
- Telegram: Use the `/demo` command

## 🛠️ Environment Setup

Required environment variables:
```
OPENAI_API_KEY=your_openai_api_key_here
NETWORK_ID=base-sepolia
NETWORK_ID_2=base-mainnet
RECALL_NETWORK="testnet"

# Wallet Private Keys
WALLET_PRIVATE_KEY=your_wallet_private_key_here
WALLET_PRIVATE_KEY_AGENT=your_agent_wallet_private_key_here
WALLET_PRIVATE_KEY_PROVIDER=your_provider_wallet_private_key_here
WALLET_PRIVATE_KEY_CLIENT=your_client_wallet_private_key_here

# Optional for Telegram
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Nillion DB Configuration
SV_ORG_DID=your_organization_did_here
SV_PRIVATE_KEY=your_secret_vault_private_key_here
SV_PUBLIC_KEY=your_secret_vault_public_key_here

SV_NODE1_URL=your_node1_url_here
SV_NODE1_DID=your_node1_did_here
SV_NODE2_URL=your_node2_url_here
SV_NODE2_DID=your_node2_did_here
SV_NODE3_URL=your_node3_url_here
SV_NODE3_DID=your_node3_did_here

SCHEMA_ID_SERVICE=your_schema_id_here
SCHEMA_ID_BOOKING=your_schema_id_here
SCHEMA_ID_REVIEW=your_schema_id_here
```

## 🚀 Getting Started

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies with `npm install`
4. Build the project with `npm run build`
5. Start the agent with `npm start`

## 🔄 Workflow Example

1. **🛒 Service Listing**: 
   - Provider creates service (e.g., French lesson on Monday at 3PM)
   - Details stored in Recall Network with rich metadata
   - Service appears in the marketplace with pricing and requirements

2. **💼 Discovery & Booking**:
   - Client searches for available services
   - Books and pays for chosen service (0.01 USDC)
   - Payment held in escrow on Base Sepolia
   - Meeting link generated and sent to both parties

3. **🤝 Service Delivery**:
   - Moderia sends reminders to both parties
   - Otter AI joins the call to monitor quality
   - Service is delivered between provider and client
   - AI records transcript and creates summary

4. **📊 Quality Assessment**:
   - Otter AI analyzes call quality
   - Generates transcript and summary with action items
   - Evaluates based on predetermined metrics (engagement, objectives met, etc.)
   - Recommends payment authorization with a quality score

5. **💰 Payment Processing**:
   - Upon positive quality assessment (score above threshold)
   - Agent releases escrow to provider through ERC20 transfer
   - Transaction recorded with quality metrics in metadata
   - Provider receives USDC payment in their wallet

6. **⭐ Feedback & Reviews**:
   - Client can submit ratings and reviews
   - Provider can respond to feedback
   - All review data stored with transaction history
   - Service reputation updated accordingly

7. **⚖️ Dispute Resolution** (if needed):
   - Agent reviews meeting transcript and quality assessment
   - Makes fair judgment based on evidence
   - Issues appropriate compensation (full/partial refund)
   - Updates transaction status and notifies parties

## 📝 Development

To extend Moderia's capabilities:
1. Update the relevant action provider in `src/backend/src/action-providers/`
2. Add new schemas if needed
3. Update environment variables accordingly
4. Test thoroughly before deployment

## 🧪 Testing

### 🛒 Service Marketplace Test
```
node src/backend/dist/action-providers/service-marketplace/test.js
```

### 💰 ERC20 Escrow Test
```
node src/backend/dist/action-providers/erc20-escrow/test.js
```

To run in demo mode without blockchain transactions:
```
DEMO_MODE=true node src/backend/dist/action-providers/erc20-escrow/test.js
```

### 🎙️ Otter AI Test
```
node src/backend/dist/action-providers/otter-ai/test.js
```

### 🔄 Recall Network Test
```
node src/backend/dist/action-providers/recall-test/test.js
```

## 📋 License

MIT

## 📝 Available Commands

### Terminal Mode
- `exit`: Return to mode selection
- `help`: Display help information
- Natural language commands for all actions

### Telegram Commands
**Basic Commands:**
- `/start`: Initialize the bot
- `/menu`: Show all available commands
- `/help`: Get detailed help
- `/demo`: Run demo sequence
- `/exit`: Return to terminal
- `/kill`: Shut down application

**Service Provider Actions:**
- Create a new service
- Update service details
- List my services
- Set availability

**Client Actions:**
- Find services
- Book a service
- View my bookings
- Cancel booking

**Payment & Reviews:**
- Complete booking
- Leave review
- Check payment status

**Support & Disputes:**
- Report issue
- Open dispute
- Contact support

💡 All actions support natural language input - just describe what you want to do!
