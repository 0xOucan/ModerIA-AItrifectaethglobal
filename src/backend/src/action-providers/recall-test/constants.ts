import { testnet } from "@recallnet/chains";

// Network configurations
export const RECALL_NETWORKS = {
  testnet: testnet,
  mainnet: testnet // Using testnet for now since mainnet isn't available yet
};

// Action names for the Recall action provider
export const RECALL_ACTION_NAMES = {
  // Base Recall actions
  CREATE_CLIENT: "create_recall_client",
  GET_BALANCE: "get_recall_balance",
  STORE_DATA: "store_recall_data",
  RETRIEVE_DATA: "retrieve_recall_data",
  PURCHASE_CREDIT: "purchase_recall_credit",
  CREATE_BUCKET: "create_recall_bucket",
  ADD_OBJECT: "add_object_to_bucket",
  QUERY_OBJECTS: "query_bucket_objects",
  GET_OBJECT: "get_bucket_object",
  
  // Marketplace actions
  LIST_SERVICE: "list_service",
  FIND_SERVICES: "find_services",
  BOOK_SERVICE: "book_service",
  COMPLETE_SERVICE: "complete_service",
  REVIEW_SERVICE: "review_service",
  REPORT_ISSUE: "report_issue",
  RESOLVE_DISPUTE: "resolve_dispute",
  STORE_MEETING_NOTES: "store_meeting_notes"
};

// Error messages
export const ERROR_MESSAGES = {
  MISSING_CLIENT: "Recall client not initialized. Please create a client first.",
  MISSING_PRIVATE_KEY: "Private key not found in environment variables. Please add WALLET_PRIVATE_KEY to your .env file.",
  FAILED_CLIENT_CREATION: "Failed to create Recall client.",
  FAILED_DATA_STORAGE: "Failed to store data on Recall network.",
  FAILED_DATA_RETRIEVAL: "Failed to retrieve data from Recall network.",
  FAILED_CREDIT_PURCHASE: "Failed to purchase Recall credits.",
  FAILED_BUCKET_CREATION: "Failed to create Recall bucket.",
  FAILED_OBJECT_ADDITION: "Failed to add object to bucket.",
  FAILED_OBJECT_QUERY: "Failed to query bucket objects.",
  FAILED_OBJECT_RETRIEVAL: "Failed to retrieve object from bucket."
};

// Provider description
export const RECALL_TEST_DESCRIPTION = "A test action provider for the Recall Network";

// Marketplace constants
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  DISPUTED: "disputed",
  RESOLVED: "resolved"
};

export const SERVICE_TYPES = [
  "education",
  "consulting",
  "mentoring",
  "tutoring",
  "coaching",
  "language",
  "other"
];

export const MARKETPLACE_BUCKETS = {
  SERVICES: "services",
  BOOKINGS: "bookings",
  REVIEWS: "reviews",
  NOTES: "meeting-notes"
}; 