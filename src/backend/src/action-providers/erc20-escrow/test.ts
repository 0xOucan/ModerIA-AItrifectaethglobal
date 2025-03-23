import { ERC20EscrowActionProvider } from "./erc20EscrowActionProvider.js";
import { ViemWalletProvider } from "@coinbase/agentkit";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createWalletClient, parseUnits, formatUnits, http } from "viem";
import * as constants from "./constants.js";
import 'dotenv/config';
import chalk from 'chalk';

// Demo flag - Set to true to run in simulation mode without real transactions
const DEMO_MODE = process.env.DEMO_MODE === "true";

// ANSI color codes for terminal output
const colors = {
  primary: chalk.hex('#3498db'),
  secondary: chalk.hex('#2ecc71'),
  warning: chalk.hex('#f39c12'),
  error: chalk.hex('#e74c3c'),
  info: chalk.hex('#9b59b6'),
  success: chalk.green,
  highlight: chalk.yellow.bold,
  dim: chalk.gray,
  header: chalk.bgBlue.white.bold,
  section: chalk.bgCyan.black,
  link: chalk.blue.underline,
  json: chalk.cyan,
  reset: chalk.reset
};

// Helper functions for formatting output
function printHeader(text: string): void {
  console.log("\n" + colors.header(`================================================================================`));
  console.log(colors.header(`>> ${text}`));
  console.log(colors.header(`================================================================================`));
  console.log();
}

function printSection(text: string): void {
  console.log("\n" + colors.section(` ${text} `));
  console.log(colors.section(`${"─".repeat(text.length + 2)}`));
  console.log();
}

function formatPortalLink(publicKey?: string, bucketId?: string, objectKey?: string): string {
  if (!publicKey) return colors.error("Public key not available");
  
  let url = `https://testnet.recall.network/0x${publicKey}`;
  if (bucketId) url += `/${bucketId}`;
  if (objectKey) url += `/${objectKey}`;
  
  return colors.link(url);
}

function formatExplorerLink(txHash: string): string {
  return colors.link(`${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${txHash}`);
}

function formatTokenAddress(address: string): string {
  return colors.link(`${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/token/${address}`);
}

function printJsonData(data: any): void {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.log(data);
      return;
    }
  }
  console.log(colors.json(JSON.stringify(data, null, 2)));
}

