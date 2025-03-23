import { CreateAction } from "@coinbase/agentkit";
import { ActionProvider, WalletProvider, Network } from "@coinbase/agentkit";
import { ViemWalletProvider } from "@coinbase/agentkit";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createWalletClient, parseUnits, formatUnits, BaseError, Chain, http } from "viem";
import { z } from "zod";
import * as constants from "./constants.js";
import {
  CreateEscrowSchema,
  ReleaseEscrowSchema,
  RefundEscrowSchema,
  GetTokenBalanceSchema,
  GetEscrowDetailsSchema,
  GetAllEscrowTransactionsSchema,
  TransferTokensSchema,
  EscrowTransaction,
  CreateEscrowInput,
  ReleaseEscrowInput,
  RefundEscrowInput,
  GetTokenBalanceInput,
  GetEscrowDetailsInput,
  GetAllEscrowTransactionsInput,
  TransferTokensInput
} from "./schemas.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * ERC20EscrowActionProvider - Handles USDC transfers and escrow functionality on Base Sepolia
 */
export class ERC20EscrowActionProvider extends ActionProvider<ViemWalletProvider> {
  private agentClient: any = null;
  private providerClient: any = null;
  private clientClient: any = null;
  private escrowTransactionsBucketId = constants.ESCROW_TRANSACTIONS_BUCKET_ID;
  private demoMode = process.env.DEMO_MODE === "true";
  private storagePath = path.join(process.cwd(), "temp_storage");

  constructor() {
    super("erc20-escrow", []);
  }

