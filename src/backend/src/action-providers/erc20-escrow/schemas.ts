import { z } from "zod";
import { EscrowStatus } from "./constants.js";

// Schema for creating an escrow transaction
export const CreateEscrowSchema = z.object({
  clientAddress: z.string().describe("The client wallet address sending funds to escrow"),
  agentAddress: z.string().describe("The agent wallet address holding the funds in escrow"),
  providerAddress: z.string().describe("The service provider wallet address"),
  tokenAddress: z.string().describe("The ERC20 token contract address"),
  amount: z.string().describe("The amount of tokens to transfer"),
  serviceId: z.string().describe("The ID of the service being paid for"),
  metadata: z.record(z.string(), z.string()).optional().describe("Optional metadata for the escrow transaction"),
});

// Schema for releasing an escrow transaction
export const ReleaseEscrowSchema = z.object({
  escrowId: z.string().describe("The ID of the escrow transaction to release"),
  reason: z.string().optional().describe("Reason for releasing the escrow")
});

// Schema for refunding an escrow transaction
export const RefundEscrowSchema = z.object({
  escrowId: z.string().describe("The ID of the escrow transaction to refund"),
  reason: z.string().optional().describe("Reason for refunding the escrow")
});

// Schema for getting a user's USDC balance
export const GetTokenBalanceSchema = z.object({
  walletAddress: z.string().describe("The wallet address to check balance for"),
  tokenAddress: z.string().optional().describe("The ERC20 token contract address (defaults to USDC)")
});

// Schema for getting escrow transaction details
export const GetEscrowDetailsSchema = z.object({
  escrowId: z.string().describe("The ID of the escrow transaction")
});

// Schema for getting all escrow transactions
export const GetAllEscrowTransactionsSchema = z.object({
  status: z.nativeEnum(EscrowStatus).optional().describe("Filter transactions by status"),
  serviceId: z.string().optional().describe("Filter transactions by service ID"),
  clientAddress: z.string().optional().describe("Filter transactions by client address"),
  providerAddress: z.string().optional().describe("Filter transactions by provider address")
});

// Schema for transferring USDC directly (without escrow)
export const TransferTokensSchema = z.object({
  fromAddress: z.string().describe("The sender's wallet address"),
  toAddress: z.string().describe("The recipient's wallet address"),
  tokenAddress: z.string().describe("The ERC20 token contract address"),
  amount: z.string().describe("The amount of tokens to transfer"),
  metadata: z.record(z.string(), z.string()).optional().describe("Optional metadata for the transfer")
});

// Interface for escrow transaction
export interface EscrowTransaction {
  id: string;
  clientAddress: string;
  agentAddress: string;
  providerAddress: string;
  tokenAddress: string;
  amount: string;
  serviceId: string;
  status: EscrowStatus;
  clientTxHash?: string;
  releaseTxHash?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}

// Type exports for Zod schemas
export type CreateEscrowInput = z.infer<typeof CreateEscrowSchema>;
export type ReleaseEscrowInput = z.infer<typeof ReleaseEscrowSchema>;
export type RefundEscrowInput = z.infer<typeof RefundEscrowSchema>;
export type GetTokenBalanceInput = z.infer<typeof GetTokenBalanceSchema>;
export type GetEscrowDetailsInput = z.infer<typeof GetEscrowDetailsSchema>;
export type GetAllEscrowTransactionsInput = z.infer<typeof GetAllEscrowTransactionsSchema>;
export type TransferTokensInput = z.infer<typeof TransferTokensSchema>; 