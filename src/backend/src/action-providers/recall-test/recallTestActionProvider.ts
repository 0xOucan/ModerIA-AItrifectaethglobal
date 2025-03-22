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
  RECALL_ACTION_NAMES, 
  RECALL_NETWORKS, 
  RECALL_TEST_DESCRIPTION, 
  ERROR_MESSAGES,
  BOOKING_STATUS,
  SERVICE_TYPES,
  MARKETPLACE_BUCKETS
} from "./constants.js";
import { 
  CreateRecallClientSchema, 
  GetRecallBalanceSchema,
  RetrieveRecallDataSchema,
  StoreRecallDataSchema,
  PurchaseRecallCreditSchema,
  CreateRecallBucketSchema,
  AddObjectToBucketSchema,
  QueryBucketObjectsSchema,
  GetBucketObjectSchema,
  CreateServiceSchema,
  FindServicesSchema,
  CreateBookingSchema,
  ReviewServiceSchema,
  StoreMeetingNotesSchema,
  ResolveDisputeSchema
} from "./schemas.js";

// Constants for links
const EXPLORER_URL = "https://explorer.testnet.recall.network";
const PORTAL_URL = "https://portal.recall.network";

/**
 * RecallTestActionProvider provides actions for interacting with the Recall Network
 * This includes creating a client, storing and retrieving data
 */
export class RecallTestActionProvider extends ActionProvider<EvmWalletProvider> {
  private recallClient: RecallClient | null = null;
  private currentNetwork: string | null = null;
  private buckets: Record<string, string> = {}; // Map to store created bucket IDs

