import { z } from "zod";
import { MeetingStatus } from "./constants.js";

// Define the Meeting type
export interface Meeting {
  id: string;
  url: string;
  title: string;
  status: MeetingStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  participantCount?: number;
  hasTranscript: boolean;
  hasSummary: boolean;
  hasAnalysis: boolean;
  transcriptUrl: string;
  summaryUrl: string;
}

// Define the Analysis Result type
export interface AnalysisResult {
  meetingId: string;
  callDuration: number;
  qualityScore: number;
  qualityPassed: boolean;
  speakerBreakdown: Record<string, number>;
  languageBreakdown: Record<string, number>;
  learningObjectives?: string[];
  vocabCoverage?: string[];
  qualityBreakdown?: Record<string, number>;
  recommendations?: string[];
}

// Define the Payment Authorization type
export interface PaymentAuthorization {
  meetingId: string;
  authorized: boolean;
  amount?: string | number;
  recipient?: string;
  timestamp: Date;
  reason?: string;
  transactionId: string;
}

// JoinMeetingSchema: Schema for joining a meeting with Otter AI
export const JoinMeetingSchema = z.object({
  meetingUrl: z.string().url().describe("URL of the Google Meet or Zoom meeting to join"),
  meetingTitle: z.string().optional().describe("Optional title for the meeting"),
  participantName: z.string().optional().describe("Name to display in the meeting"),
  languageCode: z.string().optional().default("en-US").describe("Language code for transcription (e.g., en-US, es-ES)")
});

// GetTranscriptSchema: Schema for retrieving a meeting transcript
export const GetTranscriptSchema = z.object({
  meetingId: z.string().describe("ID of the meeting to get transcript for"),
  format: z.enum(["plain", "json", "html"]).optional().default("plain").describe("Format of the transcript (plain text, JSON, or HTML)")
});

// GetTranscriptSummarySchema: Schema for retrieving a summary of a meeting transcript
export const GetTranscriptSummarySchema = z.object({
  meetingId: z.string().describe("ID of the meeting to get summary for"),
  format: z.enum(["plain", "json", "html"]).optional().default("plain").describe("Format of the summary (plain text, JSON, or HTML)")
});

// AnalyzeCallQualitySchema: Schema for analyzing the quality of a recorded call
export const AnalyzeCallQualitySchema = z.object({
  meetingId: z.string().describe("ID of the meeting to analyze"),
  serviceType: z.enum(["language_learning", "tutoring", "consulting", "other"]).optional().default("language_learning").describe("Type of service provided in the call"),
  qualityThresholdOverride: z.number().min(1).max(10).optional().describe("Optional override for the minimum quality score threshold"),
  includeRecommendations: z.boolean().optional().default(true).describe("Whether to include recommendations in the analysis results")
});

// AuthorizePaymentSchema: Schema for authorizing payment based on call quality
export const AuthorizePaymentSchema = z.object({
  meetingId: z.string().describe("ID of the meeting to authorize payment for"),
  qualityScore: z.number().min(1).max(10).optional().describe("Optional quality score override"),
  qualityPassed: z.boolean().optional().describe("Optional override for whether quality threshold was passed"),
  paymentAmount: z.union([z.string(), z.number()]).optional().describe("Amount to pay (if not the standard rate)"),
  paymentRecipient: z.string().optional().describe("Recipient of the payment (defaults to service provider)"),
  notes: z.string().optional().describe("Additional notes about the payment authorization")
});

// Zod schemas for validation (but not exported as types to avoid duplication)
export const MeetingSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  title: z.string().optional(),
  status: z.nativeEnum(MeetingStatus),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // in seconds
  participantCount: z.number().optional(),
  hasTranscript: z.boolean().optional(),
  hasSummary: z.boolean().optional(),
  hasAnalysis: z.boolean().optional(),
  transcriptUrl: z.string().url().optional(),
  summaryUrl: z.string().url().optional(),
});

export const AnalysisResultSchema = z.object({
  meetingId: z.string(),
  callDuration: z.number(), // in seconds
  speakerBreakdown: z.record(z.string(), z.number()), // speaker -> percentage
  languageBreakdown: z.record(z.string(), z.number()), // language -> percentage
  learningObjectives: z.array(z.string()).optional(),
  vocabCoverage: z.array(z.string()).optional(),
  qualityScore: z.number().min(0).max(10),
  qualityBreakdown: z.record(z.string(), z.number()).optional(),
  qualityPassed: z.boolean(),
  recommendations: z.array(z.string()).optional(),
});

export const PaymentAuthorizationSchema = z.object({
  meetingId: z.string(),
  authorized: z.boolean(),
  amount: z.number().optional(),
  recipient: z.string().optional(),
  timestamp: z.date(),
  reason: z.string().optional(),
  transactionId: z.string().optional(),
});

// Type exports
export type JoinMeetingInput = z.infer<typeof JoinMeetingSchema>;
export type GetTranscriptInput = z.infer<typeof GetTranscriptSchema>;
export type GetTranscriptSummaryInput = z.infer<typeof GetTranscriptSummarySchema>;
export type AnalyzeCallQualityInput = z.infer<typeof AnalyzeCallQualitySchema>;
export type AuthorizePaymentInput = z.infer<typeof AuthorizePaymentSchema>; 