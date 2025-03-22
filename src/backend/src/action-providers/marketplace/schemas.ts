import { z } from "zod";

// Base schemas
export const CreateClientSchema = z.object({
  networkName: z.string().default("testnet").describe("Network name (e.g., testnet)")
});

// Service Management Schemas
export const CreateServiceSchema = z.object({
  provider: z.string().describe("Provider name or identifier"),
  title: z.string().describe("Service title"),
  description: z.string().describe("Service description"),
  date: z.string().describe("Date of service (YYYY-MM-DD)"),
  startTime: z.string().describe("Start time (HH:MM, 24h format)"),
  endTime: z.string().describe("End time (HH:MM, 24h format)"),
  timeZone: z.string().describe("Time zone (e.g., America/Mexico_City)"),
  price: z.string().describe("Price in USD")
});

export const ListServicesSchema = z.object({
  filter: z.string().optional().describe("Optional filter string")
});

export const GetServiceSchema = z.object({
  serviceId: z.string().describe("Service ID")
});

// Booking Management Schemas
export const BookServiceSchema = z.object({
  serviceId: z.string().describe("Service ID"),
  clientName: z.string().describe("Client name"),
  clientEmail: z.string().describe("Client email"),
  meetingPlatform: z.enum(["zoom", "meet", "jitsi"]).describe("Meeting platform preference")
});

export const ListBookingsSchema = z.object({
  provider: z.string().optional().describe("Optional provider filter"),
  client: z.string().optional().describe("Optional client filter")
});

export const GetBookingSchema = z.object({
  bookingId: z.string().describe("Booking ID")
});

// Review and Dispute Resolution Schemas
export const CompleteServiceSchema = z.object({
  bookingId: z.string().describe("Booking ID"),
  meetingNotes: z.string().describe("AI-generated meeting notes"),
  successful: z.boolean().describe("Was the service successfully completed?"),
  comments: z.string().optional().describe("Comments about the service")
});

export const FileDisputeSchema = z.object({
  bookingId: z.string().describe("Booking ID"),
  reason: z.string().describe("Reason for dispute"),
  evidence: z.string().optional().describe("Additional evidence")
});

export const ResolveDisputeSchema = z.object({
  bookingId: z.string().describe("Booking ID"),
  resolution: z.enum(["full_refund", "partial_refund", "no_refund"]).describe("Dispute resolution"),
  refundAmount: z.string().optional().describe("Refund amount if partial refund"),
  notes: z.string().describe("Resolution notes")
}); 