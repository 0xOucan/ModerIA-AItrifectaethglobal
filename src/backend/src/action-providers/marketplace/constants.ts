import { testnet } from "@recallnet/chains";

// Action Names
export const MARKETPLACE_ACTION_NAMES = {
  // Client Management
  CREATE_CLIENT: "createMarketplaceClient",
  
  // Service Management
  CREATE_SERVICE: "createService",
  LIST_SERVICES: "listServices",
  GET_SERVICE: "getService",
  
  // Booking Management
  BOOK_SERVICE: "bookService",
  LIST_BOOKINGS: "listBookings",
  GET_BOOKING: "getBooking",
  
  // Review and Dispute Resolution
  COMPLETE_SERVICE: "completeService",
  FILE_DISPUTE: "fileDispute",
  RESOLVE_DISPUTE: "resolveDispute"
};

// Bucket Names (we'll use a single bucket with prefixes for simplicity)
export const BUCKET_PREFIXES = {
  SERVICES: "services/",
  BOOKINGS: "bookings/",
  DISPUTES: "disputes/"
};

// Network Configuration
export const MARKETPLACE_NETWORKS = {
  testnet: testnet
};

// Status Constants
export const SERVICE_STATUS = {
  AVAILABLE: "available",
  BOOKED: "booked",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
};

export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  DISPUTED: "disputed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded"
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_MISMATCH: "Network mismatch. Make sure you're on the correct network.",
  INSUFFICIENT_BALANCE: "Insufficient balance for the operation.",
  MISSING_CLIENT: "Marketplace client not initialized. Please create a client first.",
  MISSING_PRIVATE_KEY: "Missing private key in environment variables.",
  FAILED_CLIENT_CREATION: "Failed to create marketplace client.",
  FAILED_SERVICE_CREATION: "Failed to create service.",
  FAILED_SERVICE_LISTING: "Failed to list services.",
  FAILED_SERVICE_RETRIEVAL: "Failed to retrieve service details.",
  FAILED_BOOKING_CREATION: "Failed to create booking.",
  FAILED_BOOKING_LISTING: "Failed to list bookings.",
  FAILED_BOOKING_RETRIEVAL: "Failed to retrieve booking details.",
  FAILED_SERVICE_COMPLETION: "Failed to complete service.",
  FAILED_DISPUTE_FILING: "Failed to file dispute.",
  FAILED_DISPUTE_RESOLUTION: "Failed to resolve dispute.",
  SERVICE_ALREADY_BOOKED: "This service has already been booked."
}; 