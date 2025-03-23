import {
  AgentKit,
  CdpWalletProvider,
  wethActionProvider,
  walletActionProvider,
  erc20ActionProvider,
  cdpApiActionProvider,
  cdpWalletActionProvider,
  pythActionProvider,
  Network,
  ViemWalletProvider,
} from "@coinbase/agentkit";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { TelegramInterface } from "./telegram-interface.js";
import "reflect-metadata";
import { recallTestActionProvider } from "./action-providers/recall-test/index.js";
import { serviceMarketplaceActionProvider } from "./action-providers/service-marketplace/index.js";
import { erc20EscrowActionProvider } from "./action-providers/erc20-escrow/index.js";
import { otterAiActionProvider } from "./action-providers/otter-ai/index.js";
import { moderiaActionProvider } from "./action-providers/moderia/index.js";
import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient } from "viem";

dotenv.config();

/**
 * Validates that required environment variables are set
 *
 * @throws {Error} - If required environment variables are missing
 * @returns {void}
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  const requiredVars = [
    "OPENAI_API_KEY",
    "NETWORK_ID",
    "NETWORK_ID_2",
    "WALLET_PRIVATE_KEY"
  ];
  
  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error("Error: Required environment variables are not set");
    missingVars.forEach((varName) => {
      console.error(`${varName}=your_${varName.toLowerCase()}_here`);
    });
    process.exit(1);
  }

  // Validate network IDs
  const validNetworks = {
    NETWORK_ID: ["base-sepolia"],
    NETWORK_ID_2: ["base-mainnet", "base"] // Allow both forms
  };

  if (!validNetworks.NETWORK_ID.includes(process.env.NETWORK_ID!)) {
    console.error(`Error: NETWORK_ID must be: base-sepolia`);
    process.exit(1);
  }

  if (!validNetworks.NETWORK_ID_2.includes(process.env.NETWORK_ID_2!)) {
    console.error(`Error: NETWORK_ID_2 must be: base-mainnet or base`);
    process.exit(1);
  }

  console.log("Environment validated successfully");
  console.log(`Primary Network (Testnet): ${process.env.NETWORK_ID}`);
  console.log(`Secondary Network (Mainnet): ${process.env.NETWORK_ID_2}`);
}

// Add this right after imports and before any other code
validateEnvironment();

// Add this right after the validateEnvironment() call
console.log("Environment validated successfully");
console.log("Network ID:", process.env.NETWORK_ID || "base-sepolia");

async function selectNetwork(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nSelect network:");
  console.log("1. Base Sepolia (Testnet)");
  console.log("2. Base (Mainnet)");
  console.log("3. Recall Testnet");

  const answer = await new Promise<string>((resolve) => {
    rl.question("Enter your choice (1, 2, or 3): ", resolve);
  });
  
  rl.close();

  switch (answer.trim()) {
    case "1":
      return "base-sepolia";
    case "2":
      return "base-mainnet";
    case "3":
      return "recall-testnet";
    default:
      console.log("Invalid choice, defaulting to Base Sepolia");
      return "base-sepolia";
  }
}

/**
 * Initialize the agent with CDP Agentkit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  try {
    console.log("Initializing agent...");

    const selectedNetwork = await selectNetwork();
    console.log(`Selected network: ${selectedNetwork}`);

    const privateKey = process.env.WALLET_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error("Wallet private key not found in environment variables");
    }

    const selectedChain = selectedNetwork === "base-mainnet" ? base : baseSepolia;

    // Create Viem account and client
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    const transport = http(selectedChain.rpcUrls.default.http[0], {
      batch: true,
      fetchOptions: {},
      retryCount: 3,
      retryDelay: 100,
      timeout: 30_000,
    });

    const client = createWalletClient({
      account,
      chain: selectedChain,
      transport,
    });

    // Create Viem wallet provider
    const walletProvider = new ViemWalletProvider(client);

    // Initialize LLM
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    console.log("LLM initialized");

    // Initialize AgentKit with action providers
    const agentkit = await AgentKit.from({
      walletProvider,
      actionProviders: [
        wethActionProvider(),
        pythActionProvider(),
        walletActionProvider(),
        erc20ActionProvider(),
        recallTestActionProvider(),
        serviceMarketplaceActionProvider(),
        erc20EscrowActionProvider(),
        otterAiActionProvider(),
        moderiaActionProvider(),
      ],
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();
    const agentConfig = {
      configurable: { thread_id: "CDP AgentKit Chatbot Example!" },
    };

    const agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. 
        
        Current Network: ${selectedNetwork}
        
        Available Protocols:

        🔄 Recall Network - Decentralized Data Storage Protocol:
        - Create a Recall client for the testnet
        - Purchase credits on the Recall Network
        - Create buckets for data organization
        - Store, retrieve, and query data on the Recall Network
        - Check balance of Recall accounts
        - Store rich metadata with your data for enhanced discoverability

        🛒 Service Marketplace - Decentralized Service Platform:
        - Create and manage service listings with detailed metadata
        - Book services and specify requirements
        - Complete services with ratings and reviews
        - Process payments for services
        - Query available services with filters
        - Resolve disputes between service providers and clients

        💰 ERC20 Escrow - Secure Token Payment System:
        - Create escrow transactions for service payments (USDC)
        - Release funds to service providers upon completion
        - Refund clients if services fail to meet expectations
        - Check token balances
        - Track all transactions with detailed metadata
        - Ensure secure payment flows with verification

        🎙️ Otter AI - Service Analysis and Verification:
        - Join virtual meetings for service monitoring
        - Generate transcripts of service delivery
        - Analyze service quality against standards
        - Create summaries with action items
        - Authorize payments based on quality assessment
        - Store meeting data with searchable metadata

        🌟 ModerIA - Complete Digital Deal Mediator:
        - Orchestrate the entire service marketplace workflow
        - Handle network switching between Recall and Base Sepolia
        - Create and book services with rich metadata
        - Process secure escrow payments in USDC
        - Analyze service quality with AI tools
        - Generate comprehensive transaction records
        - Support demo mode for testing without real transactions
        - Run automated demonstrations of the complete workflow

        Important Network Information:
        - 📋 Recall Network works on its own testnet
        - ✅ Check network before operations
        - 💼 Verify balances and allowances
        - 📊 All data is stored in human-readable format with searchable metadata

        Recall Network Operations Guide:
        1. First create a Recall client:
           - "Create a Recall client on testnet"
        2. Purchase credits if needed:
           - "Purchase 0.01 ETH worth of Recall credits"
        3. Create a bucket for your data:
           - "Create a bucket named 'my-data'"
        4. Then you can store or retrieve data:
           - "Add object with key 'hello/world' and content 'hello world' to bucket 'my-data'"
           - "Query objects in bucket 'my-data' with prefix 'hello/'"
           - "Get object with key 'hello/world' from bucket 'my-data'"

        Service Marketplace Guide:
        1. Create a Recall client for the appropriate user type:
           - "Create a Recall client for provider on testnet"
        2. Create a service listing:
           - "Create a service listing for French teaching at $50 per hour"
        3. Query available services:
           - "Query available services for language teaching"
        4. Book a service:
           - "Book service XYZ with name 'John Smith'"
        5. Complete and rate a service:
           - "Record completion of booking ABC with rating 5"

        ERC20 Escrow Guide:
        1. Check token balances:
           - "Get USDC balance for wallet 0x123..."
        2. Create an escrow for a service:
           - "Create escrow transaction of 0.01 USDC for service XYZ"
        3. Release payment after verification:
           - "Release escrow ABC to provider after quality verification"
        4. Refund if needed:
           - "Refund escrow ABC to client due to service failure"

        Otter AI Guide:
        1. Join a service meeting:
           - "Join meeting with URL https://meet.google.com/abc-def-ghi"
        2. Generate transcript and analysis:
           - "Generate transcript and analysis for meeting ABC"
        3. Authorize payment based on quality:
           - "Authorize payment for booking ABC based on quality score"

        Example Commands:
        Recall Operations:
        - "Create a Recall client for testnet"
        - "Purchase 0.1 ETH worth of Recall credits"
        - "Create a bucket named 'user-data'"
        - "Add object with key 'profiles/alice' and content '{name: Alice, age: 30}' to bucket 'user-data'"
        - "Query objects in bucket 'user-data' with prefix 'profiles/'"
        - "Get object with key 'profiles/alice' from bucket 'user-data'"

        Service Marketplace:
        - "Create a client for provider on testnet"
        - "Create a service listing for Web Development at $75 per hour"
        - "Query available services for development"
        - "Book service service_12345 with name 'Alice Johnson'"
        - "Record completion of booking booking_12345 with rating 4"

        ERC20 Escrow:
        - "Create escrow of 0.01 USDC for service service_12345"
        - "Get details of escrow escrow_12345"
        - "Release escrow escrow_12345 to provider"
        - "Get token balance for wallet 0x123..."

        Otter AI:
        - "Join meeting at https://meet.google.com/abc-def-ghi"
        - "Generate transcript for meeting meeting_12345"
        - "Analyze service quality for booking booking_12345"
        - "Authorize payment based on quality analysis"

        Get the wallet details first to see what network you're on and what tokens are available.
        
        When responding to users, use emojis appropriately to enhance readability and engagement:
        - 🔄 For Recall Network operations
        - 🛒 For Service Marketplace activities
        - 💰 For ERC20 Escrow transactions
        - 🎙️ For Otter AI analysis
        - ✅ For successful operations
        - ❌ For failed operations
        - 📊 For data and statistics
        - 📋 For listings and details
      `,
    });

    console.log("Agent initialization complete");
    return { agent, config: agentConfig };
  } catch (error) {
    console.error("Failed to initialize agent:", error);
    throw error;
  }
}

/**
 * Run the agent autonomously with specified intervals
 */
