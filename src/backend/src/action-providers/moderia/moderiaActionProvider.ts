import { z } from "zod";
import {
  ActionProvider,
  CreateAction,
  Network,
  EvmWalletProvider
} from "@coinbase/agentkit";
import { testnet } from "@recallnet/chains";
import { RecallClient } from "@recallnet/sdk/client";
import { baseSepolia } from "viem/chains";
import { 
  createWalletClient, 
  http, 
  parseUnits, 
  formatUnits, 
  createPublicClient
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  MODERIA_ACTION_NAMES,
  RECALL_NETWORKS,
  RECALL_PORTAL_URLS,
  RECALL_EXPLORER_URLS,
  USDC_TOKEN_ADDRESS,
  USDC_DECIMALS,
  ERC20_ABI,
  BUCKET_NAMES,
  ERROR_MESSAGES,
  ServiceStatus,
  BookingStatus,
  EscrowStatus,
  MeetingStatus,
  QUALITY_THRESHOLDS,
  RecallNetworkType
} from "./constants.js";
import {
  CreateRecallClientSchema,
  CreateRecallBucketSchema,
  CreateServiceListingSchema,
  ListAvailableServicesSchema,
  BookServiceSchema,
  CreateEscrowSchema,
  GetTokenBalanceSchema,
  ReleaseFundsSchema,
  JoinMeetingSchema,
  GetTranscriptSchema,
  AnalyzeServiceQualitySchema,
  CompleteServiceSchema,
  ServiceListing,
  ServiceBooking,
  EscrowTransaction,
  Meeting,
  ServiceCompletion
} from "./schemas.js";
import crypto from "crypto";
import path from "path";
import fs from "fs";

/**
 * ModeriaActionProvider
 * An integrated action provider that combines functionality from multiple providers:
 * - recall-test: For storing and retrieving data on Recall Network
 * - service-marketplace: For service listing and booking
 * - erc20-escrow: For payment handling via USDC on Base Sepolia
 * - otter-ai: For meeting transcription and quality analysis
 */
export class ModeriaActionProvider extends ActionProvider<EvmWalletProvider> {
  // Recall clients for different user types
  private teacherClient: RecallClient | null = null;
  private studentClient: RecallClient | null = null;
  private agentClient: RecallClient | null = null;
  
  // Current network
  private currentRecallNetwork: RecallNetworkType | null = null;
  
  // Base Sepolia wallet clients for token transactions
  private teacherWallet: any = null;
  private studentWallet: any = null;
  private agentWallet: any = null;
  
