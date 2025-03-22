import TelegramBot from "node-telegram-bot-api";
import { HumanMessage } from "@langchain/core/messages";

interface TelegramInterfaceOptions {
  onExit: () => void;
  onKill: () => void;
}

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
        "Hello! I am your AI assistant for interacting with the Recall Network. Use /menu to see available commands.\n\nUse /exit to return to terminal or /kill to shut down the application.",
        { parse_mode: "Markdown" }
      );
    });

    // Handle /menu command
    this.bot.onText(/\/menu/, (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        const menuText = `
*Recall Network Bot Commands*

*System Commands:*
/start - Start or restart the bot
/menu - Show this menu
/exit - Exit to terminal
/kill - Shut down the application

*Recall Storage Operations:*
\`\`\`
Create a Recall client for testnet
Purchase 0.1 ETH worth of Recall credits
Create a bucket named "my-data"
Add object with key "hello/world" and content "Hello World" to bucket "my-data"
Query objects in bucket "my-data" with prefix "hello/"
Get object with key "hello/world" from bucket "my-data"
\`\`\`

*Recall Marketplace Operations:*
\`\`\`
List a service with title "AI Tutoring Session", type "education", price 75 USD
Find education services between $50 and $150 with tag "AI"
Book service "service-12345" as client "Bob Smith"
Store meeting notes for booking "booking-12345"
Review booking "booking-12345" with rating 4 and comment "Good session!"
Raise a dispute for booking "booking-12345" with reason "Session was cut short"
Resolve dispute for booking "booking-12345" with 25% refund
\`\`\`

*Available Service Types:*
- education
- consulting
- mentoring
- tutoring
- coaching
- language
- other
`;
        this.bot.sendMessage(chatId, menuText, { parse_mode: "Markdown" });
      }
    });

    // Handle /exit command
    this.bot.onText(/\/exit/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Goodbye! Returning to terminal...");
        console.log("Telegram session ended. Returning to terminal...");
        this.bot.stopPolling();
        this.options.onExit();
      }
    });

    // Handle /kill command
    this.bot.onText(/\/kill/, async (msg) => {
      const chatId = msg.chat.id;
      if (this.isStarted) {
        await this.bot.sendMessage(chatId, "Shutting down the application...");
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
            "Sorry, I encountered an error processing your message.",
          );
        }
      }
    });
  }
}
