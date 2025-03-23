import { testnet } from "@recallnet/chains";
import { baseSepolia } from "viem/chains";

// Network types
export type RecallNetworkType = 'testnet' | 'mainnet';

export const RECALL_NETWORKS = {
  testnet,
  // Use testnet for both since mainnet might not be available yet
  mainnet: testnet,
} as const;

// URLs for Recall Network
export const RECALL_PORTAL_URLS: Record<RecallNetworkType, string> = {
  testnet: "https://portal.recall.network",
  mainnet: "https://portal.recall.network",
};

export const RECALL_EXPLORER_URLS: Record<RecallNetworkType, string> = {
  testnet: "https://explorer.recall.network",
  mainnet: "https://explorer.recall.network",
};

// Base Sepolia USDC token address (from ERC20 Escrow)
export const USDC_TOKEN_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
export const USDC_DECIMALS = 6;

// ERC20 ABI for token transfers
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

// Action names
export const MODERIA_ACTION_NAMES = {
  // Recall client actions
  CREATE_RECALL_CLIENT: "createRecallClient",
  CREATE_RECALL_BUCKET: "createRecallBucket",
  
  // Service marketplace actions
  CREATE_SERVICE_LISTING: "createServiceListing",
  LIST_AVAILABLE_SERVICES: "listAvailableServices",
  BOOK_SERVICE: "bookService",
  
  // ERC20 escrow actions
  CREATE_ESCROW: "createEscrow",
  GET_TOKEN_BALANCE: "getTokenBalance",
  RELEASE_FUNDS: "releaseFunds",
  
  // Meeting and evaluation actions
  JOIN_MEETING: "joinMeeting",
  GET_TRANSCRIPT: "getTranscript",
  ANALYZE_SERVICE_QUALITY: "analyzeServiceQuality",
  COMPLETE_SERVICE: "completeService"
};

// Status enums
export enum ServiceStatus {
  AVAILABLE = "available",
  BOOKED = "booked",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export enum BookingStatus {
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  DISPUTED = "disputed"
}

export enum EscrowStatus {
  PENDING = "pending",
  RELEASED = "released",
  REFUNDED = "refunded",
  CANCELLED = "cancelled"
}

export enum MeetingStatus {
  SCHEDULED = "scheduled",
  JOINING = "joining",
  ACTIVE = "active",
  ENDED = "ended",
  FAILED = "failed"
}

// Quality rating thresholds (from Otter AI)
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
  POOR: 40
};

// Bucket names
export const BUCKET_NAMES = {
  SERVICES: "services-bucket",
  BOOKINGS: "bookings-bucket",
  TRANSACTIONS: "transactions-bucket",
  EVALUATIONS: "evaluations-bucket"
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_MISMATCH: "Network mismatch. Make sure you're on the correct network.",
  INSUFFICIENT_BALANCE: "Insufficient balance for the operation.",
  FAILED_CLIENT_CREATION: "Failed to create client.",
  MISSING_PRIVATE_KEY: "Missing private key in environment variables.",
  MISSING_CLIENT: "Client not initialized. Please create a client first.",
  FAILED_BUCKET_CREATION: "Failed to create bucket.",
  FAILED_OBJECT_ADDITION: "Failed to add object to bucket.",
  FAILED_OBJECT_QUERY: "Failed to query objects in bucket.",
  FAILED_OBJECT_RETRIEVAL: "Failed to retrieve object from bucket.",
  INVALID_MEETING_LINK: "Invalid meeting link. Please provide a Google Meet or Zoom link.",
  SERVICE_NOT_FOUND: "Service not found.",
  BOOKING_NOT_FOUND: "Booking not found.",
  ESCROW_NOT_FOUND: "Escrow transaction not found.",
  INVALID_ADDRESS: "Invalid wallet address.",
  TRANSFER_FAILED: "Token transfer failed.",
  WALLET_NOT_INITIALIZED: "Wallet client not initialized."
};