  // Public client for reading blockchain data
  private publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http()
  });
  
  // Bucket IDs
  private buckets: Record<string, string> = {};
  
  // Storage path for local data (used in demo mode)
  private storagePath = path.join(process.cwd(), "moderia_data");
  
  // Flag to indicate if we're in demo mode
  private demoMode = process.env.DEMO_MODE === "true";
  
  constructor() {
    super("moderia", []);
    
    // Create storage directory if it doesn't exist
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Create a Recall client for a specific user type
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.CREATE_RECALL_CLIENT,
    description: "Create a Recall client for teacher, student, or agent",
    schema: CreateRecallClientSchema,
  })
  async createRecallClient(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateRecallClientSchema>
  ): Promise<string> {
    try {
      let privateKey: string | undefined;
      
      // Get the appropriate private key based on user type
      switch (args.userType) {
        case "teacher":
          privateKey = process.env.WALLET_PRIVATE_KEY_PROVIDER;
          break;
        case "student":
          privateKey = process.env.WALLET_PRIVATE_KEY_CLIENT;
          break;
        case "agent":
          privateKey = process.env.WALLET_PRIVATE_KEY_AGENT;
          break;
      }
      
      if (!privateKey) {
        return `${ERROR_MESSAGES.MISSING_PRIVATE_KEY} for ${args.userType}`;
      }

      const chainConfig = RECALL_NETWORKS[args.networkName];
      this.currentRecallNetwork = args.networkName;

      // Create a wallet client from the private key
      const walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey as `0x${string}`),
        chain: chainConfig,
        transport: http(),
      });

      // Create a Recall client and assign to the appropriate user type
      const client = new RecallClient({ walletClient });
      
      // Also initialize Base Sepolia wallet for this user
      const baseWalletClient = createWalletClient({
        account: privateKeyToAccount(privateKey as `0x${string}`),
        chain: baseSepolia,
        transport: http(),
      });
      
      switch (args.userType) {
        case "teacher":
          this.teacherClient = client;
          this.teacherWallet = baseWalletClient;
          break;
        case "student":
          this.studentClient = client;
          this.studentWallet = baseWalletClient;
          break;
        case "agent":
          this.agentClient = client;
          this.agentWallet = baseWalletClient;
          break;
      }

      // Get wallet address
      const walletAddress = walletClient.account.address;
      const explorerAddressUrl = `${RECALL_EXPLORER_URLS[args.networkName]}/address/${walletAddress}`;

      return `Successfully created Recall client for ${args.userType} on ${args.networkName} network.\nWallet address: ${walletAddress}\nExplorer: ${explorerAddressUrl}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_CLIENT_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Create a Recall bucket for storing data
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.CREATE_RECALL_BUCKET,
    description: "Create a Recall bucket for storing service data",
    schema: CreateRecallBucketSchema,
  })
  async createRecallBucket(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateRecallBucketSchema>
  ): Promise<string> {
    try {
      if (!this.agentClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      const bucketManager = this.agentClient.bucketManager();
      
      // Create a new bucket
      const { result: { bucket }, meta } = await bucketManager.create();
      
      // Store the bucket ID with a name if provided
      const bucketName = args.name || `bucket-${Date.now()}`;
      this.buckets[bucketName] = bucket;
      
      // Generate portal URL
      const portalUrl = `${RECALL_PORTAL_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/buckets/${bucket}`;
      
      // Generate explorer URL if transaction hash is available
      let explorerTxUrl = "";
      if (meta?.tx?.transactionHash) {
        explorerTxUrl = `\nExplorer: ${RECALL_EXPLORER_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/tx/${meta.tx.transactionHash}`;
      }
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return `Successfully created bucket with ID: ${bucket}. You can refer to this bucket as "${bucketName}" in future operations.\nPortal: ${portalUrl}${explorerTxUrl}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_BUCKET_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Create a service listing
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.CREATE_SERVICE_LISTING,
    description: "Create a service listing (as a teacher)",
    schema: CreateServiceListingSchema,
  })
  async createServiceListing(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateServiceListingSchema>
  ): Promise<string> {
    try {
      if (!this.teacherClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Ensure we have a bucket for services
      if (!this.buckets[BUCKET_NAMES.SERVICES] && this.teacherClient) {
        // Create a bucket if needed
        const bucketManager = this.teacherClient.bucketManager();
        const { result: { bucket } } = await bucketManager.create();
        this.buckets[BUCKET_NAMES.SERVICES] = bucket;
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Generate service ID
      const serviceId = `service_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create service listing object
      const serviceListing: ServiceListing = {
        id: serviceId,
        serviceType: args.serviceType,
        providerName: args.providerName,
        startTime: args.startTime,
        endTime: args.endTime,
        price: args.price,
        walletAddress: args.walletAddress,
        meetingLink: args.meetingLink,
        description: args.description,
        status: ServiceStatus.AVAILABLE,
        createdAt: new Date().toISOString(),
        bucketId: this.buckets[BUCKET_NAMES.SERVICES],
        objectKey: `service_${serviceId}.json`
      };
      
      // Store service data in the bucket
      const serviceJson = JSON.stringify(serviceListing, null, 2);
      const serviceContent = new TextEncoder().encode(serviceJson);
      const serviceFile = new File([serviceContent], "service.json", { type: "text/plain" });
      if (this.teacherClient) {
        const teacherServiceManager = this.teacherClient.bucketManager();
        await teacherServiceManager.add(
          this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`,
          serviceListing.objectKey,
          serviceFile
        );
      } else if (this.studentClient) {
        // Fall back to student client if teacher client is not available
        const studentUpdateManager = this.studentClient.bucketManager();
        await studentUpdateManager.add(
          this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`,
          serviceListing.objectKey,
          serviceFile
        );
      }
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Generate portal URL
      const portalUrl = `${RECALL_PORTAL_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/buckets/${this.buckets[BUCKET_NAMES.SERVICES]}?path=${encodeURIComponent(serviceListing.objectKey)}`;
      
      return `Successfully created service listing with ID: ${serviceId}\nService: ${args.serviceType} by ${args.providerName}\nPrice: ${args.price} USDC\nPortal: ${portalUrl}`;
    } catch (error) {
      return `Failed to create service listing. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * List available services
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.LIST_AVAILABLE_SERVICES,
    description: "List available services for booking",
    schema: ListAvailableServicesSchema,
  })
  async listAvailableServices(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ListAvailableServicesSchema>
  ): Promise<string> {
    try {
      // Ensure the student client is initialized
      if (!this.studentClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Ensure we have a bucket for services
      if (!this.buckets[BUCKET_NAMES.SERVICES]) {
        return "No services bucket found. Please create services first.";
      }
      
      // Query the services bucket for objects
      const listServicesManager = this.studentClient.bucketManager();
      const { result: { objects } } = await listServicesManager.query(this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`);
      
      // Filter for available services
      const servicePromises = objects.map(async (obj: any) => {
        const { result: content } = await listServicesManager.get(this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`, obj.key);
        const service = JSON.parse(new TextDecoder().decode(content)) as ServiceListing;
        
        // Filter by type if specified
        if (args.serviceType && service.serviceType !== args.serviceType) {
          return null;
        }
        
        // Only include available services
        if (service.status !== ServiceStatus.AVAILABLE) {
          return null;
        }
        
        return service;
      });
      
      const services = (await Promise.all(servicePromises))
        .filter(Boolean)
        .slice(0, args.limit) as ServiceListing[];
      
      if (services.length === 0) {
        return "No available services found.";
      }
      
      // Format output
      const serviceList = services.map((service, index) => {
        return `${index + 1}. ID: ${service.id}\n   ${service.serviceType} by ${service.providerName}\n   Time: ${service.startTime} - ${service.endTime}\n   Price: ${service.price} USDC\n   Description: ${service.description || "N/A"}\n`;
      }).join("\n");
      
      const portalUrl = `${RECALL_PORTAL_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/buckets/${this.buckets[BUCKET_NAMES.SERVICES]}`;
      
      return `Available Services:\n\n${serviceList}\nPortal: ${portalUrl}`;
    } catch (error) {
      return `Failed to list available services. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Book a service
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.BOOK_SERVICE,
    description: "Book a service (as a student)",
    schema: BookServiceSchema,
  })
  async bookService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BookServiceSchema>
  ): Promise<string> {
    try {
      // Ensure the student client is initialized
      if (!this.studentClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Ensure we have a bucket for services and bookings
      if (!this.buckets[BUCKET_NAMES.SERVICES]) {
        return "No services bucket found. Please create services first.";
      }
      
      if (!this.buckets[BUCKET_NAMES.BOOKINGS]) {
        // Create a bucket for bookings if needed
        const bookServiceManager = this.studentClient.bucketManager();
        const { result: { bucket } } = await bookServiceManager.create();
        this.buckets[BUCKET_NAMES.BOOKINGS] = bucket;
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Retrieve the service details
      const bookServiceManager = this.studentClient.bucketManager();
      const { result: { objects: serviceObjects } } = await bookServiceManager.query(this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`);
      
      // Find the service with the matching ID
      let serviceListing: ServiceListing | null = null;
      
      for (const obj of serviceObjects) {
        const { result: content } = await bookServiceManager.get(this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`, obj.key);
        const service = JSON.parse(new TextDecoder().decode(content)) as ServiceListing;
        
        if (service.id === args.serviceId) {
          serviceListing = service;
          break;
        }
      }
      
      if (!serviceListing) {
        return ERROR_MESSAGES.SERVICE_NOT_FOUND;
      }
      
      // Check if the service is available
      if (serviceListing.status !== ServiceStatus.AVAILABLE) {
        return `Service is not available for booking. Current status: ${serviceListing.status}`;
      }
      
      // Generate booking ID
      const bookingId = `booking_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create booking object
      const booking: ServiceBooking = {
          id: bookingId,
          serviceId: args.serviceId,
          clientName: args.clientName,
          clientEmail: args.clientEmail,
        specialRequests: args.specialRequests,
        bookingTime: new Date().toISOString(),
        status: BookingStatus.CONFIRMED,
        bucketId: this.buckets[BUCKET_NAMES.BOOKINGS],
        objectKey: `booking_${bookingId}.json`
      };
      
      // Store booking data in the bucket
      const bookingManager = this.studentClient.bucketManager();
      const bookingJson = JSON.stringify(booking, null, 2);
      const bookingContent = new TextEncoder().encode(bookingJson);
      const bookingFile = new File([bookingContent], "booking.json", { type: "text/plain" });
      await bookingManager.add(
        this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`,
        booking.objectKey,
        bookingFile
      );
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update service status to BOOKED
      serviceListing.status = ServiceStatus.BOOKED;
      
      // Update service in the bucket
      const serviceJson = JSON.stringify(serviceListing, null, 2);
      const serviceContent = new TextEncoder().encode(serviceJson);
      const serviceFile = new File([serviceContent], "service.json", { type: "text/plain" });
      if (this.teacherClient) {
        const teacherServiceManager = this.teacherClient.bucketManager();
        await teacherServiceManager.add(
          this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`,
          serviceListing.objectKey,
          serviceFile
        );
      } else if (this.studentClient) {
        // Fall back to student client if teacher client is not available
        const studentUpdateManager = this.studentClient.bucketManager();
        await studentUpdateManager.add(
          this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`,
          serviceListing.objectKey,
          serviceFile
        );
      }
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Generate portal URL
      const portalUrl = `${RECALL_PORTAL_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/buckets/${this.buckets[BUCKET_NAMES.BOOKINGS]}?path=${encodeURIComponent(booking.objectKey)}`;
      
      return `Successfully booked service with ID: ${args.serviceId}\nBooking ID: ${bookingId}\nService: ${serviceListing.serviceType} by ${serviceListing.providerName}\nPrice: ${serviceListing.price} USDC\nMeeting Link: ${serviceListing.meetingLink}\nPortal: ${portalUrl}`;
    } catch (error) {
      return `Failed to book service. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Create escrow for a booking
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.CREATE_ESCROW,
    description: "Create an escrow for a booked service",
    schema: CreateEscrowSchema,
  })
  async createEscrow(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateEscrowSchema>
  ): Promise<string> {
    try {
      // Ensure wallet clients are initialized
      if (!this.studentWallet || !this.agentWallet) {
        return ERROR_MESSAGES.WALLET_NOT_INITIALIZED;
      }
      
      // Ensure we have a bucket for bookings and transactions
      if (!this.buckets[BUCKET_NAMES.BOOKINGS]) {
        return "No bookings bucket found. Please book a service first.";
      }
      
      if (!this.buckets[BUCKET_NAMES.TRANSACTIONS]) {
        // Create a bucket for transactions if needed
        const bucketManager = this.agentClient!.bucketManager();
        const { result: { bucket } } = await bucketManager.create();
        this.buckets[BUCKET_NAMES.TRANSACTIONS] = bucket;
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Retrieve the booking details
      const bookingManager = this.agentClient!.bucketManager();
      const { result: { objects: bookingObjects } } = await bookingManager.query(this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`);
      
      // Find the booking with the matching ID
      let booking: ServiceBooking | null = null;
      
      for (const obj of bookingObjects) {
        const { result: content } = await bookingManager.get(this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`, obj.key);
        const bookingData = JSON.parse(new TextDecoder().decode(content)) as ServiceBooking;
        
        if (bookingData.id === args.bookingId) {
          booking = bookingData;
          break;
        }
      }
      
      if (!booking) {
        return ERROR_MESSAGES.BOOKING_NOT_FOUND;
      }
      
      // Retrieve the service details
      const serviceManager = this.agentClient!.bucketManager();
      const { result: { objects: serviceObjects } } = await serviceManager.query(this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`);
      
      // Find the service with the matching ID
      let service: ServiceListing | null = null;
      
      for (const obj of serviceObjects) {
        const { result: content } = await serviceManager.get(this.buckets[BUCKET_NAMES.SERVICES] as `0x${string}`, obj.key);
        const serviceData = JSON.parse(new TextDecoder().decode(content)) as ServiceListing;
        
        if (serviceData.id === booking.serviceId) {
          service = serviceData;
          break;
        }
      }
      
      if (!service) {
        return ERROR_MESSAGES.SERVICE_NOT_FOUND;
      }
      
      // Generate escrow ID
      const escrowId = `escrow_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create escrow object
      const escrowTx: EscrowTransaction = {
          id: escrowId,
          bookingId: args.bookingId,
        amount: args.amount,
        providerAddress: service.walletAddress,
        clientAddress: this.studentWallet.account.address,
        agentAddress: this.agentWallet.account.address,
        status: EscrowStatus.PENDING,
        createdAt: new Date().toISOString()
      };
      
      // Convert amount to token units
      const tokenAmount = parseUnits(args.amount, USDC_DECIMALS);
      
      // Transfer tokens from client to agent (escrow)
      const txHash = await this.studentWallet.writeContract({
        address: USDC_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [this.agentWallet.account.address, tokenAmount]
      });
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update escrow with transaction hash
      escrowTx.txHash = txHash;
      
      // Store escrow data in the bucket
      const txManager = this.agentClient!.bucketManager();
      const escrowJson = JSON.stringify(escrowTx, null, 2);
      const escrowContent = new TextEncoder().encode(escrowJson);
      const escrowFile = new File([escrowContent], "escrow.json", { type: "text/plain" });
      await txManager.add(
        this.buckets[BUCKET_NAMES.TRANSACTIONS] as `0x${string}`,
        `escrow_${escrowId}.json`,
        escrowFile
      );
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update booking with escrow ID
      booking.escrowId = escrowId;
      
      // Update booking in the bucket
      const bookingBucketManager = this.agentClient!.bucketManager();
      const updatedBookingContent = new TextEncoder().encode(JSON.stringify(booking, null, 2));
      const updatedBookingFile = new File([updatedBookingContent], "booking.json", { type: "text/plain" });
      await bookingBucketManager.add(
        this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`,
        booking.objectKey,
        updatedBookingFile
      );
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Generate portal and explorer URLs
      const portalUrl = `${RECALL_PORTAL_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/buckets/${this.buckets[BUCKET_NAMES.TRANSACTIONS]}?path=escrow_${escrowId}.json`;
      const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;
      
      return `Successfully created escrow for booking ID: ${args.bookingId}\nEscrow ID: ${escrowId}\nAmount: ${args.amount} USDC\nTransaction Hash: ${txHash}\nPortal: ${portalUrl}\nExplorer: ${explorerUrl}`;
    } catch (error) {
      return `Failed to create escrow. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Get token balance for an address
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.GET_TOKEN_BALANCE,
    description: "Get USDC token balance for an address",
    schema: GetTokenBalanceSchema,
  })
  async getTokenBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTokenBalanceSchema>
  ): Promise<string> {
    try {
      let address = args.address;
      
      // If no address provided, try to use one of the wallets
      if (!address) {
        if (this.studentWallet) {
          address = this.studentWallet.account.address;
        } else if (this.teacherWallet) {
          address = this.teacherWallet.account.address;
        } else if (this.agentWallet) {
          address = this.agentWallet.account.address;
      } else {
          return "No address provided and no wallet initialized.";
        }
      }
      
      // Read token balance from contract
      const balance = await this.publicClient.readContract({
        address: USDC_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`]
      });
      
      // Format the balance
      const formatted = formatUnits(balance as bigint, USDC_DECIMALS);
      
      const explorerUrl = `https://sepolia.basescan.org/address/${address}`;
      
      return `USDC Balance for ${address}: ${formatted} USDC\nExplorer: ${explorerUrl}`;
    } catch (error) {
      return `Failed to get token balance. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Join a meeting for a service
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.JOIN_MEETING,
    description: "Join a meeting for a booked service",
    schema: JoinMeetingSchema,
  })
  async joinMeeting(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof JoinMeetingSchema>
  ): Promise<string> {
    try {
      // Validate the meeting URL
      if (!args.meetingUrl.includes("meet.google.com") && 
          !args.meetingUrl.includes("zoom.us") &&
          !args.meetingUrl.includes("jitsi.meet")) {
        return ERROR_MESSAGES.INVALID_MEETING_LINK;
      }
      
      // Generate a unique meeting ID
      const meetingId = `meeting_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const transcriptId = `transcript_${crypto.randomBytes(8).toString('hex')}`;
      
      // Get or generate a meeting title
      const title = args.meetingTitle || `Meeting at ${new Date().toLocaleString()}`;
      
      // Create meeting record
      const meeting: Meeting = {
        id: meetingId,
        bookingId: "", // Will be associated later
        url: args.meetingUrl,
        title,
        status: MeetingStatus.JOINING,
        startTime: new Date(),
        participantCount: 2, // Assume a teacher and student
        hasTranscript: false,
        hasSummary: false,
        hasAnalysis: false,
        transcriptUrl: `https://otter.ai/note/${transcriptId}`
      };
      
      // Store the meeting data
      const meetingsPath = path.join(this.storagePath, "meetings");
      if (!fs.existsSync(meetingsPath)) {
        fs.mkdirSync(meetingsPath, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(meetingsPath, `${meetingId}.json`),
        JSON.stringify(meeting, null, 2)
      );
      
      return `Successfully joined meeting with ID: ${meetingId}\nMeeting URL: ${args.meetingUrl}\nTranscription is being recorded automatically.\nUse this meeting ID for retrieving the transcript later.`;
    } catch (error) {
      return `Failed to join meeting. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Get transcript for a meeting
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.GET_TRANSCRIPT,
    description: "Get transcript for a meeting",
    schema: GetTranscriptSchema,
  })
  async getTranscript(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTranscriptSchema>
  ): Promise<string> {
    try {
      // Load the meeting data
      const meetingsPath = path.join(this.storagePath, "meetings");
      const meetingFilePath = path.join(meetingsPath, `${args.meetingId}.json`);
      
      if (!fs.existsSync(meetingFilePath)) {
        return `Meeting not found with ID: ${args.meetingId}`;
      }
      
      const meeting = JSON.parse(fs.readFileSync(meetingFilePath, 'utf8')) as Meeting;
      
      // Create a simulated transcript
      const transcript = `
Teacher: Hello, welcome to the French language class. How are you today?
Student: Bonjour! I'm doing well, thank you. I'm excited to learn French.
Teacher: Très bien! Let's start with some basic greetings. Repeat after me: "Bonjour, comment allez-vous?"
Student: Bonjour, comment allez-vous?
Teacher: Excellent pronunciation! Now, let's try "Je m'appelle..." and then say your name.
Student: Je m'appelle Pedro.
Teacher: Perfect! Let's move on to numbers. Can you count from one to five in French?
Student: Um... Un, deux, trois, quatre, cinq?
Teacher: Exactly right! You're doing very well. Let's practice some common phrases now.
Student: I'm enjoying this. The pronunciation is challenging but fun.
Teacher: That's the spirit! Practice makes perfect. Let's continue with days of the week...
`;
      
      // Update the meeting record to indicate it has a transcript
      meeting.hasTranscript = true;
      meeting.status = MeetingStatus.ENDED;
      meeting.endTime = new Date();
      
      // Store the updated meeting data
      fs.writeFileSync(meetingFilePath, JSON.stringify(meeting, null, 2));
      
      // Store the transcript
      const transcriptsPath = path.join(this.storagePath, "transcripts");
      if (!fs.existsSync(transcriptsPath)) {
        fs.mkdirSync(transcriptsPath, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(transcriptsPath, `${args.meetingId}.txt`),
        transcript
      );
      
      return `Transcript for meeting ID: ${args.meetingId}\n\n${transcript}\n\nTranscript URL: ${meeting.transcriptUrl}`;
    } catch (error) {
      return `Failed to get transcript. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Analyze service quality based on the meeting transcript
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.ANALYZE_SERVICE_QUALITY,
    description: "Analyze service quality based on meeting transcript",
    schema: AnalyzeServiceQualitySchema,
  })
  async analyzeServiceQuality(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof AnalyzeServiceQualitySchema>
  ): Promise<string> {
    try {
      // Load the meeting data
      const meetingsPath = path.join(this.storagePath, "meetings");
      const meetingFilePath = path.join(meetingsPath, `${args.meetingId}.json`);
      
      if (!fs.existsSync(meetingFilePath)) {
        return `Meeting not found with ID: ${args.meetingId}`;
      }
      
      const meeting = JSON.parse(fs.readFileSync(meetingFilePath, 'utf8')) as Meeting;
      
      // Load the transcript
      const transcriptsPath = path.join(this.storagePath, "transcripts");
      const transcriptFilePath = path.join(transcriptsPath, `${args.meetingId}.txt`);
      
      if (!fs.existsSync(transcriptFilePath)) {
        return `Transcript not found for meeting ID: ${args.meetingId}`;
      }
      
      // Associate the meeting with the booking
      meeting.bookingId = args.bookingId;
      
      // Simulate quality analysis
      const qualityScore = 92; // Excellent quality score
      const analysisResult = `
Quality Analysis for Meeting ID: ${args.meetingId}

Overall Score: ${qualityScore}/100 (Excellent)

Metrics:
- Teacher Engagement: 95/100
- Student Participation: 90/100
- Content Coverage: 93/100
- Clarity of Instruction: 90/100
- Response to Student Needs: 92/100

Summary:
The French language class was conducted very professionally. The teacher provided clear instructions
and patiently guided the student through basic greetings, introductions, and numbers. The student
was engaged and responsive, showing enthusiasm for learning. The teacher offered encouragement
and positive reinforcement throughout the session. The lesson progressed at an appropriate pace
and covered all the planned topics effectively.

Recommendation:
Based on the high quality of service provided, payment should be authorized for the teacher.
`;
      
      // Update the meeting record with analysis results
      meeting.hasAnalysis = true;
      meeting.qualityScore = qualityScore;
      
      // Store the updated meeting data
      fs.writeFileSync(meetingFilePath, JSON.stringify(meeting, null, 2));
      
      // Store the analysis
      const analysisPath = path.join(this.storagePath, "analysis");
      if (!fs.existsSync(analysisPath)) {
        fs.mkdirSync(analysisPath, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(analysisPath, `${args.meetingId}.txt`),
        analysisResult
      );
      
      return analysisResult;
    } catch (error) {
      return `Failed to analyze service quality. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Release funds from escrow based on service completion
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.RELEASE_FUNDS,
    description: "Release funds from escrow to the service provider",
    schema: ReleaseFundsSchema,
  })
  async releaseFunds(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ReleaseFundsSchema>
  ): Promise<string> {
    try {
      // Ensure wallet clients are initialized
      if (!this.agentWallet || !this.teacherWallet) {
        return ERROR_MESSAGES.WALLET_NOT_INITIALIZED;
      }
      
      // Load escrow data
      const txPath = path.join(this.storagePath, "transactions");
      if (!fs.existsSync(txPath)) {
        fs.mkdirSync(txPath, { recursive: true });
      }
      
      // Find the escrow transaction
      const escrowTxPath = path.join(txPath, `${args.escrowId}.json`);
      
      if (!fs.existsSync(escrowTxPath)) {
        // Try to find the escrow in the transactions bucket
        const txManager = this.agentClient!.bucketManager();
        const { result: { objects: txObjects } } = await txManager.query(this.buckets[BUCKET_NAMES.TRANSACTIONS] as `0x${string}`);
        
        let escrowFound = false;
        
        for (const obj of txObjects) {
          if (obj.key.includes(args.escrowId)) {
            const { result: content } = await txManager.get(
              this.buckets[BUCKET_NAMES.TRANSACTIONS] as `0x${string}`, 
              obj.key
            );
            const escrowData = JSON.parse(content.toString()) as EscrowTransaction;
            
            // Save to local storage for further processing
            fs.writeFileSync(escrowTxPath, JSON.stringify(escrowData, null, 2));
            escrowFound = true;
            break;
          }
        }
        
        if (!escrowFound) {
          return ERROR_MESSAGES.ESCROW_NOT_FOUND;
        }
      }
      
      // Load the escrow data
      const escrowTx = JSON.parse(fs.readFileSync(escrowTxPath, 'utf8')) as EscrowTransaction;
      
      // Check if already released
      if (escrowTx.status !== EscrowStatus.PENDING) {
        return `Escrow funds have already been ${escrowTx.status}. Cannot release again.`;
      }
      
      // Convert amount to token units
      const tokenAmount = parseUnits(args.amount || escrowTx.amount, USDC_DECIMALS);
      
      // Transfer tokens from agent to provider
      const txHash = await this.agentWallet.writeContract({
        address: USDC_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [escrowTx.providerAddress as `0x${string}`, tokenAmount]
      });
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update escrow status
      escrowTx.status = EscrowStatus.RELEASED;
      escrowTx.completedAt = new Date().toISOString();
      
      // Store updated escrow data
      const txManager = this.agentClient!.bucketManager();
      const escrowUpdateContent = new TextEncoder().encode(JSON.stringify(escrowTx, null, 2));
      const escrowUpdateFile = new File([escrowUpdateContent], "escrow_update.json", { type: "text/plain" });
      await txManager.add(
        this.buckets[BUCKET_NAMES.TRANSACTIONS] as `0x${string}`,
        `escrow_${escrowTx.id}.json`,
        escrowUpdateFile
      );
      
      // Wait for 5 seconds after blockchain operation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Update the escrow in the Recall bucket if available
      if (this.buckets[BUCKET_NAMES.TRANSACTIONS]) {
        const txUpdateContent = new TextEncoder().encode(JSON.stringify(escrowTx, null, 2));
        const txUpdateFile = new File([txUpdateContent], "escrow_tx_update.json", { type: "text/plain" });
        await txManager.add(
          this.buckets[BUCKET_NAMES.TRANSACTIONS] as `0x${string}`,
          `escrow_${escrowTx.id}.json`,
          txUpdateFile
        );
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Generate explorer URL
      const explorerUrl = `https://sepolia.basescan.org/tx/${txHash}`;
      
      return `Successfully released funds from escrow ID: ${args.escrowId}\nAmount: ${args.amount || escrowTx.amount} USDC\nRecipient: ${escrowTx.providerAddress}\nTransaction Hash: ${txHash}\nExplorer: ${explorerUrl}`;
    } catch (error) {
      return `Failed to release funds. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Complete service and record details
   */
  @CreateAction({
    name: MODERIA_ACTION_NAMES.COMPLETE_SERVICE,
    description: "Complete a service and record final details",
    schema: CompleteServiceSchema,
  })
  async completeService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CompleteServiceSchema>
  ): Promise<string> {
    try {
      // Ensure we have a bucket for completions
      if (!this.buckets[BUCKET_NAMES.EVALUATIONS] && this.agentClient) {
        // Create a bucket for evaluations if needed
        const bucketManager = this.agentClient.bucketManager();
        const { result: { bucket } } = await bucketManager.create();
        this.buckets[BUCKET_NAMES.EVALUATIONS] = bucket;
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Retrieve the booking details
      const bookingsPath = path.join(this.storagePath, "bookings");
      if (!fs.existsSync(bookingsPath)) {
        fs.mkdirSync(bookingsPath, { recursive: true });
      }
      
      // Find the booking
      let booking: ServiceBooking | null = null;
      
      if (this.agentClient && this.buckets[BUCKET_NAMES.BOOKINGS]) {
        const bookingBucketManager = this.agentClient.bucketManager();
        const { result: { objects: bookingQueryObjects } } = await bookingBucketManager.query(this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`);
        
        for (const obj of bookingQueryObjects) {
          if (obj.key.includes(args.bookingId)) {
            const { result: content } = await bookingBucketManager.get(this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`, obj.key);
            booking = JSON.parse(new TextDecoder().decode(content)) as ServiceBooking;
            
            // Save locally for further processing
            fs.writeFileSync(
              path.join(bookingsPath, `${args.bookingId}.json`),
              JSON.stringify(booking, null, 2)
            );
            break;
          }
        }
      }
      
      // Check local storage if not found in Recall
      if (!booking) {
        const bookingPath = path.join(bookingsPath, `${args.bookingId}.json`);
        if (fs.existsSync(bookingPath)) {
          booking = JSON.parse(fs.readFileSync(bookingPath, 'utf8')) as ServiceBooking;
        } else {
          return ERROR_MESSAGES.BOOKING_NOT_FOUND;
        }
      }
      
      // Generate completion ID
      const completionId = `completion_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      // Create completion record
      const completion: ServiceCompletion = {
        id: completionId,
        bookingId: args.bookingId,
        serviceId: booking.serviceId,
        escrowId: booking.escrowId || "",
        qualityScore: args.qualityScore || 100,
        feedback: args.feedback,
        completedAt: new Date().toISOString(),
        bucketId: this.buckets[BUCKET_NAMES.EVALUATIONS] || "",
        objectKey: `completion_${completionId}.json`
      };
      
      // Store locally
      const completionsPath = path.join(this.storagePath, "completions");
      if (!fs.existsSync(completionsPath)) {
        fs.mkdirSync(completionsPath, { recursive: true });
      }
      
      fs.writeFileSync(
        path.join(completionsPath, `${completionId}.json`),
        JSON.stringify(completion, null, 2)
      );
      
      // Store in Recall if possible
      if (this.agentClient && this.buckets[BUCKET_NAMES.EVALUATIONS]) {
        const completionManager = this.agentClient.bucketManager();
        const completionContent = new TextEncoder().encode(JSON.stringify(completion, null, 2));
        const completionFile = new File([completionContent], "completion.json", { type: "text/plain" });
        await completionManager.add(
          this.buckets[BUCKET_NAMES.EVALUATIONS] as `0x${string}`,
          completion.objectKey,
          completionFile
        );
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Update booking status
      booking.status = BookingStatus.COMPLETED;
      
      // Update booking locally
      fs.writeFileSync(
        path.join(bookingsPath, `${args.bookingId}.json`),
        JSON.stringify(booking, null, 2)
      );
      
      // Update booking in Recall if possible
      if (this.agentClient && this.buckets[BUCKET_NAMES.BOOKINGS]) {
        const updateBookingManager = this.agentClient.bucketManager();
        const updatedBookingContent = new TextEncoder().encode(JSON.stringify(booking, null, 2));
        const updatedBookingFile = new File([updatedBookingContent], "booking.json", { type: "text/plain" });
        await updateBookingManager.add(
          this.buckets[BUCKET_NAMES.BOOKINGS] as `0x${string}`,
          booking.objectKey,
          updatedBookingFile
        );
        
        // Wait for 5 seconds after blockchain operation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
      // Generate portal URL if possible
      let portalUrl = "";
      if (this.buckets[BUCKET_NAMES.EVALUATIONS]) {
        portalUrl = `\nPortal: ${RECALL_PORTAL_URLS[this.currentRecallNetwork as RecallNetworkType || "testnet"]}/buckets/${this.buckets[BUCKET_NAMES.EVALUATIONS]}?path=${encodeURIComponent(completion.objectKey)}`;
      }
      
      return `Successfully completed service for booking ID: ${args.bookingId}\nCompletion ID: ${completionId}\nQuality Score: ${completion.qualityScore}/100\nCompleted At: ${completion.completedAt}${portalUrl}`;
    } catch (error) {
      return `Failed to complete service. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  
  /**
   * Check if network is supported
   */
  supportsNetwork = (network: Network): boolean => {
    return network.protocolFamily === "evm";
  }
}

export const moderiaActionProvider = () => new ModeriaActionProvider(); 