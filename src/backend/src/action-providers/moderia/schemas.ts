import { z } from "zod";
import {
  ServiceStatus,
  BookingStatus,
  EscrowStatus,
  MeetingStatus
} from "./constants.js";

// Basic schemas for Recall client
export const CreateRecallClientSchema = z.object({
  networkName: z.enum(["testnet", "mainnet"]).default("testnet"),
  userType: z.enum(["teacher", "student", "agent"]).default("agent"),
});

export const CreateRecallBucketSchema = z.object({
  name: z.string().optional(),
});

// Service listing schemas
export const CreateServiceListingSchema = z.object({
  serviceType: z.string().describe("Type of service being offered"),
  providerName: z.string().describe("Name of the service provider"),
  startTime: z.string().describe("Start time of the service in UTC format"),
  endTime: z.string().describe("End time of the service in UTC format"),
  price: z.string().describe("Price in USDC"),
  walletAddress: z.string().describe("Wallet address for payment"),
  meetingLink: z.string().describe("Video call link (Zoom, Google Meet, or Jitsi)"),
  description: z.string().optional().describe("Additional description of the service"),
});

export const ListAvailableServicesSchema = z.object({
  serviceType: z.string().optional().describe("Filter by service type"),
  limit: z.number().default(10).describe("Maximum number of services to list"),
});

// Service booking schemas
export const BookServiceSchema = z.object({
  serviceId: z.string().describe("ID of the service to book"),
  clientName: z.string().describe("Name of the client booking the service"),
  clientEmail: z.string().optional().describe("Email of the client (optional)"),
  specialRequests: z.string().optional().describe("Any special requests for the service"),
});

// Escrow schemas
export const CreateEscrowSchema = z.object({
  bookingId: z.string().describe("ID of the booking to create escrow for"),
  amount: z.string().describe("Amount of USDC to place in escrow"),
});

export const GetTokenBalanceSchema = z.object({
  address: z.string().optional().describe("Wallet address to check balance"),
  chainId: z.number().default(84532).describe("Chain ID (default: Base Sepolia)"),
});

export const ReleaseFundsSchema = z.object({
  escrowId: z.string().describe("ID of the escrow transaction"),
  amount: z.string().optional().describe("Amount to release (if partial)"),
});

// Meeting schemas
export const JoinMeetingSchema = z.object({
  meetingUrl: z.string().describe("URL of the meeting to join"),
  meetingTitle: z.string().optional().describe("Title of the meeting"),
  participantName: z.string().optional().describe("Name of the participant"),
  languageCode: z.string().default("en-US").describe("Language code for transcription"),
});

export const GetTranscriptSchema = z.object({
  meetingId: z.string().describe("ID of the meeting to get transcript for"),
});

export const AnalyzeServiceQualitySchema = z.object({
  meetingId: z.string().describe("ID of the meeting to analyze"),
  bookingId: z.string().describe("ID of the booking associated with the meeting"),
});

export const CompleteServiceSchema = z.object({
  bookingId: z.string().describe("ID of the booking to complete"),
  qualityScore: z.number().optional().describe("Quality score (1-100)"),
  feedback: z.string().optional().describe("Feedback about the service"),
});

// Interface definitions
export interface ServiceListing {
  id: string;
  serviceType: string;
  providerName: string;
  startTime: string;
  endTime: string;
  price: string;
  walletAddress: string;
  meetingLink: string;
  description?: string;
  status: ServiceStatus;
  createdAt: string;
  bucketId: string;
  objectKey: string;
}

export interface ServiceBooking {
  id: string;
  serviceId: string;
  clientName: string;
  clientEmail?: string;
  specialRequests?: string;
  bookingTime: string;
  status: BookingStatus;
  escrowId?: string;
  meetingId?: string;
  bucketId: string;
  objectKey: string;
}

export interface EscrowTransaction {
  id: string;
  bookingId: string;
  amount: string;
  providerAddress: string;
  clientAddress: string;
  agentAddress: string;
  status: EscrowStatus;
  createdAt: string;
  completedAt?: string;
  txHash?: string;
}

export interface Meeting {
  id: string;
  bookingId: string;
  url: string;
  title: string;
  status: MeetingStatus;
  startTime: Date;
  endTime?: Date;
  participantCount: number;
  hasTranscript: boolean;
  hasSummary: boolean;
  hasAnalysis: boolean;
  transcriptUrl?: string;
  summaryUrl?: string;
  qualityScore?: number;
}

export interface ServiceCompletion {
  id: string;
  bookingId: string;
  serviceId: string;
  escrowId: string;
  qualityScore: number;
  feedback?: string;
  completedAt: string;
  bucketId: string;
  objectKey: string;
}