  constructor() {
    super("recall-test", []);
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.CREATE_CLIENT,
    description: "Create a Recall client for interacting with the Recall Network",
    schema: CreateRecallClientSchema,
  })
  async createRecallClient(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateRecallClientSchema>
  ): Promise<string> {
    try {
      const privateKey = process.env.WALLET_PRIVATE_KEY;
      
      if (!privateKey) {
        return ERROR_MESSAGES.MISSING_PRIVATE_KEY;
      }

      // Type assertion to ensure networkName is a valid key
      const networkName = args.networkName as keyof typeof RECALL_NETWORKS;
      if (!RECALL_NETWORKS[networkName]) {
        return `Network ${args.networkName} is not supported. Available networks: ${Object.keys(RECALL_NETWORKS).join(', ')}`;
      }

      const chainConfig = RECALL_NETWORKS[networkName];
      this.currentNetwork = args.networkName;

      // Create a wallet client from the private key
      const walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey as `0x${string}`),
        chain: chainConfig,
        transport: http(),
      });

      // Create a Recall client from the wallet client
      this.recallClient = new RecallClient({ walletClient });

      // Get wallet address - Fix: Add null check and optional chaining
      if (!this.recallClient.walletClient?.account) {
        return `Successfully created Recall client for ${args.networkName} network, but wallet account is not available.`;
      }
      
      const walletAddress = this.recallClient.walletClient.account.address;
      const explorerAddressUrl = `${EXPLORER_URL}/address/${walletAddress}`;

      return `Successfully created Recall client for ${args.networkName} network.\nWallet address: ${walletAddress}\nExplorer: ${explorerAddressUrl}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_CLIENT_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.GET_BALANCE,
    description: "Get the balance of a Recall account",
    schema: GetRecallBalanceSchema,
  })
  async getRecallBalance(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetRecallBalanceSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      let address = args.address;
      
      if (!address && this.recallClient.walletClient?.account) {
        // If no address provided, use the connected wallet address
        address = this.recallClient.walletClient.account.address;
      }

      if (!address) {
        return "No address provided and no wallet connected.";
      }

      // Here we would implement the actual wallet balance check
      // This is a placeholder - in a real implementation we would query the chain
      const balance = "1.0 RCL"; // Replace with actual balance query
      const explorerAddressUrl = `${EXPLORER_URL}/address/${address}`;

      return `Balance for ${address}: ${balance}\nExplorer: ${explorerAddressUrl}`;
    } catch (error) {
      return `Failed to get balance. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.STORE_DATA,
    description: "Store data on the Recall network",
    schema: StoreRecallDataSchema,
  })
  async storeRecallData(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof StoreRecallDataSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Here you would implement the actual data storage
      // This is a placeholder for demonstration
      const txResult = { hash: "0x123...456" }; // Replace with actual tx result
      const explorerTxUrl = `${EXPLORER_URL}/tx/${txResult.hash}`;

      return `Successfully stored data with key: ${args.key}. Transaction hash: ${txResult.hash}\nExplorer: ${explorerTxUrl}`;
    } catch (error) {
      return `Failed to store data. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.RETRIEVE_DATA,
    description: "Retrieve data from the Recall network",
    schema: RetrieveRecallDataSchema,
  })
  async retrieveRecallData(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof RetrieveRecallDataSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Here you would implement the actual data retrieval
      // This is a placeholder for demonstration
      const data = { value: "Example data for " + args.key }; // Replace with actual retrieved data
      
      // Fix: Check if bucket property exists in schema, otherwise use default
      // Access the property via index notation to avoid TypeScript errors
      const bucketId = ('bucket' in args) ? args['bucket'] as string : "default-bucket";
      const encodedPath = encodeURIComponent(args.key);
      const portalUrl = `${PORTAL_URL}/buckets/${bucketId}?path=${encodedPath}`;

      return `Retrieved data for key ${args.key}: ${JSON.stringify(data.value)}\nPortal: ${portalUrl}`;
    } catch (error) {
      return `Failed to retrieve data. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.PURCHASE_CREDIT,
    description: "Purchase credits on the Recall network",
    schema: PurchaseRecallCreditSchema,
  })
  async purchaseRecallCredit(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof PurchaseRecallCreditSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Set up credit manager
      const creditManager = this.recallClient.creditManager();
      
      // Buy credits with the specified amount of ETH
      const parsedAmount = parseEther(args.amount);
      const { meta: creditMeta } = await creditManager.buy(parsedAmount);
      
      if (creditMeta?.tx?.transactionHash) {
        const explorerTxUrl = `${EXPLORER_URL}/tx/${creditMeta.tx.transactionHash}`;
        return `Successfully purchased credits with ${args.amount} ETH. Transaction hash: ${creditMeta.tx.transactionHash}\nExplorer: ${explorerTxUrl}`;
      } else {
        return `Credits purchased, but transaction hash not available.`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_CREDIT_PURCHASE} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.CREATE_BUCKET,
    description: "Create a new bucket on the Recall network",
    schema: CreateRecallBucketSchema,
  })
  async createRecallBucket(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateRecallBucketSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      const bucketManager = this.recallClient.bucketManager();
      
      // Create a new bucket
      const { result: { bucket }, meta } = await bucketManager.create();
      
      // Store the bucket ID with a name if provided
      const bucketName = args.name || `bucket-${Date.now()}`;
      this.buckets[bucketName] = bucket;
      
      // Generate portal URL
      const portalUrl = `${PORTAL_URL}/buckets/${bucket}`;
      
      // Generate explorer URL if transaction hash is available
      let explorerTxUrl = "";
      if (meta?.tx?.transactionHash) {
        explorerTxUrl = `\nExplorer: ${EXPLORER_URL}/tx/${meta.tx.transactionHash}`;
      }
      
      return `Successfully created bucket with ID: ${bucket}. You can refer to this bucket as "${bucketName}" in future operations.\nPortal: ${portalUrl}${explorerTxUrl}`;
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_BUCKET_CREATION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.ADD_OBJECT,
    description: "Add an object to a bucket on the Recall network",
    schema: AddObjectToBucketSchema,
  })
  async addObjectToBucket(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof AddObjectToBucketSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Resolve the bucket ID (either direct ID or name reference)
      const bucketId = this.buckets[args.bucket] || args.bucket;
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Convert the content string to a Uint8Array
      const content = new TextEncoder().encode(args.content);
      
      // Create a File object with the content
      const contentType = args.contentType || "text/plain";
      const file = new File([content], "file.txt", { type: contentType });
      
      // Add the object to the bucket - cast bucket ID to proper hex type
      const { meta: addMeta } = await bucketManager.add(bucketId as `0x${string}`, args.key, file);
      
      // Generate portal URL with the path
      const encodedPath = encodeURIComponent(args.key);
      const portalUrl = `${PORTAL_URL}/buckets/${bucketId}?path=${encodedPath}`;
      
      if (addMeta?.tx?.transactionHash) {
        const explorerTxUrl = `${EXPLORER_URL}/tx/${addMeta.tx.transactionHash}`;
        return `Successfully added object "${args.key}" to bucket ${bucketId}. Transaction hash: ${addMeta.tx.transactionHash}\nPortal: ${portalUrl}\nExplorer: ${explorerTxUrl}`;
      } else {
        return `Successfully added object "${args.key}" to bucket ${bucketId}.\nPortal: ${portalUrl}`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_OBJECT_ADDITION} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.QUERY_OBJECTS,
    description: "Query objects in a bucket on the Recall network",
    schema: QueryBucketObjectsSchema,
  })
  async queryBucketObjects(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof QueryBucketObjectsSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Resolve the bucket ID (either direct ID or name reference)
      const bucketId = this.buckets[args.bucket] || args.bucket;
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Query objects in the bucket - cast bucket ID to proper hex type
      const queryOptions = args.prefix ? { prefix: args.prefix } : undefined;
      
      try {
        const { result: { objects } } = await bucketManager.query(bucketId as `0x${string}`, queryOptions);
        
        // Generate portal URL for the bucket with prefix path
        const encodedPrefix = args.prefix ? encodeURIComponent(args.prefix) : '';
        const portalUrl = `${PORTAL_URL}/buckets/${bucketId}${encodedPrefix ? `?path=${encodedPrefix}` : ''}`;
        
        // Define the expected types for the objects returned from the API
        type RecallObject = {
          key: string;
          state: {
            blobHash: string;
            size: bigint;
            expiry: bigint;
            metadata: Record<string, unknown>;
          };
        };
        
        // Fix: Properly handle object structure with explicit type casting
        const safeObjects = objects.map((obj: unknown) => {
          // First cast to any to allow property access checks
          const typedObj = obj as any;
          
          // Check if the object has the expected structure
          if (typedObj && typeof typedObj === 'object' && 'key' in typedObj && 'state' in typedObj) {
            const state = typedObj.state;
            return {
              key: typedObj.key as string,
              value: {
                hash: state.blobHash as string,
                size: String(state.size), // Convert BigInt to string
                metadata: state.metadata as Record<string, unknown>
              }
            };
          }
          
          // Fallback for unexpected structure - use type assertion to avoid the error
          return {
            key: (typedObj && typeof typedObj === 'object' && 'key' in typedObj) 
                  ? String(typedObj.key) 
                  : 'unknown',
            value: {
              hash: 'unknown',
              size: 'unknown',
              metadata: {}
            }
          };
        });
        
        if (safeObjects && safeObjects.length > 0) {
          return `Found ${safeObjects.length} objects in bucket ${bucketId}:\n${JSON.stringify(safeObjects, null, 2)}\nPortal: ${portalUrl}`;
        } else {
          return `No objects found in bucket ${bucketId}${args.prefix ? ` with prefix "${args.prefix}"` : ''}.\nPortal: ${portalUrl}`;
        }
      } catch (queryError: unknown) {
        // Fix: Add proper type checking for the error
        if (queryError && typeof queryError === 'object' && 'message' in queryError) {
          const errorMessage = String(queryError.message);
          if (errorMessage.includes("BigInt")) {
            return `Error querying objects: ${errorMessage}. Please check the portal for objects: ${PORTAL_URL}/buckets/${bucketId}`;
          }
        }
        // Re-throw if it's not the BigInt issue or doesn't have a message property
        throw queryError;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_OBJECT_QUERY} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.GET_OBJECT,
    description: "Get an object from a bucket on the Recall network",
    schema: GetBucketObjectSchema,
  })
  async getBucketObject(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetBucketObjectSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }

      // Resolve the bucket ID (either direct ID or name reference)
      const bucketId = this.buckets[args.bucket] || args.bucket;
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Get the object from the bucket - cast bucket ID to proper hex type
      const { result: object } = await bucketManager.get(bucketId as `0x${string}`, args.key);
      
      // Generate portal URL with the path
      const encodedPath = encodeURIComponent(args.key);
      const portalUrl = `${PORTAL_URL}/buckets/${bucketId}?path=${encodedPath}`;
      
      if (object) {
        // Convert the binary data to text
        const contents = new TextDecoder().decode(object);
        return `Retrieved object "${args.key}" from bucket ${bucketId}:\n${contents}\nPortal: ${portalUrl}`;
      } else {
        return `Object "${args.key}" not found in bucket ${bucketId}.\nPortal: ${portalUrl}`;
      }
    } catch (error) {
      return `${ERROR_MESSAGES.FAILED_OBJECT_RETRIEVAL} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Initialize marketplace buckets if they don't exist
   */
  async initializeMarketplaceBuckets(): Promise<void> {
    if (!this.recallClient) {
      throw new Error(ERROR_MESSAGES.MISSING_CLIENT);
    }
    
    const bucketManager = this.recallClient.bucketManager();
    
    // Create a bucket for each data type if it doesn't exist
    for (const bucketName of Object.values(MARKETPLACE_BUCKETS)) {
      if (!this.buckets[bucketName]) {
        try {
          const { result: { bucket } } = await bucketManager.create();
          this.buckets[bucketName] = bucket;
          console.log(`Created bucket for ${bucketName}: ${bucket}`);
        } catch (error) {
          console.error(`Failed to create bucket for ${bucketName}:`, error);
          throw error;
        }
      }
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.LIST_SERVICE,
    description: "List a new service in the marketplace",
    schema: CreateServiceSchema,
  })
  async listService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateServiceSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Initialize buckets if needed
      if (!this.buckets[MARKETPLACE_BUCKETS.SERVICES]) {
        await this.initializeMarketplaceBuckets();
      }
      
      const bucketManager = this.recallClient.bucketManager();
      const serviceId = `service-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      // Create service object
      const service = {
        id: serviceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        provider_id: args.providerWallet,
        provider_name: args.providerName,
        service_type: args.serviceType,
        title: args.title,
        description: args.description,
        price: args.price,
        currency: args.currency,
        duration_minutes: args.durationMinutes,
        date: args.date,
        time: args.time,
        timezone: args.timezone,
        meeting_link: args.meetingLink || "",
        available: true,
        tags: args.tags
      };
      
      // Convert to string for storage
      const serviceJson = JSON.stringify(service);
      
      // Store service in the services bucket
      const bucket = this.buckets[MARKETPLACE_BUCKETS.SERVICES];
      const contentType = "application/json";
      const file = new File([serviceJson], "service.json", { type: contentType });
      
      const { meta: addMeta } = await bucketManager.add(bucket as `0x${string}`, serviceId, file);
      
      // Generate portal URL with the path
      const encodedPath = encodeURIComponent(serviceId);
      const portalUrl = `${PORTAL_URL}/buckets/${bucket}?path=${encodedPath}`;
      
      if (addMeta?.tx?.transactionHash) {
        const explorerTxUrl = `${EXPLORER_URL}/tx/${addMeta.tx.transactionHash}`;
        return `Successfully listed service ${serviceId} in the marketplace.\nTitle: ${args.title}\nProvider: ${args.providerName}\nPrice: ${args.price} ${args.currency}\nPortal: ${portalUrl}\nExplorer: ${explorerTxUrl}`;
      } else {
        return `Successfully listed service ${serviceId} in the marketplace.\nTitle: ${args.title}\nProvider: ${args.providerName}\nPrice: ${args.price} ${args.currency}\nPortal: ${portalUrl}`;
      }
    } catch (error) {
      return `Failed to list service in the marketplace. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.FIND_SERVICES,
    description: "Find services in the marketplace based on criteria",
    schema: FindServicesSchema,
  })
  async findServices(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof FindServicesSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Initialize buckets if needed
      if (!this.buckets[MARKETPLACE_BUCKETS.SERVICES]) {
        await this.initializeMarketplaceBuckets();
      }
      
      const bucketManager = this.recallClient.bucketManager();
      const bucket = this.buckets[MARKETPLACE_BUCKETS.SERVICES];
      
      // Query all services
      const { result: { objects } } = await bucketManager.query(bucket as `0x${string}`);
      
      // Fetch and parse each service
      const services = [];
      for (const obj of objects) {
        try {
          const { result: serviceData } = await bucketManager.get(bucket as `0x${string}`, obj.key);
          if (serviceData) {
            const serviceJson = new TextDecoder().decode(serviceData);
            const service = JSON.parse(serviceJson);
            services.push(service);
          }
        } catch (error) {
          console.error(`Error fetching service ${obj.key}:`, error);
        }
      }
      
      // Filter services based on criteria
      let filteredServices = services.filter(service => service.available === true);
      
      if (args.serviceType) {
        filteredServices = filteredServices.filter(service => 
          service.service_type === args.serviceType
        );
      }
      
      if (args.dateFrom) {
        const fromDate = new Date(args.dateFrom);
        filteredServices = filteredServices.filter(service => 
          new Date(service.date) >= fromDate
        );
      }
      
      if (args.dateTo) {
        const toDate = new Date(args.dateTo);
        filteredServices = filteredServices.filter(service => 
          new Date(service.date) <= toDate
        );
      }
      
      if (typeof args.priceMin === 'number') {
        filteredServices = filteredServices.filter(service => 
          service.price >= args.priceMin!
        );
      }
      
      if (typeof args.priceMax === 'number') {
        filteredServices = filteredServices.filter(service => 
          service.price <= args.priceMax!
        );
      }
      
      if (args.tags && args.tags.length > 0) {
        filteredServices = filteredServices.filter(service => {
          const serviceTags = service.tags || [];
          return args.tags?.some(tag => serviceTags.includes(tag)) || false;
        });
      }
      
      // Sort by date (newest first)
      filteredServices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (filteredServices.length === 0) {
        return `No services found matching the specified criteria.`;
      }
      
      // Format results
      const servicesOutput = filteredServices.map(service => {
        return {
          id: service.id,
          title: service.title,
          provider: service.provider_name,
          service_type: service.service_type,
          price: `${service.price} ${service.currency}`,
          date: service.date,
          time: service.time,
          duration: `${service.duration_minutes} minutes`,
          tags: service.tags?.join(", ") || ""
        };
      });
      
      return `Found ${filteredServices.length} services:\n${JSON.stringify(servicesOutput, null, 2)}`;
    } catch (error) {
      return `Failed to find services. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.BOOK_SERVICE,
    description: "Book a service from the marketplace",
    schema: CreateBookingSchema,
  })
  async bookService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof CreateBookingSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Initialize buckets if needed
      if (!this.buckets[MARKETPLACE_BUCKETS.SERVICES] || !this.buckets[MARKETPLACE_BUCKETS.BOOKINGS]) {
        await this.initializeMarketplaceBuckets();
      }
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Get the service details
      const servicesBucket = this.buckets[MARKETPLACE_BUCKETS.SERVICES];
      try {
        const { result: serviceData } = await bucketManager.get(servicesBucket as `0x${string}`, args.serviceId);
        if (!serviceData) {
          return `Service with ID ${args.serviceId} not found.`;
        }
        
        const serviceJson = new TextDecoder().decode(serviceData);
        const service = JSON.parse(serviceJson);
        
        // Check if service is available
        if (!service.available) {
          return `Service with ID ${args.serviceId} is no longer available.`;
        }
        
        // Create booking ID
        const bookingId = `booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Create booking object
        const booking = {
          id: bookingId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          service_id: args.serviceId,
          service_title: service.title,
          provider_id: service.provider_id,
          provider_name: service.provider_name,
          client_id: args.clientWallet,
          client_name: args.clientName,
          price: service.price,
          currency: service.currency,
          status: BOOKING_STATUS.CONFIRMED,
          date: service.date,
          time: service.time,
          timezone: service.timezone,
          duration_minutes: service.duration_minutes,
          meeting_link: service.meeting_link,
          notes: args.notes || "",
          meeting_notes_id: ""
        };
        
        // Convert to string for storage
        const bookingJson = JSON.stringify(booking);
        
        // Store booking in the bookings bucket
        const bookingsBucket = this.buckets[MARKETPLACE_BUCKETS.BOOKINGS];
        const contentType = "application/json";
        const file = new File([bookingJson], "booking.json", { type: contentType });
        
        const { meta: addMeta } = await bucketManager.add(bookingsBucket as `0x${string}`, bookingId, file);
        
        // Update service availability
        service.available = false;
        const updatedServiceJson = JSON.stringify(service);
        const updatedServiceFile = new File([updatedServiceJson], "service.json", { type: contentType });
        
        await bucketManager.add(servicesBucket as `0x${string}`, args.serviceId, updatedServiceFile);
        
        // Generate portal URL with the path
        const encodedPath = encodeURIComponent(bookingId);
        const portalUrl = `${PORTAL_URL}/buckets/${bookingsBucket}?path=${encodedPath}`;
        
        if (addMeta?.tx?.transactionHash) {
          const explorerTxUrl = `${EXPLORER_URL}/tx/${addMeta.tx.transactionHash}`;
          return `Successfully booked service "${service.title}" with ${service.provider_name}.\nBooking ID: ${bookingId}\nDate: ${service.date} at ${service.time} ${service.timezone}\nPrice: ${service.price} ${service.currency}\nPortal: ${portalUrl}\nExplorer: ${explorerTxUrl}`;
        } else {
          return `Successfully booked service "${service.title}" with ${service.provider_name}.\nBooking ID: ${bookingId}\nDate: ${service.date} at ${service.time} ${service.timezone}\nPrice: ${service.price} ${service.currency}\nPortal: ${portalUrl}`;
        }
      } catch (error) {
        return `Failed to get service with ID ${args.serviceId}. Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } catch (error) {
      return `Failed to book service. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.STORE_MEETING_NOTES,
    description: "Store AI-generated notes from a service meeting",
    schema: StoreMeetingNotesSchema,
  })
  async storeMeetingNotes(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof StoreMeetingNotesSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Initialize buckets if needed
      if (!this.buckets[MARKETPLACE_BUCKETS.BOOKINGS] || !this.buckets[MARKETPLACE_BUCKETS.NOTES]) {
        await this.initializeMarketplaceBuckets();
      }
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Get the booking details
      const bookingsBucket = this.buckets[MARKETPLACE_BUCKETS.BOOKINGS];
      try {
        const { result: bookingData } = await bucketManager.get(bookingsBucket as `0x${string}`, args.bookingId);
        if (!bookingData) {
          return `Booking with ID ${args.bookingId} not found.`;
        }
        
        const bookingJson = new TextDecoder().decode(bookingData);
        const booking = JSON.parse(bookingJson);
        
        // Create notes ID
        const notesId = `notes-${args.bookingId}-${Date.now()}`;
        
        // Create notes object
        const notes = {
          id: notesId,
          created_at: new Date().toISOString(),
          booking_id: args.bookingId,
          service_id: booking.service_id,
          provider_id: booking.provider_id,
          client_id: booking.client_id,
          content: args.notes
        };
        
        // Convert to string for storage
        const notesJson = JSON.stringify(notes);
        
        // Store notes in the notes bucket
        const notesBucket = this.buckets[MARKETPLACE_BUCKETS.NOTES];
        const contentType = "application/json";
        const file = new File([notesJson], "notes.json", { type: contentType });
        
        const { meta: addMeta } = await bucketManager.add(notesBucket as `0x${string}`, notesId, file);
        
        // Update booking with notes reference
        booking.meeting_notes_id = notesId;
        booking.updated_at = new Date().toISOString();
        const updatedBookingJson = JSON.stringify(booking);
        const updatedBookingFile = new File([updatedBookingJson], "booking.json", { type: contentType });
        
        await bucketManager.add(bookingsBucket as `0x${string}`, args.bookingId, updatedBookingFile);
        
        // Generate portal URLs with the paths
        const encodedNotesPath = encodeURIComponent(notesId);
        const notesPortalUrl = `${PORTAL_URL}/buckets/${notesBucket}?path=${encodedNotesPath}`;
        
        const encodedBookingPath = encodeURIComponent(args.bookingId);
        const bookingPortalUrl = `${PORTAL_URL}/buckets/${bookingsBucket}?path=${encodedBookingPath}`;
        
        if (addMeta?.tx?.transactionHash) {
          const explorerTxUrl = `${EXPLORER_URL}/tx/${addMeta.tx.transactionHash}`;
          return `Successfully stored meeting notes for booking ${args.bookingId}.\nNotes ID: ${notesId}\nBooking Portal: ${bookingPortalUrl}\nNotes Portal: ${notesPortalUrl}\nExplorer: ${explorerTxUrl}`;
        } else {
          return `Successfully stored meeting notes for booking ${args.bookingId}.\nNotes ID: ${notesId}\nBooking Portal: ${bookingPortalUrl}\nNotes Portal: ${notesPortalUrl}`;
        }
      } catch (error) {
        return `Failed to get booking with ID ${args.bookingId}. Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } catch (error) {
      return `Failed to store meeting notes. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.REVIEW_SERVICE,
    description: "Submit a review for a completed service",
    schema: ReviewServiceSchema,
  })
  async reviewService(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ReviewServiceSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Initialize buckets if needed
      if (!this.buckets[MARKETPLACE_BUCKETS.BOOKINGS] || !this.buckets[MARKETPLACE_BUCKETS.REVIEWS]) {
        await this.initializeMarketplaceBuckets();
      }
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Get the booking details
      const bookingsBucket = this.buckets[MARKETPLACE_BUCKETS.BOOKINGS];
      try {
        const { result: bookingData } = await bucketManager.get(bookingsBucket as `0x${string}`, args.bookingId);
        if (!bookingData) {
          return `Booking with ID ${args.bookingId} not found.`;
        }
        
        const bookingJson = new TextDecoder().decode(bookingData);
        const booking = JSON.parse(bookingJson);
        
        // Create review ID
        const reviewId = `review-${args.bookingId}`;
        
        // Create review object
        const review = {
          id: reviewId,
          created_at: new Date().toISOString(),
          booking_id: args.bookingId,
          service_id: booking.service_id,
          provider_id: booking.provider_id,
          client_id: booking.client_id,
          rating: args.rating,
          comment: args.comment,
          disputed: args.disputed || false,
          dispute_reason: args.disputeReason || ""
        };
        
        // Convert to string for storage
        const reviewJson = JSON.stringify(review);
        
        // Store review in the reviews bucket
        const reviewsBucket = this.buckets[MARKETPLACE_BUCKETS.REVIEWS];
        const contentType = "application/json";
        const file = new File([reviewJson], "review.json", { type: contentType });
        
        const { meta: addMeta } = await bucketManager.add(reviewsBucket as `0x${string}`, reviewId, file);
        
        // Update booking status based on dispute
        booking.status = args.disputed ? BOOKING_STATUS.DISPUTED : BOOKING_STATUS.COMPLETED;
        booking.updated_at = new Date().toISOString();
        const updatedBookingJson = JSON.stringify(booking);
        const updatedBookingFile = new File([updatedBookingJson], "booking.json", { type: contentType });
        
        await bucketManager.add(bookingsBucket as `0x${string}`, args.bookingId, updatedBookingFile);
        
        // Generate portal URLs with the paths
        const encodedReviewPath = encodeURIComponent(reviewId);
        const reviewPortalUrl = `${PORTAL_URL}/buckets/${reviewsBucket}?path=${encodedReviewPath}`;
        
        const encodedBookingPath = encodeURIComponent(args.bookingId);
        const bookingPortalUrl = `${PORTAL_URL}/buckets/${bookingsBucket}?path=${encodedBookingPath}`;
        
        const statusMessage = args.disputed 
          ? `\nDispute has been filed. Reason: ${args.disputeReason}`
          : `\nService marked as completed.`;
        
        if (addMeta?.tx?.transactionHash) {
          const explorerTxUrl = `${EXPLORER_URL}/tx/${addMeta.tx.transactionHash}`;
          return `Successfully submitted review for booking ${args.bookingId}.\nRating: ${args.rating}/5${statusMessage}\nBooking Portal: ${bookingPortalUrl}\nReview Portal: ${reviewPortalUrl}\nExplorer: ${explorerTxUrl}`;
        } else {
          return `Successfully submitted review for booking ${args.bookingId}.\nRating: ${args.rating}/5${statusMessage}\nBooking Portal: ${bookingPortalUrl}\nReview Portal: ${reviewPortalUrl}`;
        }
      } catch (error) {
        return `Failed to get booking with ID ${args.bookingId}. Error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } catch (error) {
      return `Failed to submit review. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  @CreateAction({
    name: RECALL_ACTION_NAMES.RESOLVE_DISPUTE,
    description: "Resolve a dispute for a booking",
    schema: ResolveDisputeSchema,
  })
  async resolveDispute(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof ResolveDisputeSchema>
  ): Promise<string> {
    try {
      if (!this.recallClient) {
        return ERROR_MESSAGES.MISSING_CLIENT;
      }
      
      // Initialize buckets if needed
      if (!this.buckets[MARKETPLACE_BUCKETS.BOOKINGS] || 
          !this.buckets[MARKETPLACE_BUCKETS.REVIEWS] || 
          !this.buckets[MARKETPLACE_BUCKETS.NOTES]) {
        await this.initializeMarketplaceBuckets();
      }
      
      const bucketManager = this.recallClient.bucketManager();
      
      // Get the booking details
      const bookingsBucket = this.buckets[MARKETPLACE_BUCKETS.BOOKINGS];
      const { result: bookingData } = await bucketManager.get(bookingsBucket as `0x${string}`, args.bookingId);
      
      if (!bookingData) {
        return `Booking with ID ${args.bookingId} not found.`;
      }
      
      const bookingJson = new TextDecoder().decode(bookingData);
      const booking = JSON.parse(bookingJson);
      
      // Check if booking is in disputed status
      if (booking.status !== BOOKING_STATUS.DISPUTED) {
        return `Booking with ID ${args.bookingId} is not in a disputed state. Current status: ${booking.status}`;
      }
      
      // Get the review
      const reviewsBucket = this.buckets[MARKETPLACE_BUCKETS.REVIEWS];
      const reviewId = `review-${args.bookingId}`;
      const { result: reviewData } = await bucketManager.get(reviewsBucket as `0x${string}`, reviewId);
      
      if (!reviewData) {
        return `Review for booking ${args.bookingId} not found.`;
      }
      
      const reviewJson = new TextDecoder().decode(reviewData);
      const review = JSON.parse(reviewJson);
      
      // Get meeting notes if available
      let notes = null;
      if (booking.meeting_notes_id) {
        const notesBucket = this.buckets[MARKETPLACE_BUCKETS.NOTES];
        try {
          const { result: notesData } = await bucketManager.get(notesBucket as `0x${string}`, booking.meeting_notes_id);
          if (notesData) {
            const notesJson = new TextDecoder().decode(notesData);
            notes = JSON.parse(notesJson);
          }
        } catch (error) {
          console.error(`Error fetching notes ${booking.meeting_notes_id}:`, error);
        }
      }
      
      // Update review
      review.disputed = false;
      review.resolution = args.resolution;
      review.resolved_at = new Date().toISOString();
      review.updated_at = new Date().toISOString();
      
      // Convert to string for storage
      const updatedReviewJson = JSON.stringify(review);
      const contentType = "application/json";
      const reviewFile = new File([updatedReviewJson], "review.json", { type: contentType });
      
      // Store updated review
      const { meta: reviewMeta } = await bucketManager.add(reviewsBucket as `0x${string}`, reviewId, reviewFile);
      
      // Update booking
      booking.status = BOOKING_STATUS.RESOLVED;
      booking.refund_percentage = args.refundPercentage;
      booking.resolution = args.resolution;
      booking.updated_at = new Date().toISOString();
      
      // Convert to string for storage
      const updatedBookingJson = JSON.stringify(booking);
      const bookingFile = new File([updatedBookingJson], "booking.json", { type: contentType });
      
      // Store updated booking
      const { meta: bookingMeta } = await bucketManager.add(bookingsBucket as `0x${string}`, args.bookingId, bookingFile);
      
      // Generate portal URLs with the paths
      const encodedReviewPath = encodeURIComponent(reviewId);
      const reviewPortalUrl = `${PORTAL_URL}/buckets/${reviewsBucket}?path=${encodedReviewPath}`;
      
      const encodedBookingPath = encodeURIComponent(args.bookingId);
      const bookingPortalUrl = `${PORTAL_URL}/buckets/${bookingsBucket}?path=${encodedBookingPath}`;
      
      const transactionHash = reviewMeta?.tx?.transactionHash || bookingMeta?.tx?.transactionHash;
      if (transactionHash) {
        const explorerTxUrl = `${EXPLORER_URL}/tx/${transactionHash}`;
        return `Successfully resolved dispute for booking ${args.bookingId}.\nResolution: ${args.resolution}\nRefund percentage: ${args.refundPercentage}%\nBooking Portal: ${bookingPortalUrl}\nReview Portal: ${reviewPortalUrl}\nExplorer: ${explorerTxUrl}`;
      } else {
        return `Successfully resolved dispute for booking ${args.bookingId}.\nResolution: ${args.resolution}\nRefund percentage: ${args.refundPercentage}%\nBooking Portal: ${bookingPortalUrl}\nReview Portal: ${reviewPortalUrl}`;
      }
    } catch (error) {
      return `Failed to resolve dispute. Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  supportsNetwork = (network: Network): boolean => network.protocolFamily === "evm";
}

export const recallTestActionProvider = () => new RecallTestActionProvider(); 