// Main function
async function main() {
  try {
    // Check if required environment variables exist
    if (!process.env.WALLET_PRIVATE_KEY_AGENT || 
        !process.env.WALLET_PRIVATE_KEY_PROVIDER || 
        !process.env.WALLET_PRIVATE_KEY_CLIENT) {
      console.error(colors.error("Missing required private keys in .env file. Please check .env.example for the required variables."));
      process.exit(1);
    }

    printHeader("ERC20 ESCROW ACTION PROVIDER TEST");

    if (DEMO_MODE) {
      printHeader("NOTE: Running in DEMO mode - no real transactions will be executed");
    }

    printSection("Initializing ERC20EscrowActionProvider");
    const actionProvider = new ERC20EscrowActionProvider();
    console.log(colors.success("✓ Action provider initialized"));

    // Create wallet accounts for simulation/display
    const agentAccount = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY_AGENT as `0x${string}`);
    const providerAccount = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY_PROVIDER as `0x${string}`);
    const clientAccount = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY_CLIENT as `0x${string}`);

    // Display wallet addresses
    console.log("\n" + colors.primary("Wallet Addresses:"));
    console.log(colors.info(`Agent:    ${agentAccount.address}`));
    console.log(colors.info(`Provider: ${providerAccount.address}`));
    console.log(colors.info(`Client:   ${clientAccount.address}`));

    // Display USDC token address
    console.log("\n" + colors.primary("USDC Token Contract:"));
    console.log(colors.info(`Address: ${formatTokenAddress(constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA)}`));

    // Step 1: Check token balances
    printSection("1. Checking USDC Balances");
    
    if (!DEMO_MODE) {
      // Get actual balances
      const agentBalance = await actionProvider.getTokenBalance({ 
        walletAddress: agentAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA
      });
      
      const providerBalance = await actionProvider.getTokenBalance({ 
        walletAddress: providerAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA
      });
      
      const clientBalance = await actionProvider.getTokenBalance({ 
        walletAddress: clientAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA
      });
      
      console.log(colors.info(`Agent Balance:    ${agentBalance}`));
      console.log(colors.info(`Provider Balance: ${providerBalance}`));
      console.log(colors.info(`Client Balance:   ${clientBalance}`));
    } else {
      // Simulate balances in demo mode
      console.log(colors.info(`Agent Balance:    ${colors.highlight("1.25 USDC")} (simulated)`));
      console.log(colors.info(`Provider Balance: ${colors.highlight("0.50 USDC")} (simulated)`));
      console.log(colors.info(`Client Balance:   ${colors.highlight("5.00 USDC")} (simulated)`));
    }

    // Step 2: Create an escrow for a service
    printSection("2. Creating Escrow for Service");
    console.log(colors.info(`Client transfers 0.01 USDC to Agent as escrow payment`));
    
    const serviceId = `service_${Date.now()}`;
    let escrowResult;
    let escrowId;
    
    if (!DEMO_MODE) {
      // Create actual escrow
      escrowResult = await actionProvider.createEscrow({
        clientAddress: clientAccount.address,
        agentAddress: agentAccount.address,
        providerAddress: providerAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA,
        amount: constants.DEFAULT_ESCROW_AMOUNT,
        serviceId: serviceId,
        metadata: {
          "service-type": "language-learning",
          "service-duration": "30 minutes",
          "service-date": new Date().toISOString(),
          "provider-name": "French Lessons Pro",
          "client-name": "Language Student"
        }
      });
      
      const escrowData = JSON.parse(escrowResult);
      escrowId = escrowData.escrowId;
      
      console.log(colors.success(`✓ Escrow created with ID: ${colors.highlight(escrowId)}`));
      console.log(colors.info(`Transaction Hash: ${formatExplorerLink(escrowData.transactionHash)}`));
      console.log(colors.info(`Portal Link: ${formatPortalLink(undefined, constants.ESCROW_TRANSACTIONS_BUCKET_ID, escrowId)}`));
    } else {
      // Simulate escrow creation
      escrowId = `escrow_${Date.now()}_demo`;
      const simulatedTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      const simulatedResult = {
        success: true,
        message: `Escrow created successfully. ${constants.DEFAULT_ESCROW_AMOUNT} USDC transferred from client to agent.`,
        escrowId: escrowId,
        transactionHash: simulatedTxHash,
        transactionLink: `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${simulatedTxHash}`,
        status: constants.EscrowStatus.PENDING
      };
      
      escrowResult = JSON.stringify(simulatedResult, null, 2);
      
      console.log(colors.success(`✓ Escrow created with ID: ${colors.highlight(escrowId)} (simulated)`));
      console.log(colors.info(`Transaction Hash: ${formatExplorerLink(simulatedTxHash)}`));
      console.log(colors.info(`Portal Link: ${formatPortalLink("demo_public_key", constants.ESCROW_TRANSACTIONS_BUCKET_ID, escrowId)}`));
    }

    // Step 3: Check escrow details
    printSection("3. Checking Escrow Details");
    
    let escrowDetails;
    if (!DEMO_MODE) {
      // Get actual escrow details
      escrowDetails = await actionProvider.getEscrowDetails({
        escrowId: escrowId
      });
      
      console.log(colors.info("Escrow Details:"));
      printJsonData(escrowDetails);
    } else {
      // Simulate escrow details
      const simulatedDetails = {
        success: true,
        message: "Escrow details retrieved successfully",
        data: {
          id: escrowId,
          clientAddress: clientAccount.address,
          agentAddress: agentAccount.address,
          providerAddress: providerAccount.address,
          tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA,
          amount: constants.DEFAULT_ESCROW_AMOUNT,
          serviceId: serviceId,
          status: constants.EscrowStatus.PENDING,
          clientTxHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            "service-type": "language-learning",
            "service-duration": "30 minutes",
            "service-date": new Date().toISOString(),
            "provider-name": "French Lessons Pro",
            "client-name": "Language Student"
          }
        },
        portalLink: `https://testnet.recall.network/0xdemo_public_key/${constants.ESCROW_TRANSACTIONS_BUCKET_ID}/${escrowId}`
      };
      
      escrowDetails = JSON.stringify(simulatedDetails, null, 2);
      
      console.log(colors.info("Escrow Details (simulated):"));
      printJsonData(escrowDetails);
    }

    // Step 4: Simulate service completion (e.g., Otter AI analysis)
    printSection("4. Service Completed - Otter AI Analysis");
    
    console.log(colors.info("Otter AI completed the language learning session analysis:"));
    console.log(colors.success("✓ Quality score: 8.5/10"));
    console.log(colors.success("✓ Quality threshold passed"));
    console.log(colors.success("✓ Student engagement: 9/10"));
    console.log(colors.success("✓ Learning objectives met: 4/5"));
    console.log();
    console.log(colors.primary("Based on the positive analysis, payment can be released to the provider."));

    // Step 5: Release escrow to provider
    printSection("5. Releasing Escrow to Provider");
    console.log(colors.info(`Agent transfers 0.01 USDC to Provider as payment for completed service`));
    
    let releaseResult;
    if (!DEMO_MODE) {
      // Release actual escrow
      releaseResult = await actionProvider.releaseEscrow({
        escrowId: escrowId,
        reason: "Service completed successfully with quality score 8.5/10"
      });
      
      const releaseData = JSON.parse(releaseResult);
      
      console.log(colors.success(`✓ Escrow released successfully`));
      console.log(colors.info(`Transaction Hash: ${formatExplorerLink(releaseData.transactionHash)}`));
      console.log(colors.info(`Portal Link: ${formatPortalLink(undefined, constants.ESCROW_TRANSACTIONS_BUCKET_ID, escrowId)}`));
    } else {
      // Simulate escrow release
      const simulatedTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      const simulatedResult = {
        success: true,
        message: `Escrow released successfully. ${constants.DEFAULT_ESCROW_AMOUNT} USDC transferred from agent to provider.`,
        escrowId: escrowId,
        transactionHash: simulatedTxHash,
        transactionLink: `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${simulatedTxHash}`,
        status: constants.EscrowStatus.RELEASED
      };
      
      releaseResult = JSON.stringify(simulatedResult, null, 2);
      
      console.log(colors.success(`✓ Escrow released successfully (simulated)`));
      console.log(colors.info(`Transaction Hash: ${formatExplorerLink(simulatedTxHash)}`));
      console.log(colors.info(`Portal Link: ${formatPortalLink("demo_public_key", constants.ESCROW_TRANSACTIONS_BUCKET_ID, escrowId)}`));
    }

    // Step 6: Check updated escrow details
    printSection("6. Checking Updated Escrow Details");
    
    if (!DEMO_MODE) {
      // Get actual updated escrow details
      const updatedEscrowDetails = await actionProvider.getEscrowDetails({
        escrowId: escrowId
      });
      
      console.log(colors.info("Updated Escrow Details:"));
      printJsonData(updatedEscrowDetails);
    } else {
      // Simulate updated escrow details
      const simulatedUpdatedDetails = {
        success: true,
        message: "Escrow details retrieved successfully",
        data: {
          id: escrowId,
          clientAddress: clientAccount.address,
          agentAddress: agentAccount.address,
          providerAddress: providerAccount.address,
          tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA,
          amount: constants.DEFAULT_ESCROW_AMOUNT,
          serviceId: serviceId,
          status: constants.EscrowStatus.RELEASED,
          clientTxHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          releaseTxHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            "service-type": "language-learning",
            "service-duration": "30 minutes",
            "service-date": new Date(Date.now() - 3600000).toISOString(),
            "provider-name": "French Lessons Pro",
            "client-name": "Language Student",
            "release_reason": "Service completed successfully with quality score 8.5/10"
          }
        },
        portalLink: `https://testnet.recall.network/0xdemo_public_key/${constants.ESCROW_TRANSACTIONS_BUCKET_ID}/${escrowId}`
      };
      
      console.log(colors.info("Updated Escrow Details (simulated):"));
      printJsonData(simulatedUpdatedDetails);
    }

    // Step 7: Check final balances
    printSection("7. Checking Final USDC Balances");
    
    if (!DEMO_MODE) {
      // Get actual final balances
      const finalAgentBalance = await actionProvider.getTokenBalance({ 
        walletAddress: agentAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA
      });
      
      const finalProviderBalance = await actionProvider.getTokenBalance({ 
        walletAddress: providerAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA
      });
      
      const finalClientBalance = await actionProvider.getTokenBalance({ 
        walletAddress: clientAccount.address,
        tokenAddress: constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA
      });
      
      console.log(colors.info(`Agent Final Balance:    ${finalAgentBalance}`));
      console.log(colors.info(`Provider Final Balance: ${finalProviderBalance}`));
      console.log(colors.info(`Client Final Balance:   ${finalClientBalance}`));
    } else {
      // Simulate final balances
      console.log(colors.info(`Agent Final Balance:    ${colors.highlight("1.25 USDC")} (unchanged, simulated)`));
      console.log(colors.info(`Provider Final Balance: ${colors.highlight("0.51 USDC")} (+0.01, simulated)`));
      console.log(colors.info(`Client Final Balance:   ${colors.highlight("4.99 USDC")} (-0.01, simulated)`));
    }

    printHeader("TEST COMPLETED SUCCESSFULLY");

  } catch (error) {
    console.error(colors.error(`\nError: ${(error as Error).message}`));
    console.error(colors.error((error as Error).stack || ''));
    process.exit(1);
  }
}

// Run main function
main(); 