async function runAutonomousMode(agent: any, config: any, interval = 10) {
  console.log("Starting autonomous mode...");

  while (true) {
    try {
      const thought =
        "Be creative and do something interesting on the blockchain. " +
        "Choose an action or set of actions and execute it that highlights your abilities.";

      const stream = await agent.stream(
        { messages: [new HumanMessage(thought)] },
        config,
      );

      let response = "";
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          response = chunk.agent.messages[0].content;
        } else if ("tools" in chunk && chunk.tools.messages.length > 0) {
          // Only append tool messages if they contain new information
          const toolMessage = chunk.tools.messages[0].content;
          if (!response.includes(toolMessage)) {
            response = toolMessage;
          }
        }
      }
      
      // Print the final response once
      console.log(response);
      console.log("-------------------");

      await new Promise((resolve) => setTimeout(resolve, interval * 1000));
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error:", error.message);
      }
      process.exit(1);
    }
  }
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream(
        { messages: [new HumanMessage(userInput)] },
        config,
      );

      let response = "";
      for await (const chunk of stream) {
        if ("agent" in chunk) {
          response = chunk.agent.messages[0].content;
        } else if ("tools" in chunk && chunk.tools.messages.length > 0) {
          // Only append tool messages if they contain new information
          const toolMessage = chunk.tools.messages[0].content;
          if (!response.includes(toolMessage)) {
            response = toolMessage;
          }
        }
      }
      
      // Print the final response once
      console.log(response);
      console.log("-------------------");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

