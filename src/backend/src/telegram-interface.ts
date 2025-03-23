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
        "Use /help for example commands, /exit to return to terminal, or /kill to shut down the application.",
        { parse_mode: "Markdown" }
      );
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
