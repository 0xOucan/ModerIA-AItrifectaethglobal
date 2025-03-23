import { OtterAiActionProvider } from "./otterAiActionProvider.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Terminal colors for better readability
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m",
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m",
  },
};

const printHeader = (text: string) => {
  console.log("\n" + colors.fg.cyan + colors.bright + "=".repeat(80) + colors.reset);
  console.log(colors.fg.cyan + colors.bright + ">> " + text + colors.reset);
  console.log(colors.fg.cyan + colors.bright + "=".repeat(80) + colors.reset + "\n");
};

const printSection = (text: string) => {
  console.log("\n" + colors.fg.yellow + colors.bright + text + colors.reset);
  console.log(colors.fg.yellow + "-".repeat(text.length) + colors.reset + "\n");
};

const printSuccess = (text: string) => {
  console.log(colors.fg.green + "✓ " + text + colors.reset);
};

const printError = (text: string) => {
  console.log(colors.fg.red + "✗ " + text + colors.reset);
};

/**
 * Main test function
 */
const runTest = async () => {
  printHeader("OTTER AI ACTION PROVIDER TEST - DEMO MODE");
  printHeader("NOTE: This is a demo that simulates the flow without actual wallet connections");
  
  try {
    // Initialize the action provider
    printSection("Initializing OtterAiActionProvider");
    const otterAiActionProvider = new OtterAiActionProvider();
    printSuccess("Action provider initialized");
    
    // Create a mock wallet - using 'any' type to avoid complex type constraints
    const mockWallet: any = {};
    
    // Join a meeting
    printSection("1. Joining a Google Meet call");
    const meetingResult = await otterAiActionProvider.joinMeetingWithOtterAi(
      mockWallet,
      {
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        meetingTitle: "Language Learning Session",
        participantName: "AI Assistant",
        languageCode: "en-US",
      }
    );
    console.log(meetingResult);
    
    // Extract meeting ID from the response
    const meetingId = meetingResult.match(/Meeting ID: ([a-zA-Z0-9_]+)/)?.[1];
    
    if (!meetingId) {
      printError("Could not extract meeting ID from response");
      return;
    }
    
    printSuccess(`Extracted meeting ID: ${meetingId}`);
    
    // Wait for a short time to simulate the meeting
    printSection("Waiting for the meeting to complete...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the transcript
    printSection("2. Getting the meeting transcript");
    const transcriptResult = await otterAiActionProvider.getOtterAiTranscript(
      mockWallet,
      {
        meetingId,
        format: "plain",
      }
    );
    console.log(transcriptResult);
    
    // Get the transcript summary
    printSection("3. Getting the meeting transcript summary");
    const summaryResult = await otterAiActionProvider.getOtterAiTranscriptSummary(
      mockWallet,
      {
        meetingId,
        format: "plain",
      }
    );
    console.log(summaryResult);
    
    // Analyze the call quality
    printSection("4. Analyzing call quality");
    const analysisResult = await otterAiActionProvider.analyzeCallQuality(
      mockWallet,
      {
        meetingId,
        serviceType: "language_learning",
        includeRecommendations: true,
      }
    );
    console.log(analysisResult);
    
    // Authorize payment based on quality
    printSection("5. Authorizing payment based on quality");
    const paymentResult = await otterAiActionProvider.authorizePaymentBasedOnQuality(
      mockWallet,
      {
        meetingId,
        paymentAmount: "0.05 ETH",
        paymentRecipient: "0x123...456",
        notes: "Great quality session, payment authorized automatically",
      }
    );
    console.log(paymentResult);
    
    printHeader("TEST COMPLETED SUCCESSFULLY");
    printSuccess("All actions were executed successfully");
    
  } catch (error) {
    printError(`Test failed: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
  }
};

// Run the test
runTest().catch(console.error); 