/**
 * Run the Telegram interface mode
 */
async function runTelegramMode(agent: any, config: any) {
  console.log("Starting Telegram mode... Waiting for /start command");

  return new Promise<void>((resolve) => {
    const telegram = new TelegramInterface(agent, config, {
      onExit: () => {
        console.log("Exiting Telegram mode...");
        resolve();
      },
      onKill: () => {
        console.log("Kill command received. Shutting down...");
        process.exit(0);
      },
    });
  });
}

/**
 * Choose whether to run in autonomous, chat, or telegram mode
 */
async function chooseMode(): Promise<"chat" | "auto" | "telegram"> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    console.log("\nAvailable modes:");
    console.log("1. chat      - Interactive chat mode");
    console.log("2. telegram  - Telegram bot mode");
    console.log("3. auto      - Autonomous action mode");

    const choice = (await question("\nChoose a mode (enter number or name): "))
      .toLowerCase()
      .trim();

    rl.close();

    if (choice === "1" || choice === "chat") {
      return "chat";
    } else if (choice === "2" || choice === "telegram") {
      return "telegram";
    } else if (choice === "3" || choice === "auto") {
      return "auto";
    }
    console.log("Invalid choice. Please try again.");
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Starting initialization...");
    const { agent, config } = await initializeAgent();
    console.log("Agent initialized successfully");

    while (true) {
      const mode = await chooseMode();
      console.log(`Selected mode: ${mode}`);

      if (mode === "chat") {
        await runChatMode(agent, config);
      } else if (mode === "telegram") {
        await runTelegramMode(agent, config);
      } else {
        await runAutonomousMode(agent, config);
      }

      // After any mode exits, we'll loop back to mode selection
      console.log("\nReturning to mode selection...");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Fatal error:", error.message);
    }
    process.exit(1);
  }
}

main();
