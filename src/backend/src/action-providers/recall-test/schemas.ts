import { z } from "zod";

// Basic schemas for the Recall action provider
export const CreateRecallClientSchema = z.object({
  networkName: z.string()
});

export const GetRecallBalanceSchema = z.object({
  address: z.string().optional()
});

export const StoreRecallDataSchema = z.object({
  key: z.string(),
  value: z.string()
});

export const RetrieveRecallDataSchema = z.object({
  key: z.string(),
  bucket: z.string().optional()
});

export const PurchaseRecallCreditSchema = z.object({
  amount: z.string() // Amount of ETH to spend on credits
});

export const CreateRecallBucketSchema = z.object({
  name: z.string().optional()
});

export const AddObjectToBucketSchema = z.object({
  bucket: z.string(),
  key: z.string(),
  content: z.string(),
  contentType: z.string().optional()
});

export const QueryBucketObjectsSchema = z.object({
  bucket: z.string(),
  prefix: z.string().optional()
});

export const GetBucketObjectSchema = z.object({
  bucket: z.string(),
  key: z.string()
});

// Marketplace schemas
export const CreateServiceSchema = z.object({
  providerName: z.string(),
  providerWallet: z.string(),
  serviceType: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string().default("USD"),
  durationMinutes: z.number(),
  date: z.string(),
  time: z.string(),
  timezone: z.string(),
  meetingLink: z.string().optional(),
  tags: z.array(z.string()).default([])
});

export const FindServicesSchema = z.object({
  serviceType: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  tags: z.array(z.string()).optional()
});

export const CreateBookingSchema = z.object({
  serviceId: z.string(),
  clientName: z.string(),
  clientWallet: z.string(),
  notes: z.string().optional()
});

export const ReviewServiceSchema = z.object({
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string(),
  disputed: z.boolean().default(false),
  disputeReason: z.string().optional()
});

export const StoreMeetingNotesSchema = z.object({
  bookingId: z.string(),
  notes: z.string()
});

export const ResolveDisputeSchema = z.object({
  bookingId: z.string(),
  resolution: z.string(),
  refundPercentage: z.number().min(0).max(100)
});

export type CreateRecallClientInput = z.infer<typeof CreateRecallClientSchema>;
export type GetRecallBalanceInput = z.infer<typeof GetRecallBalanceSchema>;
export type StoreRecallDataInput = z.infer<typeof StoreRecallDataSchema>;
export type RetrieveRecallDataInput = z.infer<typeof RetrieveRecallDataSchema>;
export type PurchaseRecallCreditInput = z.infer<typeof PurchaseRecallCreditSchema>;
export type CreateRecallBucketInput = z.infer<typeof CreateRecallBucketSchema>;
export type AddObjectToBucketInput = z.infer<typeof AddObjectToBucketSchema>;
export type QueryBucketObjectsInput = z.infer<typeof QueryBucketObjectsSchema>;
export type GetBucketObjectInput = z.infer<typeof GetBucketObjectSchema>; 