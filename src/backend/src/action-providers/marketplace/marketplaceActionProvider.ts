import { z } from "zod";
import {
  ActionProvider,
  CreateAction,
  Network,
  EvmWalletProvider
} from "@coinbase/agentkit";
import { testnet } from "@recallnet/chains";
import { RecallClient } from "@recallnet/sdk/client";
import { createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { 
  MARKETPLACE_ACTION_NAMES, 
  MARKETPLACE_NETWORKS,
  BUCKET_PREFIXES,
  SERVICE_STATUS,
  BOOKING_STATUS,
  ERROR_MESSAGES 
} from "./constants.js";
import { 
  CreateClientSchema,
  CreateServiceSchema,
  ListServicesSchema,
  GetServiceSchema,
  BookServiceSchema,
  ListBookingsSchema,
  GetBookingSchema,
  CompleteServiceSchema,
  FileDisputeSchema,
  ResolveDisputeSchema
} from "./schemas.js";

// Constants for links
const EXPLORER_URL = "https://explorer.testnet.recall.network";
const PORTAL_URL = "https://portal.recall.network";

/**
 * MarketplaceActionProvider provides actions for managing a service marketplace
 * using the Recall Network for data storage
 */
export class MarketplaceActionProvider extends ActionProvider<EvmWalletProvider> {
  private recallClient: RecallClient | null = null;
  private currentNetwork: string | null = null;
  private mainBucket: string | null = null; // We'll use a single bucket for all data

  constructor() {
    super("marketplace", []);
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.CREATE_CLIENT,
    description: "Create a marketplace client for interacting with the service marketplace",
    schema: CreateClientSchema,
  })
  async createMarketplaceClient(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateClientSchema>
  ): Promise<string> {
    try {
      const privateKey = process.env.WALLET_PRIVATE_KEY;
      
      if (!privateKey) {
        return ERROR_MESSAGES.MISSING_PRIVATE_KEY;
      }

      const chainConfig = MARKETPLACE_NETWORKS[args.networkName];
      this.currentNetwork = args.networkName;

      // Create a wallet client from the private key
      const walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey as `0x${string}`),
        chain: chainConfig,
        transport: http(),
      });

      // Create a Recall client from the wallet client
      this.recallClient = new RecallClient({ walletClient });

      // Get wallet address
      if (!this.recallClient.walletClient?.account) {
        return `Successfully created marketplace client for ${args.networkName} network, but wallet account is not available.`;
      }
      
      const walletAddress = this.recallClient.walletClient.account.address;
      const explorerAddressUrl = `${EXPLORER_URL}/address/${walletAddress}`;

      // Initialize the main bucket if it doesn't exist
      if (!this.mainBucket) {
        const bucketManager = this.recallClient.bucketManager();
        try {
          const { result: { bucket }, meta } = await bucketManager.create();
          this.mainBucket = bucket;
          
          // Store initial configuration in the bucket
          const configObject = {
            createdAt: new Date().toISOString(),
            initialized: true
          };
          
          await this._storeObject("config", JSON.stringify(configObject));
          
          return `Successfully created marketplace client for ${args.networkName} network.\nWallet address: ${walletAddress}\nExplorer: ${explorerAddressUrl}\nMain bucket created: ${bucket}`;
        } catch (bucketError) {
          return `Successfully created marketplace client but failed to initialize bucket. Error: ${bucketError instanceof Error ? bucketError.message : String(bucketError)}`;
        }
      }

      return `Successfully created marketplace client for ${args.networkName} network.\nWallet address: ${walletAddress}\nExplorer: ${explorerAddressUrl}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_CLIENT_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.CREATE_SERVICE,
    description: "Create a new service listing in the marketplace",
    schema: CreateServiceSchema,
  })
  async createService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateServiceSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Generate a unique ID for the service
      const serviceId = `service_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Create service object
      const serviceObject = {
        id: serviceId,
        provider: args.provider,
        title: args.title,
        description: args.description,
        date: args.date,
        startTime: args.startTime,
        endTime: args.endTime,
        timeZone: args.timeZone,
        price: args.price,
        status: SERVICE_STATUS.AVAILABLE,
        createdAt: new Date().toISOString()
      };
      
      // Store the service in the bucket
      const key = `${BUCKET_PREFIXES.SERVICES}${serviceId}`;
      const result = await this._storeObject(key, JSON.stringify(serviceObject));
      
      if (result.success) {
        return `Successfully created service "${args.title}" with ID: ${serviceId}.\nProvider: ${args.provider}\nDate: ${args.date}\nTime: ${args.startTime} - ${args.endTime} (${args.timeZone})\nPrice: $${args.price} USD\n${result.message}`;
      } else {
        return `Failed to create service. ${result.message}`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_SERVICE_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.LIST_SERVICES,
    description: "List available services in the marketplace",
    schema: ListServicesSchema,
  })
  async listServices(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ListServicesSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Query services from the bucket
      const filter = args.filter?.toLowerCase() || "";
      const prefix = BUCKET_PREFIXES.SERVICES;
      const services = await this._queryObjects(prefix);
      
      if (!services.success) {
        return `Failed to list services. ${services.message}`;
      }
      
      if (services.data.length === 0) {
        return "No services found in the marketplace.";
      }
      
      // Parse and filter services
      const serviceObjects = services.data
        .map(obj => {
          try {
            return JSON.parse(obj.content);
          } catch (e) {
            return null;
          }
        })
        .filter(service => service !== null)
        .filter(service => 
          service.status === SERVICE_STATUS.AVAILABLE && 
          (!filter || 
            service.title.toLowerCase().includes(filter) ||
            service.provider.toLowerCase().includes(filter) ||
            service.description.toLowerCase().includes(filter)
          )
        );
      
      if (serviceObjects.length === 0) {
        return `No available services found${filter ? ` matching "${filter}"` : ""}.`;
      }
      
      // Format the response
      const servicesOutput = serviceObjects.map((service, index) => {
        return `${index + 1}. ${service.title}\n   Provider: ${service.provider}\n   Date: ${service.date}, ${service.startTime} - ${service.endTime} (${service.timeZone})\n   Price: $${service.price} USD\n   ID: ${service.id}\n`;
      }).join("\n");
      
      return `Available Services${filter ? ` matching "${filter}"` : ""}:\n\n${servicesOutput}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_SERVICE_LISTING} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.GET_SERVICE,
    description: "Get details of a specific service",
    schema: GetServiceSchema,
  })
  async getService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetServiceSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Get the service from the bucket
      const key = `${BUCKET_PREFIXES.SERVICES}${args.serviceId}`;
      const result = await this._getObject(key);
      
      if (!result.success) {
        return `${ERROR_MESSAGES.FAILED_SERVICE_RETRIEVAL} ${result.message}`;
      }
      
      // Parse the service
      try {
        const service = JSON.parse(result.content);
        
        // Format the response
        return `Service Details:\n\nTitle: ${service.title}\nProvider: ${service.provider}\nDescription: ${service.description}\nDate: ${service.date}\nTime: ${service.startTime} - ${service.endTime} (${service.timeZone})\nPrice: $${service.price} USD\nStatus: ${service.status.toUpperCase()}\nService ID: ${service.id}`;
      } catch (parseError) {
        return `${ERROR_MESSAGES.FAILED_SERVICE_RETRIEVAL} Error parsing service data.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_SERVICE_RETRIEVAL} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.BOOK_SERVICE,
    description: "Book an available service",
    schema: BookServiceSchema,
  })
  async bookService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof BookServiceSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // First, get the service
      const serviceKey = `${BUCKET_PREFIXES.SERVICES}${args.serviceId}`;
      const serviceResult = await this._getObject(serviceKey);
      
      if (!serviceResult.success) {
        return `${ERROR_MESSAGES.FAILED_BOOKING_CREATION} Service not found.`;
      }
      
      // Parse the service
      try {
        const service = JSON.parse(serviceResult.content);
        
        // Check if the service is available
        if (service.status !== SERVICE_STATUS.AVAILABLE) {
          return ERROR_MESSAGES.SERVICE_ALREADY_BOOKED;
        }
        
        // Generate a booking ID
        const bookingId = `booking_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Generate a "fake" meeting link (in a real system, this would integrate with Zoom/Meet/Jitsi APIs)
        const meetingLink = `https://${args.meetingPlatform}.example.com/meeting/${bookingId}`;
        
        // Create booking object
        const bookingObject = {
          id: bookingId,
          serviceId: args.serviceId,
          service: {
            title: service.title,
            provider: service.provider,
            date: service.date,
            startTime: service.startTime,
            endTime: service.endTime,
            timeZone: service.timeZone,
            price: service.price
          },
          clientName: args.clientName,
          clientEmail: args.clientEmail,
          meetingPlatform: args.meetingPlatform,
          meetingLink: meetingLink,
          status: BOOKING_STATUS.CONFIRMED,
          meetingNotes: "",
          createdAt: new Date().toISOString()
        };
        
        // Store the booking in the bucket
        const bookingKey = `${BUCKET_PREFIXES.BOOKINGS}${bookingId}`;
        const bookingResult = await this._storeObject(bookingKey, JSON.stringify(bookingObject));
        
        if (!bookingResult.success) {
          return `Failed to create booking. ${bookingResult.message}`;
        }
        
        // Update the service status to BOOKED
        service.status = SERVICE_STATUS.BOOKED;
        service.bookedBy = bookingId;
        service.updatedAt = new Date().toISOString();
        
        // Store the updated service
        const updateResult = await this._storeObject(serviceKey, JSON.stringify(service));
        
        if (!updateResult.success) {
          return `Booking created, but failed to update service status. ${updateResult.message}`;
        }
        
        // Format the response
        return `Service "${service.title}" successfully booked!\n\nBooking Details:\nBooking ID: ${bookingId}\nService: ${service.title}\nProvider: ${service.provider}\nDate: ${service.date}\nTime: ${service.startTime} - ${service.endTime} (${service.timeZone})\nClient: ${args.clientName}\nMeeting Platform: ${args.meetingPlatform}\nMeeting Link: ${meetingLink}\n\nThe AI agent will join the meeting to take notes and assist with any disputes.`;
      } catch (parseError) {
        return `${ERROR_MESSAGES.FAILED_BOOKING_CREATION} Error parsing service data.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_BOOKING_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.LIST_BOOKINGS,
    description: "List bookings filtered by provider or client",
    schema: ListBookingsSchema,
  })
  async listBookings(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ListBookingsSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Query bookings from the bucket
      const prefix = BUCKET_PREFIXES.BOOKINGS;
      const bookings = await this._queryObjects(prefix);
      
      if (!bookings.success) {
        return `Failed to list bookings. ${bookings.message}`;
      }
      
      if (bookings.data.length === 0) {
        return "No bookings found.";
      }
      
      // Parse and filter bookings
      const bookingObjects = bookings.data
        .map(obj => {
          try {
            return JSON.parse(obj.content);
          } catch (e) {
            return null;
          }
        })
        .filter(booking => booking !== null)
        .filter(booking => 
          (!args.provider || booking.service.provider.toLowerCase().includes(args.provider.toLowerCase())) &&
          (!args.client || booking.clientName.toLowerCase().includes(args.client.toLowerCase()))
        );
      
      if (bookingObjects.length === 0) {
        return "No bookings found matching the provided filters.";
      }
      
      // Format the response
      const bookingsOutput = bookingObjects.map((booking, index) => {
        return `${index + 1}. ${booking.service.title}\n   Client: ${booking.clientName}\n   Provider: ${booking.service.provider}\n   Date: ${booking.service.date}, ${booking.service.startTime} - ${booking.service.endTime}\n   Status: ${booking.status.toUpperCase()}\n   Booking ID: ${booking.id}\n`;
      }).join("\n");
      
      return `Bookings${args.provider ? ` for provider "${args.provider}"` : ""}${args.client ? ` by client "${args.client}"` : ""}:\n\n${bookingsOutput}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_BOOKING_LISTING} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.GET_BOOKING,
    description: "Get details of a specific booking",
    schema: GetBookingSchema,
  })
  async getBooking(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBookingSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Get the booking from the bucket
      const key = `${BUCKET_PREFIXES.BOOKINGS}${args.bookingId}`;
      const result = await this._getObject(key);
      
      if (!result.success) {
        return `${ERROR_MESSAGES.FAILED_BOOKING_RETRIEVAL} ${result.message}`;
      }
      
      // Parse the booking
      try {
        const booking = JSON.parse(result.content);
        
        // Format the response
        let response = `Booking Details:\n\n`;
        response += `Service: ${booking.service.title}\n`;
        response += `Provider: ${booking.service.provider}\n`;
        response += `Client: ${booking.clientName} (${booking.clientEmail})\n`;
        response += `Date: ${booking.service.date}\n`;
        response += `Time: ${booking.service.startTime} - ${booking.service.endTime} (${booking.service.timeZone})\n`;
        response += `Price: $${booking.service.price} USD\n`;
        response += `Status: ${booking.status.toUpperCase()}\n`;
        response += `Meeting Platform: ${booking.meetingPlatform}\n`;
        response += `Meeting Link: ${booking.meetingLink}\n`;
        response += `Booking ID: ${booking.id}\n`;
        
        if (booking.meetingNotes) {
          response += `\nMeeting Notes:\n${booking.meetingNotes}\n`;
        }
        
        return response;
      } catch (parseError) {
        return `${ERROR_MESSAGES.FAILED_BOOKING_RETRIEVAL} Error parsing booking data.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_BOOKING_RETRIEVAL} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.COMPLETE_SERVICE,
    description: "Mark a service as completed and add meeting notes",
    schema: CompleteServiceSchema,
  })
  async completeService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CompleteServiceSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Get the booking
      const bookingKey = `${BUCKET_PREFIXES.BOOKINGS}${args.bookingId}`;
      const bookingResult = await this._getObject(bookingKey);
      
      if (!bookingResult.success) {
        return `${ERROR_MESSAGES.FAILED_SERVICE_COMPLETION} Booking not found.`;
      }
      
      // Parse the booking
      try {
        const booking = JSON.parse(bookingResult.content);
        
        // Update booking status and add meeting notes
        booking.status = args.successful ? BOOKING_STATUS.COMPLETED : BOOKING_STATUS.DISPUTED;
        booking.meetingNotes = args.meetingNotes;
        booking.completedAt = new Date().toISOString();
        booking.successful = args.successful;
        if (args.comments) {
          booking.comments = args.comments;
        }
        
        // Store the updated booking
        const updateResult = await this._storeObject(bookingKey, JSON.stringify(booking));
        
        if (!updateResult.success) {
          return `Failed to update booking. ${updateResult.message}`;
        }
        
        // Update the service status
        const serviceKey = `${BUCKET_PREFIXES.SERVICES}${booking.serviceId}`;
        const serviceResult = await this._getObject(serviceKey);
        
        if (serviceResult.success) {
          const service = JSON.parse(serviceResult.content);
          service.status = SERVICE_STATUS.COMPLETED;
          service.updatedAt = new Date().toISOString();
          
          const serviceUpdateResult = await this._storeObject(serviceKey, JSON.stringify(service));
          if (!serviceUpdateResult.success) {
            return `Booking updated, but failed to update service status. ${serviceUpdateResult.message}`;
          }
        }
        
        // Format the response
        if (args.successful) {
          return `Service "${booking.service.title}" has been marked as completed successfully!\n\nMeeting Notes:\n${args.meetingNotes}${args.comments ? `\n\nAdditional Comments:\n${args.comments}` : ""}`;
        } else {
          return `Service "${booking.service.title}" has been marked as disputed.\n\nMeeting Notes:\n${args.meetingNotes}${args.comments ? `\n\nAdditional Comments:\n${args.comments}` : ""}\n\nPlease use the file dispute option to provide more details about the issue.`;
        }
      } catch (parseError) {
        return `${ERROR_MESSAGES.FAILED_SERVICE_COMPLETION} Error parsing booking data.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_SERVICE_COMPLETION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.FILE_DISPUTE,
    description: "File a dispute for a service",
    schema: FileDisputeSchema,
  })
  async fileDispute(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof FileDisputeSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Get the booking
      const bookingKey = `${BUCKET_PREFIXES.BOOKINGS}${args.bookingId}`;
      const bookingResult = await this._getObject(bookingKey);
      
      if (!bookingResult.success) {
        return `${ERROR_MESSAGES.FAILED_DISPUTE_FILING} Booking not found.`;
      }
      
      // Parse the booking
      try {
        const booking = JSON.parse(bookingResult.content);
        
        // Update booking status
        booking.status = BOOKING_STATUS.DISPUTED;
        booking.disputeReason = args.reason;
        booking.disputeEvidence = args.evidence || "";
        booking.disputeFiledAt = new Date().toISOString();
        
        // Store the updated booking
        const updateResult = await this._storeObject(bookingKey, JSON.stringify(booking));
        
        if (!updateResult.success) {
          return `Failed to update booking with dispute. ${updateResult.message}`;
        }
        
        // Create a dispute record
        const disputeId = `dispute_${Date.now()}_${args.bookingId}`;
        const disputeObject = {
          id: disputeId,
          bookingId: args.bookingId,
          serviceId: booking.serviceId,
          reason: args.reason,
          evidence: args.evidence || "",
          status: "pending",
          meetingNotes: booking.meetingNotes || "",
          createdAt: new Date().toISOString()
        };
        
        // Store the dispute
        const disputeKey = `${BUCKET_PREFIXES.DISPUTES}${disputeId}`;
        const disputeResult = await this._storeObject(disputeKey, JSON.stringify(disputeObject));
        
        if (!disputeResult.success) {
          return `Booking marked as disputed, but failed to create dispute record. ${disputeResult.message}`;
        }
        
        // Format the response
        return `Dispute filed for booking ${args.bookingId}.\n\nService: ${booking.service.title}\nProvider: ${booking.service.provider}\nClient: ${booking.clientName}\n\nDispute Reason: ${args.reason}${args.evidence ? `\n\nEvidence: ${args.evidence}` : ""}\n\nThe dispute will be reviewed by the AI agent based on the meeting notes and evidence provided.`;
      } catch (parseError) {
        return `${ERROR_MESSAGES.FAILED_DISPUTE_FILING} Error parsing booking data.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_DISPUTE_FILING} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: MARKETPLACE_ACTION_NAMES.RESOLVE_DISPUTE,
    description: "Resolve a dispute for a service",
    schema: ResolveDisputeSchema,
  })
  async resolveDispute(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ResolveDisputeSchema>
  ): Promise<string> {
    try {
      if (!this._isInitialized()) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Get the booking
      const bookingKey = `${BUCKET_PREFIXES.BOOKINGS}${args.bookingId}`;
      const bookingResult = await this._getObject(bookingKey);
      
      if (!bookingResult.success) {
        return `${ERROR_MESSAGES.FAILED_DISPUTE_RESOLUTION} Booking not found.`;
      }
      
      // Parse the booking
      try {
        const booking = JSON.parse(bookingResult.content);
        
        // Check if the booking is in a disputed state
        if (booking.status !== BOOKING_STATUS.DISPUTED) {
          return `This booking is not currently disputed. Current status: ${booking.status.toUpperCase()}.`;
        }
        
        // Update booking status based on resolution
        booking.status = args.resolution === "no_refund" ? BOOKING_STATUS.COMPLETED : BOOKING_STATUS.REFUNDED;
        booking.disputeResolution = args.resolution;
        booking.disputeResolutionNotes = args.notes;
        booking.refundAmount = args.refundAmount || "0";
        booking.resolvedAt = new Date().toISOString();
        
        // Store the updated booking
        const updateResult = await this._storeObject(bookingKey, JSON.stringify(booking));
        
        if (!updateResult.success) {
          return `Failed to update booking with dispute resolution. ${updateResult.message}`;
        }
        
        // Find and update the dispute record
        const disputes = await this._queryObjects(`${BUCKET_PREFIXES.DISPUTES}`);
        let disputeUpdated = false;
        
        if (disputes.success && disputes.data.length > 0) {
          for (const dispute of disputes.data) {
            try {
              const disputeObj = JSON.parse(dispute.content);
              if (disputeObj.bookingId === args.bookingId) {
                disputeObj.status = "resolved";
                disputeObj.resolution = args.resolution;
                disputeObj.resolutionNotes = args.notes;
                disputeObj.refundAmount = args.refundAmount || "0";
                disputeObj.resolvedAt = new Date().toISOString();
                
                await this._storeObject(dispute.key, JSON.stringify(disputeObj));
                disputeUpdated = true;
                break;
              }
            } catch (e) {
              // Skip this dispute if we can't parse it
              continue;
            }
          }
        }
        
        // Format the response based on resolution
        let response = `Dispute for booking ${args.bookingId} has been resolved.\n\n`;
        response += `Service: ${booking.service.title}\n`;
        response += `Provider: ${booking.service.provider}\n`;
        response += `Client: ${booking.clientName}\n\n`;
        
        switch (args.resolution) {
          case "full_refund":
            response += `Resolution: FULL REFUND to client\n`;
            response += `Refund Amount: $${booking.service.price} USD\n`;
            break;
          case "partial_refund":
            response += `Resolution: PARTIAL REFUND to client\n`;
            response += `Refund Amount: $${args.refundAmount} USD\n`;
            break;
          case "no_refund":
            response += `Resolution: NO REFUND - Payment released to provider\n`;
            break;
        }
        
        response += `\nResolution Notes: ${args.notes}\n`;
        
        if (!disputeUpdated) {
          response += `\nNote: Booking was updated but the corresponding dispute record could not be found.`;
        }
        
        return response;
      } catch (parseError) {
        return `${ERROR_MESSAGES.FAILED_DISPUTE_RESOLUTION} Error parsing booking data.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_DISPUTE_RESOLUTION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  //----------------------------------------------------------------------------
  // Helper methods for bucket operations
  //----------------------------------------------------------------------------
  
  /**
   * Check if the client is initialized
   */
  private _isInitialized(): boolean {
    return this.recallClient !== null && this.mainBucket !== null;
  }
  
  /**
   * Store an object in the bucket
   */
  private async _storeObject(key: string, content: string): Promise<{success: boolean, message: string, txHash?: string}> {
    if (!this.recallClient || !this.mainBucket) {
      return { success: false, message: ERROR_MESSAGES.MISSING_CLIENT };
    }
    
    try {
      const bucketManager = this.recallClient.bucketManager();
      
      // Convert to Blob
      const contentBytes = new TextEncoder().encode(content);
      const file = new File([contentBytes], "data.json", { type: "application/json" });
      
      // Add the object to the bucket
      const { meta: addMeta } = await bucketManager.add(this.mainBucket as `0x${string}`, key, file);
      
      // Generate portal URL
      const encodedPath = encodeURIComponent(key);
      const portalUrl = `${PORTAL_URL}/buckets/${this.mainBucket}?path=${encodedPath}`;
      
      let txHash = "";
      if (addMeta?.tx?.transactionHash) {
        txHash = addMeta.tx.transactionHash;
        const explorerTxUrl = `${EXPLORER_URL}/tx/${txHash}`;
        return { 
          success: true, 
          message: `Data stored.\nPortal: ${portalUrl}\nExplorer: ${explorerTxUrl}`,
          txHash 
        };
      } else {
        return { 
          success: true, 
          message: `Data stored.\nPortal: ${portalUrl}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to store data: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
  
  /**
   * Retrieve an object from the bucket
   */
  private async _getObject(key: string): Promise<{success: boolean, message: string, content: string}> {
    if (!this.recallClient || !this.mainBucket) {
      return { success: false, message: ERROR_MESSAGES.MISSING_CLIENT, content: "" };
    }
    
    try {
      const bucketManager = this.recallClient.bucketManager();
      
      // Get the object from the bucket
      const { result: object } = await bucketManager.get(this.mainBucket as `0x${string}`, key);
      
      if (object) {
        // Convert the binary data to text
        const content = new TextDecoder().decode(object);
        return { success: true, message: "Data retrieved successfully", content };
      } else {
        return { success: false, message: `Object not found with key "${key}"`, content: "" };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to retrieve data: ${error instanceof Error ? error.message : String(error)}`,
        content: "" 
      };
    }
  }
  
  /**
   * Query objects with a prefix
   */
  private async _queryObjects(prefix: string): Promise<{success: boolean, message: string, data: Array<{key: string, content: string}>}> {
    if (!this.recallClient || !this.mainBucket) {
      return { success: false, message: ERROR_MESSAGES.MISSING_CLIENT, data: [] };
    }
    
    try {
      const bucketManager = this.recallClient.bucketManager();
      
      // Query objects in the bucket
      const { result: { objects } } = await bucketManager.query(this.mainBucket as `0x${string}`, { prefix });
      
      if (!objects || objects.length === 0) {
        return { success: true, message: "No objects found", data: [] };
      }
      
      // Retrieve the content of each object
      const results = [];
      for (const obj of objects) {
        try {
          const key = obj.key;
          const { result: content } = await bucketManager.get(this.mainBucket as `0x${string}`, key);
          const contentStr = content ? new TextDecoder().decode(content) : "";
          results.push({ key, content: contentStr });
        } catch (e) {
          // Skip this object if we can't retrieve it
          continue;
        }
      }
      
      return { success: true, message: `Retrieved ${results.length} objects`, data: results };
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to query objects: ${error instanceof Error ? error.message : String(error)}`,
        data: [] 
      };
    }
  }

  supportsNetwork = (network: Network): boolean => network.protocolFamily === "evm";
}

export const marketplaceActionProvider = () => new MarketplaceActionProvider(); 