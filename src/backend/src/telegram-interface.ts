import TelegramBot from "node-telegram-bot-api";
import { HumanMessage } from "@langchain/core/messages";

interface TelegramInterfaceOptions {
  onExit: () => void;
  onKill: () => void;
}

/**
 * TelegramInterface provides a Telegram bot interface for interacting with the agent.
 * Supports Recall Network operations including metadata storage for enhanced data discoverability.
 */
export class TelegramInterface {
  private bot: TelegramBot;
  private agent: any;
  private config: any;
  private options: TelegramInterfaceOptions;
  private isStarted: boolean = false;

  constructor(agent: any, config: any, options: TelegramInterfaceOptions) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN must be provided!");
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.agent = agent;
    this.config = config;
    this.options = options;

    this.setupHandlers();
    console.log("Telegram bot initialized. Waiting for /start command...");
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.isStarted = true;
      console.log(
        `Telegram session started by user ${msg.from?.username || msg.from?.id}`,
      );
      this.bot.sendMessage(
        chatId,
        "👋 Hello! I am your AI assistant with multiple integrations. I can help with:\n\n" +
        "🔄 *Recall Network*\n" +
        "- Storing data with rich metadata\n" +
        "- Creating buckets for organization\n" +
        "- Querying stored information\n\n" +
        "🛒 *Service Marketplace*\n" +
        "- Creating and managing service listings\n" +
        "- Booking services and processing payments\n" +
        "- Rating and reviewing completed services\n\n" +
        "💰 *ERC20 Escrow*\n" +
        "- Creating secure escrow transactions\n" +
        "- Managing USDC payments on Base Sepolia\n" +
        "- Releasing or refunding payments\n\n" +
        "🎙️ *Otter AI*\n" +
        "- Joining meetings to analyze service quality\n" +
        "- Generating transcripts and summaries\n" +
        "- Authorizing payments based on quality metrics\n\n" +
        "🌟 *ModerIA*\n" +
        "- Orchestrating the entire service marketplace workflow\n" +
        "- Handling network switching between Recall and Base Sepolia\n" +
        "- Processing secure escrow payments in USDC\n\n" +
        "Use /help for example commands, /menu for ModerIA workflow, /exit to return to terminal, or /kill to shut down the application.",
        { parse_mode: "Markdown" }
      );
    });

    // Handle /menu command for ModerIA workflow
    this.bot.onText(/\/menu/, (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        this.bot.sendMessage(
          chatId,
          "🌟 *ModerIA - Complete Digital Deal Mediator* allows you to orchestrate the entire service marketplace workflow seamlessly. Here are the key operations you can perform with ModerIA:\n\n" +
          "1. *Create a Recall Client*: Set up a client for teacher, student, or agent roles.\n" +
          "   - Example: `Create a Recall client for teacher on testnet`\n\n" +
          "2. *Create a Recall Bucket*: Store service data in organized buckets.\n" +
          "   - Example: `Create a Recall bucket named 'service-data'`\n\n" +
          "3. *Create a Service Listing*: Offer services with detailed metadata.\n" +
          "   - Example: `Create a service listing for language tutoring at $50 per hour`\n\n" +
          "4. *List Available Services*: Query available services for booking.\n" +
          "   - Example: `List available services for language learning`\n\n" +
          "5. *Book a Service*: Reserve a service as a student.\n" +
          "   - Example: `Book service XYZ with name 'Alice Johnson'`\n\n" +
          "6. *Create an Escrow*: Secure funds for a booked service.\n" +
          "   - Example: `Create an escrow for booking ABC with amount 0.01 USDC`\n\n" +
          "7. *Join a Meeting*: Participate in a meeting for a booked service.\n" +
          "   - Example: `Join meeting at https://meet.google.com/abc-def-ghi`\n\n" +
          "8. *Get Transcript*: Retrieve the transcript for a meeting.\n" +
          "   - Example: `Get transcript for meeting XYZ`\n\n" +
          "9. *Analyze Service Quality*: Evaluate the quality of the service based on the meeting transcript.\n" +
          "   - Example: `Analyze service quality for booking ABC`\n\n" +
          "10. *Release Funds*: Transfer funds from escrow to the service provider.\n" +
          "    - Example: `Release funds from escrow for booking ABC`\n\n" +
          "11. *Complete a Service*: Record the completion of a service with feedback.\n" +
          "    - Example: `Complete service booking ABC with quality score 5`\n\n" +
          "If you would like to perform any specific operation or need more details, just let me know! 😊\n\n" +
          "*Complete Workflow Testing Commands (copy & paste these):*\n\n" +
          "```\n" +
          "Create a Recall client for teacher on testnet\n" +
          "Create a Recall client for student on testnet\n" +
          "Create a Recall client for agent on testnet\n" +
          "Create a Recall bucket named 'services-bucket'\n" +
          "Create a service listing for French language teaching class at 0.01 USDC per hour with meeting link https://meet.google.com/abc-def-ghi\n" +
          "List available services\n" +
          "Book service service_XXXXX with name 'Pedro Musk'\n" +
          "Create an escrow for booking booking_XXXXX with amount 0.01 USDC\n" +
          "Join meeting at https://meet.google.com/abc-def-ghi\n" +
          "Get transcript for meeting meeting_XXXXX\n" +
          "Analyze service quality for meeting meeting_XXXXX and booking booking_XXXXX\n" +
          "Release funds from escrow escrow_XXXXX\n" +
          "Complete service booking booking_XXXXX with quality score 95\n" +
          "```\n\n" +
          "*(Note: Replace XXXXX with the actual IDs you receive after executing each step)*",
          { parse_mode: "Markdown" }
        );
      }
    });

    // Handle /help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        this.bot.sendMessage(
          chatId,
          "Here are some example commands you can try:\n\n" +
          "🔄 *Recall Network Operations:*\n" +
          "- Create a Recall client for testnet\n" +
          "- Purchase 0.01 ETH worth of Recall credits\n" +
          "- Create a bucket for my data\n" +
          "- Add an object with metadata to my bucket\n\n" +
          "🛒 *Service Marketplace:*\n" +
          "- Create a service listing for French teaching\n" +
          "- Book a service with ID xyz\n" +
          "- Query available services\n" +
          "- Complete a service and leave a rating\n\n" +
          "💰 *ERC20 Escrow:*\n" +
          "- Get USDC balance for my wallet\n" + 
          "- Create escrow of 0.01 USDC for service XYZ\n" +
          "- Release escrow ABC to provider\n" +
          "- Get all my escrow transactions\n\n" +
          "🎙️ *Otter AI:*\n" +
          "- Join meeting at [URL]\n" +
          "- Generate transcript for meeting ABC\n" +
          "- Analyze quality of service XYZ\n" +
          "- Authorize payment based on quality score\n\n" +
          "🌟 *ModerIA Workflow:*\n" +
          "- Use /menu to see the complete ModerIA workflow and testing commands\n" +
          "- ModerIA combines all the above capabilities in a streamlined process\n\n" +
          "Just type your request naturally and I'll help you! 🤖",
          { parse_mode: "Markdown" }
        );
      }
    });

    // Handle /exit command
    this.bot.onText(/\/exit/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "👋 Goodbye! Returning to terminal...");
        console.log("Telegram session ended. Returning to terminal...");
        this.bot.stopPolling();
        this.options.onExit();
      }
    });

    // Handle /kill command
    this.bot.onText(/\/kill/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "🛑 Shutting down the application...");
        console.log("Kill command received. Shutting down...");
        this.bot.stopPolling();
        this.options.onKill();
      }
    });

    // Handle all other messages
    this.bot.on("message", async (msg) => {
      if (msg.text && !msg.text.startsWith("/") && this.isStarted) {
        const chatId = msg.chat.id;
        console.log(
          `Received message from ${msg.from?.username || msg.from?.id}: ${msg.text}`,
        );

        try {
          await this.bot.sendChatAction(chatId, "typing");

          const stream = await this.agent.stream(
            { messages: [new HumanMessage(msg.text)] },
            this.config,
          );

          let response = "";
          for await (const chunk of stream) {
            if ("agent" in chunk) {
              response = chunk.agent.messages[0].content;
            } else if ("tools" in chunk && chunk.tools.messages.length > 0) {
              // Only append tool messages if they contain new information
              const toolMessage = chunk.tools.messages[0].content;
              if (!response.includes(toolMessage)) {
                response = toolMessage;
              }
            }
          }

          console.log(
            `Sending response to ${msg.from?.username || msg.from?.id}: ${response}`,
          );
          await this.bot.sendMessage(chatId, response);
        } catch (error) {
          console.error("Error processing message:", error);
          await this.bot.sendMessage(
            chatId,
            "❌ Sorry, I encountered an error processing your message. Please try again.",
          );
        }
      }
    });
  }
}
