// Constants for ERC20 Escrow Action Provider

// Base Sepolia USDC token address
export const USDC_TOKEN_ADDRESS_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Generic ERC20 ABI (for token transfers)
export const ERC20_ABI = [
  // Read-only functions
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "name": "", "type": "string" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      { "name": "owner", "type": "address" },
      { "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "name": "", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  // Write functions
  {
    "constant": false,
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      { "name": "from", "type": "address" },
      { "name": "to", "type": "address" },
      { "name": "value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Bucket IDs for storing transaction records
export const ESCROW_TRANSACTIONS_BUCKET_ID = "escrow-transactions";

// Error messages
export const ERROR_MESSAGES = {
  INSUFFICIENT_BALANCE: "Insufficient token balance",
  TRANSFER_FAILED: "Token transfer failed",
  INVALID_ADDRESS: "Invalid wallet address",
  ESCROW_ALREADY_RELEASED: "Escrow has already been released",
  ESCROW_NOT_FOUND: "Escrow transaction not found",
  NETWORK_MISMATCH: "Network mismatch - this function requires Base Sepolia",
  WALLET_NOT_INITIALIZED: "Wallet client not initialized",
};

// USDC token details
export const USDC_DECIMALS = 6;
export const DEFAULT_ESCROW_AMOUNT = "0.01"; // Default amount in USDC

// Transaction status
export enum EscrowStatus {
  PENDING = "pending",
  RELEASED = "released",
  REFUNDED = "refunded",
  CANCELLED = "cancelled"
}

// Network constants
export const SUPPORTED_NETWORKS = ["base-sepolia"];
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SEPOLIA_BLOCK_EXPLORER = "https://sepolia.basescan.org"; 