  /**
   * Initialize the wallet clients and recall client
   */
  private async initClients(): Promise<void> {
    if (this.demoMode) {
      console.log("Running in demo mode - wallet clients initialized with dummy values");
      this.agentClient = { account: { address: "0xagent" } };
      this.providerClient = { account: { address: "0xprovider" } };
      this.clientClient = { account: { address: "0xclient" } };
      return;
    }

    if (!process.env.WALLET_PRIVATE_KEY_AGENT || 
        !process.env.WALLET_PRIVATE_KEY_PROVIDER || 
        !process.env.WALLET_PRIVATE_KEY_CLIENT) {
      throw new Error("Missing wallet private keys in environment variables");
    }

    // Create wallet clients for agent, provider, and client
    const agentAccount = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY_AGENT as `0x${string}`);
    const providerAccount = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY_PROVIDER as `0x${string}`);
    const clientAccount = privateKeyToAccount(process.env.WALLET_PRIVATE_KEY_CLIENT as `0x${string}`);

    const agentWalletClient = createWalletClient({
      account: agentAccount,
      chain: baseSepolia,
      transport: http()
    });

    const providerWalletClient = createWalletClient({
      account: providerAccount,
      chain: baseSepolia,
      transport: http()
    });

    const clientWalletClient = createWalletClient({
      account: clientAccount,
      chain: baseSepolia,
      transport: http()
    });

    this.agentClient = agentWalletClient;
    this.providerClient = providerWalletClient;
    this.clientClient = clientWalletClient;

    // Create temp storage directory if it doesn't exist
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Store transaction data in local storage (for demo purposes)
   */
  private async storeTransaction(key: string, data: any): Promise<void> {
    const filePath = path.join(this.storagePath, `${key}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * Get transaction data from local storage
   */
  private async getTransaction(key: string): Promise<any> {
    const filePath = path.join(this.storagePath, `${key}.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
  }

  /**
   * Query transactions from local storage
   */
  private async queryTransactions(): Promise<any[]> {
    const files = fs.readdirSync(this.storagePath).filter(file => file.endsWith('.json'));
    return files.map(file => {
      const filePath = path.join(this.storagePath, file);
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    });
  }

  /**
   * Create an escrow transaction - client transfers funds to agent as escrow
   */
  @CreateAction({
    name: "createEscrow",
    description: "Create an escrow transaction where client transfers funds to agent wallet",
    schema: CreateEscrowSchema
  })
  async createEscrow(args: CreateEscrowInput): Promise<string> {
    try {
      await this.initClients();
      
      if (!this.clientClient || !this.agentClient) {
        throw new Error(constants.ERROR_MESSAGES.WALLET_NOT_INITIALIZED);
      }

      // Generate escrow ID
      const escrowId = `escrow_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create escrow record
      const escrowTx: EscrowTransaction = {
        id: escrowId,
        clientAddress: args.clientAddress,
        agentAddress: args.agentAddress,
        providerAddress: args.providerAddress,
        tokenAddress: args.tokenAddress,
        amount: args.amount,
        serviceId: args.serviceId,
        status: constants.EscrowStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: args.metadata
      };

      let transferResult: string;
      
      if (!this.demoMode) {
        // Verify client has sufficient balance
        const clientBalance = await this.getTokenBalance({
          walletAddress: args.clientAddress,
          tokenAddress: args.tokenAddress
        });
        
        const clientBalanceValue = parseFloat(clientBalance.split(" ")[0]);
        const transferAmount = parseFloat(args.amount);
        
        if (clientBalanceValue < transferAmount) {
          throw new Error(constants.ERROR_MESSAGES.INSUFFICIENT_BALANCE);
        }

        // Transfer tokens from client to agent (escrow)
        transferResult = await this.clientClient.writeContract({
          address: args.tokenAddress as `0x${string}`,
          abi: constants.ERC20_ABI,
          functionName: 'transfer',
          args: [
            args.agentAddress as `0x${string}`,
            parseUnits(args.amount, constants.USDC_DECIMALS)
          ]
        });
      } else {
        // Generate a simulated transaction hash
        transferResult = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log("Demo mode: Simulated transaction hash:", transferResult);
      }

      escrowTx.clientTxHash = transferResult;
      escrowTx.updatedAt = new Date().toISOString();

      // Store escrow transaction record
      await this.storeTransaction(escrowId, escrowTx);

      const txLink = `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${transferResult}`;
      const portalLink = `https://testnet.recall.network/demo/${this.escrowTransactionsBucketId}/${escrowId}`;

      return JSON.stringify({
        success: true,
        message: `Escrow created successfully. ${args.amount} USDC transferred from client to agent.`,
        escrowId: escrowId,
        transactionHash: transferResult,
        transactionLink: txLink,
        portalLink: portalLink,
        status: constants.EscrowStatus.PENDING
      }, null, 2);
    } catch (error) {
      console.error("Error creating escrow:", error);
      return JSON.stringify({
        success: false,
        message: `Failed to create escrow: ${(error as Error).message}`
      }, null, 2);
    }
  }

  /**
   * Release escrow - agent transfers funds to provider
   */
  @CreateAction({
    name: "releaseEscrow",
    description: "Release funds from escrow to the service provider",
    schema: ReleaseEscrowSchema
  })
  async releaseEscrow(args: ReleaseEscrowInput): Promise<string> {
    try {
      await this.initClients();
      
      if (!this.agentClient) {
        throw new Error(constants.ERROR_MESSAGES.WALLET_NOT_INITIALIZED);
      }

      // Get escrow details
      const escrowDetailsResponse = await this.getEscrowDetails({ escrowId: args.escrowId });
      const escrowDetails = JSON.parse(escrowDetailsResponse).data as EscrowTransaction;
      
      if (!escrowDetails) {
        throw new Error(constants.ERROR_MESSAGES.ESCROW_NOT_FOUND);
      }
      
      if (escrowDetails.status !== constants.EscrowStatus.PENDING) {
        throw new Error(constants.ERROR_MESSAGES.ESCROW_ALREADY_RELEASED);
      }

      let transferResult: string;
      
      if (!this.demoMode) {
        // Transfer tokens from agent to provider
        transferResult = await this.agentClient.writeContract({
          address: escrowDetails.tokenAddress as `0x${string}`,
          abi: constants.ERC20_ABI,
          functionName: 'transfer',
          args: [
            escrowDetails.providerAddress as `0x${string}`,
            parseUnits(escrowDetails.amount, constants.USDC_DECIMALS)
          ]
        });
      } else {
        // Generate a simulated transaction hash
        transferResult = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log("Demo mode: Simulated transaction hash:", transferResult);
      }

      // Update escrow record
      escrowDetails.status = constants.EscrowStatus.RELEASED;
      escrowDetails.releaseTxHash = transferResult;
      escrowDetails.updatedAt = new Date().toISOString();
      
      if (!escrowDetails.metadata) {
        escrowDetails.metadata = {};
      }
      
      if (args.reason) {
        escrowDetails.metadata["release_reason"] = args.reason;
      }

      // Store updated escrow transaction record
      await this.storeTransaction(args.escrowId, escrowDetails);

      const txLink = `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${transferResult}`;
      const portalLink = `https://testnet.recall.network/demo/${this.escrowTransactionsBucketId}/${args.escrowId}`;

      return JSON.stringify({
        success: true,
        message: `Escrow released successfully. ${escrowDetails.amount} USDC transferred from agent to provider.`,
        escrowId: args.escrowId,
        transactionHash: transferResult,
        transactionLink: txLink,
        portalLink: portalLink,
        status: constants.EscrowStatus.RELEASED
      }, null, 2);
    } catch (error) {
      console.error("Error releasing escrow:", error);
      return JSON.stringify({
        success: false,
        message: `Failed to release escrow: ${(error as Error).message}`
      }, null, 2);
    }
  }

  /**
   * Refund escrow - agent transfers funds back to client
   */
  @CreateAction({
    name: "refundEscrow",
    description: "Refund escrow funds back to the client",
    schema: RefundEscrowSchema
  })
  async refundEscrow(args: RefundEscrowInput): Promise<string> {
    try {
      await this.initClients();
      
      if (!this.agentClient) {
        throw new Error(constants.ERROR_MESSAGES.WALLET_NOT_INITIALIZED);
      }

      // Get escrow details
      const escrowDetailsResponse = await this.getEscrowDetails({ escrowId: args.escrowId });
      const escrowDetails = JSON.parse(escrowDetailsResponse).data as EscrowTransaction;
      
      if (!escrowDetails) {
        throw new Error(constants.ERROR_MESSAGES.ESCROW_NOT_FOUND);
      }
      
      if (escrowDetails.status !== constants.EscrowStatus.PENDING) {
        throw new Error(constants.ERROR_MESSAGES.ESCROW_ALREADY_RELEASED);
      }

      let transferResult: string;
      
      if (!this.demoMode) {
        // Transfer tokens from agent back to client
        transferResult = await this.agentClient.writeContract({
          address: escrowDetails.tokenAddress as `0x${string}`,
          abi: constants.ERC20_ABI,
          functionName: 'transfer',
          args: [
            escrowDetails.clientAddress as `0x${string}`,
            parseUnits(escrowDetails.amount, constants.USDC_DECIMALS)
          ]
        });
      } else {
        // Generate a simulated transaction hash
        transferResult = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log("Demo mode: Simulated transaction hash:", transferResult);
      }

      // Update escrow record
      escrowDetails.status = constants.EscrowStatus.REFUNDED;
      escrowDetails.releaseTxHash = transferResult;
      escrowDetails.updatedAt = new Date().toISOString();
      
      if (!escrowDetails.metadata) {
        escrowDetails.metadata = {};
      }
      
      if (args.reason) {
        escrowDetails.metadata["refund_reason"] = args.reason;
      }

      // Store updated escrow transaction record
      await this.storeTransaction(args.escrowId, escrowDetails);

      const txLink = `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${transferResult}`;
      const portalLink = `https://testnet.recall.network/demo/${this.escrowTransactionsBucketId}/${args.escrowId}`;

      return JSON.stringify({
        success: true,
        message: `Escrow refunded successfully. ${escrowDetails.amount} USDC transferred from agent back to client.`,
        escrowId: args.escrowId,
        transactionHash: transferResult,
        transactionLink: txLink,
        portalLink: portalLink,
        status: constants.EscrowStatus.REFUNDED
      }, null, 2);
    } catch (error) {
      console.error("Error refunding escrow:", error);
      return JSON.stringify({
        success: false,
        message: `Failed to refund escrow: ${(error as Error).message}`
      }, null, 2);
    }
  }

  /**
   * Get token balance for a wallet address
   */
  @CreateAction({
    name: "getTokenBalance",
    description: "Get USDC balance for a wallet address",
    schema: GetTokenBalanceSchema
  })
  async getTokenBalance(args: GetTokenBalanceInput): Promise<string> {
    try {
      await this.initClients();
      
      if (!this.agentClient) {
        throw new Error(constants.ERROR_MESSAGES.WALLET_NOT_INITIALIZED);
      }

      if (this.demoMode) {
        // Generate simulated balances for demo mode
        let balance = "0.00";
        
        if (args.walletAddress.includes("agent")) {
          balance = "1.25";
        } else if (args.walletAddress.includes("provider")) {
          balance = "0.50";
        } else if (args.walletAddress.includes("client")) {
          balance = "5.00";
        } else {
          // Random balance between 0 and 10 USDC
          balance = (Math.random() * 10).toFixed(2);
        }
        
        return `${balance} USDC`;
      }

      const tokenAddress = args.tokenAddress || constants.USDC_TOKEN_ADDRESS_BASE_SEPOLIA;

      const balance = await this.agentClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: constants.ERC20_ABI,
        functionName: 'balanceOf',
        args: [args.walletAddress as `0x${string}`]
      });

      const formattedBalance = formatUnits(balance as bigint, constants.USDC_DECIMALS);

      return `${formattedBalance} USDC`;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return `Error: ${(error as Error).message}`;
    }
  }

  /**
   * Get escrow transaction details
   */
  @CreateAction({
    name: "getEscrowDetails",
    description: "Get details of an escrow transaction",
    schema: GetEscrowDetailsSchema
  })
  async getEscrowDetails(args: GetEscrowDetailsInput): Promise<string> {
    try {
      await this.initClients();
      
      // Get escrow record
      const escrowDetails = await this.getTransaction(args.escrowId);

      if (!escrowDetails) {
        throw new Error(constants.ERROR_MESSAGES.ESCROW_NOT_FOUND);
      }

      const portalLink = `https://testnet.recall.network/demo/${this.escrowTransactionsBucketId}/${args.escrowId}`;
      
      // Get transaction links
      const clientTxLink = escrowDetails.clientTxHash ? 
        `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${escrowDetails.clientTxHash}` : undefined;
      
      const releaseTxLink = escrowDetails.releaseTxHash ? 
        `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${escrowDetails.releaseTxHash}` : undefined;

      return JSON.stringify({
        success: true,
        message: "Escrow details retrieved successfully",
        data: escrowDetails,
        portalLink,
        clientTxLink,
        releaseTxLink
      }, null, 2);
    } catch (error) {
      console.error("Error getting escrow details:", error);
      return JSON.stringify({
        success: false,
        message: `Failed to get escrow details: ${(error as Error).message}`
      }, null, 2);
    }
  }

  /**
   * Get all escrow transactions with optional filtering
   */
  @CreateAction({
    name: "getAllEscrowTransactions",
    description: "Get all escrow transactions with optional filtering",
    schema: GetAllEscrowTransactionsSchema
  })
  async getAllEscrowTransactions(args: GetAllEscrowTransactionsInput): Promise<string> {
    try {
      await this.initClients();

      // Query transactions from storage
      const transactions = await this.queryTransactions();

      if (!transactions || transactions.length === 0) {
        return JSON.stringify({
          success: true,
          message: "No escrow transactions found",
          data: []
        }, null, 2);
      }

      // Apply filters
      let filteredTransactions = transactions;
      
      if (args.status) {
        filteredTransactions = filteredTransactions.filter((tx: EscrowTransaction) => tx.status === args.status);
      }
      
      if (args.serviceId) {
        filteredTransactions = filteredTransactions.filter((tx: EscrowTransaction) => tx.serviceId === args.serviceId);
      }
      
      if (args.clientAddress) {
        filteredTransactions = filteredTransactions.filter((tx: EscrowTransaction) => tx.clientAddress === args.clientAddress);
      }
      
      if (args.providerAddress) {
        filteredTransactions = filteredTransactions.filter((tx: EscrowTransaction) => tx.providerAddress === args.providerAddress);
      }

      return JSON.stringify({
        success: true,
        message: "Escrow transactions retrieved successfully",
        count: filteredTransactions.length,
        data: filteredTransactions
      }, null, 2);
    } catch (error) {
      console.error("Error getting escrow transactions:", error);
      return JSON.stringify({
        success: false,
        message: `Failed to get escrow transactions: ${(error as Error).message}`
      }, null, 2);
    }
  }

  /**
   * Direct token transfer (without escrow)
   */
  @CreateAction({
    name: "transferTokens",
    description: "Transfer USDC tokens directly from one wallet to another",
    schema: TransferTokensSchema
  })
  async transferTokens(args: TransferTokensInput): Promise<string> {
    try {
      await this.initClients();
      
      if (!this.clientClient || !this.agentClient || !this.providerClient) {
        throw new Error(constants.ERROR_MESSAGES.WALLET_NOT_INITIALIZED);
      }

      // Determine which wallet client to use based on the fromAddress
      let walletClient;
      if (args.fromAddress === (this.clientClient.account?.address || "0xclient")) {
        walletClient = this.clientClient;
      } else if (args.fromAddress === (this.agentClient.account?.address || "0xagent")) {
        walletClient = this.agentClient;
      } else if (args.fromAddress === (this.providerClient.account?.address || "0xprovider")) {
        walletClient = this.providerClient;
      } else {
        throw new Error(`Cannot send from address ${args.fromAddress}: Not a managed wallet`);
      }

      let transferResult: string;
      
      if (!this.demoMode) {
        // Get the sender's balance
        const balance = await walletClient.readContract({
          address: args.tokenAddress as `0x${string}`,
          abi: constants.ERC20_ABI,
          functionName: 'balanceOf',
          args: [args.fromAddress as `0x${string}`]
        });

        const transferAmount = parseUnits(args.amount, constants.USDC_DECIMALS);
        
        if ((balance as bigint) < transferAmount) {
          throw new Error(constants.ERROR_MESSAGES.INSUFFICIENT_BALANCE);
        }

        // Transfer tokens
        transferResult = await walletClient.writeContract({
          address: args.tokenAddress as `0x${string}`,
          abi: constants.ERC20_ABI,
          functionName: 'transfer',
          args: [
            args.toAddress as `0x${string}`,
            transferAmount
          ]
        });
      } else {
        // Generate a simulated transaction hash
        transferResult = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
        console.log("Demo mode: Simulated transaction hash:", transferResult);
      }

      // Create transfer record
      const transferId = `transfer_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const transferRecord = {
        id: transferId,
        fromAddress: args.fromAddress,
        toAddress: args.toAddress,
        tokenAddress: args.tokenAddress,
        amount: args.amount,
        txHash: transferResult,
        timestamp: new Date().toISOString(),
        metadata: args.metadata
      };

      // Store transfer record
      await this.storeTransaction(transferId, transferRecord);

      const txLink = `${constants.BASE_SEPOLIA_BLOCK_EXPLORER}/tx/${transferResult}`;

      return JSON.stringify({
        success: true,
        message: `Transfer successful. ${args.amount} USDC transferred from ${args.fromAddress} to ${args.toAddress}.`,
        transactionHash: transferResult,
        transactionLink: txLink
      }, null, 2);
    } catch (error) {
      console.error("Error transferring tokens:", error);
      return JSON.stringify({
        success: false,
        message: `Failed to transfer tokens: ${(error as Error).message}`
      }, null, 2);
    }
  }

  /**
   * Check if a network is supported
   */
  supportsNetwork(network: Network): boolean {
    return constants.SUPPORTED_NETWORKS.includes(network.toString());
  }
}

/**
 * Factory function to create an ERC20EscrowActionProvider instance
 */
export const erc20EscrowActionProvider = () => new ERC20EscrowActionProvider(); 