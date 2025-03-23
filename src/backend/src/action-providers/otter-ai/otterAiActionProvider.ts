import { z } from "zod";
import {
  ActionProvider,
  CreateAction,
  Network,
  EvmWalletProvider
} from "@coinbase/agentkit";
import {
  OTTER_AI_ACTION_NAMES,
  OTTER_AI_DESCRIPTION,
  ERROR_MESSAGES,
  OTTER_AI_URLS,
  OTTER_AI_API,
  DEMO_TRANSCRIPT,
  DEMO_SUMMARY,
  DEMO_ANALYSIS,
  MeetingStatus,
  EMOJIS,
  QUALITY_THRESHOLDS
} from "./constants.js";
import {
  JoinMeetingSchema,
  GetTranscriptSchema,
  GetTranscriptSummarySchema,
  AnalyzeCallQualitySchema,
  AuthorizePaymentSchema,
  Meeting,
  AnalysisResult,
  PaymentAuthorization
} from "./schemas.js";

/**
 * OtterAiActionProvider provides actions for recording, transcribing, and analyzing meetings
 * using the Otter.ai service (simulated for demo purposes).
 */
export class OtterAiActionProvider extends ActionProvider<EvmWalletProvider> {
  // Store meetings, transcripts, analyses, and payment authorizations in memory
  private meetings: Map<string, Meeting> = new Map();
  private transcripts: Map<string, string> = new Map();
  private summaries: Map<string, string> = new Map();
  private analyses: Map<string, AnalysisResult> = new Map();
  private paymentAuthorizations: Map<string, PaymentAuthorization> = new Map();
  
  // Counter for generating unique meeting IDs
  private meetingIdCounter: number = 1;

  constructor() {
    super("otter-ai", []);
  }

  /**
   * Check if this action provider supports the given network
   */
  supportsNetwork(network: Network): boolean {
    // This action provider works on any network
    return true;
  }

  /**
   * Generate a unique meeting ID with a timestamp component
   */
  private generateMeetingId(): string {
    const timestamp = Date.now();
    const id = this.meetingIdCounter++;
    return `meeting_${timestamp}_${id}`;
  }

  /**
   * Generate a unique transcript ID based on OtterAI format
   */
  private generateTranscriptId(): string {
    return `NwiejfwoejwoejfwoiejweoijD-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Validate if a meeting URL is supported (Google Meet or Zoom)
   */
  private validateMeetingUrl(url: string): boolean {
    return url.includes("meet.google.com") || url.includes("zoom.us");
  }

  /**
   * Get a readable meeting title from the URL or provided title
   */
  private getMeetingTitle(url: string, providedTitle?: string): string {
    if (providedTitle) {
      return providedTitle;
    }
    
    if (url.includes("meet.google.com")) {
      const meetId = url.split("/").pop();
      return `Google Meet - ${meetId}`;
    } else if (url.includes("zoom.us")) {
      const zoomId = url.split("/").pop();
      return `Zoom Meeting - ${zoomId}`;
    }
    
    return `Meeting at ${new Date().toLocaleString()}`;
  }

  /**
   * Format a transcript URL based on Otter.ai format
   */
  private formatTranscriptUrl(transcriptId: string, view: "summary" | "transcript" = "transcript"): string {
    const baseUrl = `${OTTER_AI_URLS.TRANSCRIPT_BASE}${transcriptId}`;
    const viewParam = view === "summary" ? OTTER_AI_URLS.SUMMARY : OTTER_AI_URLS.TRANSCRIPT;
    return `${baseUrl}${viewParam}`;
  }

  /**
   * Join a meeting with Otter AI for automatic recording and transcription
   */
  @CreateAction({
    name: OTTER_AI_ACTION_NAMES.JOIN_CALL,
    description: "Join a Google Meet or Zoom call with Otter AI for automatic recording and transcription",
    schema: JoinMeetingSchema,
  })
  async joinMeetingWithOtterAi(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof JoinMeetingSchema>
  ): Promise<string> {
    try {
      const { meetingUrl, meetingTitle, participantName, languageCode } = args;
      
      // Validate the meeting URL
      if (!this.validateMeetingUrl(meetingUrl)) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.INVALID_MEETING_LINK}`;
      }
      
      // Generate a unique meeting ID
      const meetingId = this.generateMeetingId();
      const transcriptId = this.generateTranscriptId();
      
      // Get or generate a meeting title
      const title = this.getMeetingTitle(meetingUrl, meetingTitle);
      
      // Create meeting record
      const meeting: Meeting = {
        id: meetingId,
        url: meetingUrl,
        title,
        status: MeetingStatus.JOINING,
        startTime: new Date(),
        participantCount: 2, // Assume a teacher and student
        hasTranscript: false,
        hasSummary: false,
        hasAnalysis: false,
        transcriptUrl: this.formatTranscriptUrl(transcriptId),
        summaryUrl: this.formatTranscriptUrl(transcriptId, "summary"),
      };
      
      // Store meeting info
      this.meetings.set(meetingId, meeting);
      
      // Simulate joining and starting recording
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update meeting status to recording
      meeting.status = MeetingStatus.RECORDING;
      this.meetings.set(meetingId, meeting);
      
      // Format response with Otter.ai styling
      return `
${EMOJIS.MICROPHONE} ${EMOJIS.HEADPHONES} **Otter AI has joined the meeting**

${EMOJIS.ROBOT} Otter AI is now recording and transcribing your meeting
${EMOJIS.CHECK_MARK} Meeting successfully joined: ${title}
${EMOJIS.MAGNIFYING_GLASS} Meeting ID: ${meetingId}
${EMOJIS.DOCUMENT} Transcript will be available at: ${meeting.transcriptUrl}

${EMOJIS.SPARKLES} Recording has started. The transcript will be automatically generated when the meeting ends.
      `;
    } catch (error) {
      return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.MEETING_ACCESS_FAILED} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get the transcript of a meeting recorded by Otter AI
   */
  @CreateAction({
    name: OTTER_AI_ACTION_NAMES.GET_TRANSCRIPT,
    description: "Get the transcript of a meeting recorded by Otter AI",
    schema: GetTranscriptSchema,
  })
  async getOtterAiTranscript(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTranscriptSchema>
  ): Promise<string> {
    try {
      const { meetingId, format } = args;
      
      // Validate meeting ID
      if (!meetingId) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.MEETING_ID_REQUIRED}`;
      }
      
      // Get meeting info
      const meeting = this.meetings.get(meetingId);
      if (!meeting) {
        return `${EMOJIS.CROSS_MARK} Meeting with ID ${meetingId} not found`;
      }
      
      // Check if meeting is still in progress
      if (meeting.status === MeetingStatus.RECORDING) {
        // Simulate completing the meeting
        meeting.status = MeetingStatus.COMPLETED;
        meeting.endTime = new Date();
        meeting.duration = Math.floor((meeting.endTime.getTime() - (meeting.startTime?.getTime() || 0)) / 1000);
        this.meetings.set(meetingId, meeting);
        
        // Simulate transcription process
        meeting.status = MeetingStatus.TRANSCRIBING;
        this.meetings.set(meetingId, meeting);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Check if transcription is available or generate it
      let transcript = this.transcripts.get(meetingId);
      if (!transcript) {
        // For demo purposes, use the predefined transcript
        transcript = DEMO_TRANSCRIPT;
        this.transcripts.set(meetingId, transcript);
        
        // Update meeting status
        meeting.status = MeetingStatus.COMPLETED;
        meeting.hasTranscript = true;
        this.meetings.set(meetingId, meeting);
      }
      
      // Format the transcript based on requested format
      let formattedTranscript = transcript;
      if (format === "json") {
        // Convert transcript to JSON format
        const lines = transcript.split("\n").filter(line => line.trim().length > 0);
        const speakers = ["User A", "User B"];
        const jsonTranscript = lines
          .filter(line => speakers.some(speaker => line.startsWith(speaker)))
          .map(line => {
            const [speaker, ...textParts] = line.split(":");
            return {
              speaker: speaker.trim(),
              text: textParts.join(":").trim(),
              timestamp: ""
            };
          });
        formattedTranscript = JSON.stringify(jsonTranscript, null, 2);
      } else if (format === "html") {
        // Convert transcript to HTML format
        const lines = transcript.split("\n");
        const htmlLines = lines.map(line => {
          if (line.startsWith("User A:")) {
            return `<p class="teacher">${line}</p>`;
          } else if (line.startsWith("User B:")) {
            return `<p class="student">${line}</p>`;
          } else {
            return `<p>${line}</p>`;
          }
        });
        formattedTranscript = htmlLines.join("\n");
      }
      
      // Format response with Otter.ai styling
      return `
${EMOJIS.DOCUMENT} **Otter AI Transcript**

${EMOJIS.CHECK_MARK} Transcript for meeting: ${meeting.title}
${EMOJIS.CLOCK} Duration: ${meeting.duration ? Math.floor(meeting.duration / 60) : 30} minutes
${EMOJIS.MAGNIFYING_GLASS} Meeting ID: ${meetingId}

${EMOJIS.SPARKLES} Transcript URL: ${meeting.transcriptUrl}

${formattedTranscript}
      `;
    } catch (error) {
      return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.TRANSCRIPT_NOT_FOUND} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get a summary of a meeting transcript from Otter AI
   */
  @CreateAction({
    name: OTTER_AI_ACTION_NAMES.GET_TRANSCRIPT_SUMMARY,
    description: "Get a summary of a meeting transcript from Otter AI",
    schema: GetTranscriptSummarySchema,
  })
  async getOtterAiTranscriptSummary(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof GetTranscriptSummarySchema>
  ): Promise<string> {
    try {
      const { meetingId, format } = args;
      
      // Validate meeting ID
      if (!meetingId) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.MEETING_ID_REQUIRED}`;
      }
      
      // Get meeting info
      const meeting = this.meetings.get(meetingId);
      if (!meeting) {
        return `${EMOJIS.CROSS_MARK} Meeting with ID ${meetingId} not found`;
      }
      
      // Check if meeting has a transcript
      if (!meeting.hasTranscript) {
        // Try to get the transcript first
        const transcript = await this.getOtterAiTranscript(walletProvider, { meetingId, format: "plain" });
        if (transcript.includes(ERROR_MESSAGES.TRANSCRIPT_NOT_FOUND)) {
          return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.TRANSCRIPT_NOT_FOUND}`;
        }
      }
      
      // Check if summary is available or generate it
      let summary = this.summaries.get(meetingId);
      if (!summary) {
        // For demo purposes, use the predefined summary
        summary = DEMO_SUMMARY;
        this.summaries.set(meetingId, summary);
        
        // Update meeting status
        meeting.hasSummary = true;
        this.meetings.set(meetingId, meeting);
      }
      
      // Format the summary based on requested format
      let formattedSummary = summary;
      if (format === "json") {
        // Convert summary to JSON format
        const sections = summary.split("\n\n").filter(section => section.trim().length > 0);
        const jsonSummary = {
          overview: sections[0].replace("Overview\n", "").trim(),
          actionItems: sections[1].replace("Action Items\n\n", "").split("\n").filter(item => item.startsWith("*")).map(item => item.replace("* ", "")),
          outline: sections[2].replace("Outline\n", "").trim(),
          keywords: sections[3].replace("Keywords\n\n", "").split("\n").filter(item => item.startsWith("*")).map(item => item.replace("* ", "")),
        };
        formattedSummary = JSON.stringify(jsonSummary, null, 2);
      } else if (format === "html") {
        // Convert summary to HTML format
        const sections = summary.split("\n\n").filter(section => section.trim().length > 0);
        const htmlSections = sections.map(section => {
          if (section.startsWith("Overview")) {
            return `<h2>Overview</h2><p>${section.replace("Overview\n", "")}</p>`;
          } else if (section.startsWith("Action Items")) {
            const items = section.replace("Action Items\n\n", "").split("\n").filter(item => item.startsWith("*"));
            return `<h2>Action Items</h2><ul>${items.map(item => `<li>${item.replace("* ", "")}</li>`).join("")}</ul>`;
          } else if (section.startsWith("Outline")) {
            return `<h2>Outline</h2><p>${section.replace("Outline\n", "")}</p>`;
          } else if (section.startsWith("Keywords")) {
            const items = section.replace("Keywords\n\n", "").split("\n").filter(item => item.startsWith("*"));
            return `<h2>Keywords</h2><ul>${items.map(item => `<li>${item.replace("* ", "")}</li>`).join("")}</ul>`;
          } else {
            return `<p>${section}</p>`;
          }
        });
        formattedSummary = htmlSections.join("\n");
      }
      
      // Format response with Otter.ai styling
      return `
${EMOJIS.DOCUMENT} ${EMOJIS.SPARKLES} **Otter AI Meeting Summary**

${EMOJIS.CHECK_MARK} Summary for meeting: ${meeting.title}
${EMOJIS.CLOCK} Duration: ${meeting.duration ? Math.floor(meeting.duration / 60) : 30} minutes
${EMOJIS.MAGNIFYING_GLASS} Meeting ID: ${meetingId}

${EMOJIS.SPARKLES} Summary URL: ${meeting.summaryUrl}

${formattedSummary}
      `;
    } catch (error) {
      return `${EMOJIS.CROSS_MARK} Error getting transcript summary: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Analyze the quality of a recorded call using AI
   */
  @CreateAction({
    name: OTTER_AI_ACTION_NAMES.ANALYZE_CALL_QUALITY,
    description: "Analyze the quality of a recorded call using AI to determine if it meets quality standards",
    schema: AnalyzeCallQualitySchema,
  })
  async analyzeCallQuality(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof AnalyzeCallQualitySchema>
  ): Promise<string> {
    try {
      const { meetingId, serviceType, qualityThresholdOverride, includeRecommendations } = args;
      
      // Validate meeting ID
      if (!meetingId) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.MEETING_ID_REQUIRED}`;
      }
      
      // Get meeting info
      const meeting = this.meetings.get(meetingId);
      if (!meeting) {
        return `${EMOJIS.CROSS_MARK} Meeting with ID ${meetingId} not found`;
      }
      
      // Check if meeting has a transcript
      if (!meeting.hasTranscript) {
        // Try to get the transcript first
        const transcript = await this.getOtterAiTranscript(walletProvider, { meetingId, format: "plain" });
        if (transcript.includes(ERROR_MESSAGES.TRANSCRIPT_NOT_FOUND)) {
          return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.TRANSCRIPT_NOT_FOUND}`;
        }
      }
      
      // Check if analysis is available or generate it
      let analysis = this.analyses.get(meetingId);
      if (!analysis) {
        // For demo purposes, use the predefined analysis
        analysis = { ...DEMO_ANALYSIS, meetingId } as AnalysisResult;
        this.analyses.set(meetingId, analysis);
        
        // Update meeting status
        meeting.hasAnalysis = true;
        this.meetings.set(meetingId, meeting);
      }
      
      // Determine if the call quality passes the threshold
      const qualityThreshold = qualityThresholdOverride || QUALITY_THRESHOLDS.MIN_QUALITY_SCORE;
      const qualityPassed = analysis.qualityScore >= qualityThreshold;
      
      // Update the analysis
      analysis.qualityPassed = qualityPassed;
      this.analyses.set(meetingId, analysis);
      
      // Format the analysis into a readable string
      let analysisOutput = `
${EMOJIS.CHART} **Call Analysis Results**

${EMOJIS.CLOCK} Call Duration: ${analysis.callDuration / 60} minutes

${EMOJIS.TEACHER} ${EMOJIS.STUDENT} **Speaker Breakdown:**
${Object.entries(analysis.speakerBreakdown).map(([speaker, percentage]) => 
  `- ${speaker}: ${percentage}%`).join("\n")}

${EMOJIS.DOCUMENT} **Language Breakdown:**
${Object.entries(analysis.languageBreakdown).map(([language, percentage]) => 
  `- ${language}: ${percentage}%`).join("\n")}

${EMOJIS.SPARKLES} **Learning Objectives:**
${analysis.learningObjectives?.map(objective => `- ${objective}`).join("\n") || "N/A"}

${EMOJIS.DOCUMENT} **Vocabulary Covered:**
${analysis.vocabCoverage?.map(vocab => `- ${vocab}`).join("\n") || "N/A"}

${EMOJIS.STAR} **Quality Score: ${analysis.qualityScore}/10**
${qualityPassed ? `${EMOJIS.CHECK_MARK} Quality threshold passed!` : `${EMOJIS.CROSS_MARK} Quality threshold not met.`}

${EMOJIS.CHART} **Quality Breakdown:**
${Object.entries(analysis.qualityBreakdown || {}).map(([category, score]) => 
  `- ${category}: ${score}/10`).join("\n")}
`;

      // Include recommendations if requested
      if (includeRecommendations && analysis.recommendations) {
        analysisOutput += `
${EMOJIS.LIGHT_BULB} **Recommendations:**
${analysis.recommendations.map(recommendation => `- ${recommendation}`).join("\n")}
`;
      }
      
      // Add quality threshold information
      analysisOutput += `
${EMOJIS.MAGNIFYING_GLASS} **Quality Standards:**
- Minimum Quality Score: ${qualityThreshold}/10
- Minimum Duration: ${QUALITY_THRESHOLDS.MIN_DURATION_SECONDS / 60} minutes
- Minimum Student Speaking: ${QUALITY_THRESHOLDS.MIN_STUDENT_SPEAKING_PERCENTAGE}%
- Minimum Target Language Usage: ${QUALITY_THRESHOLDS.MIN_TARGET_LANGUAGE_PERCENTAGE}%
`;
      
      // Add payment authorization recommendation
      if (qualityPassed) {
        analysisOutput += `
${EMOJIS.CHECK_MARK} ${EMOJIS.MONEY} **Payment Recommendation:**
Based on the analysis, this service meets quality standards and payment can be authorized.
Use the "authorizePaymentBasedOnQuality" action to process the payment.
`;
      } else {
        analysisOutput += `
${EMOJIS.WARNING} ${EMOJIS.MONEY} **Payment Recommendation:**
Based on the analysis, this service does not meet quality standards and payment should be reviewed manually.
`;
      }
      
      return analysisOutput;
    } catch (error) {
      return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.ANALYSIS_FAILED} Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Authorize payment based on call quality analysis
   */
  @CreateAction({
    name: OTTER_AI_ACTION_NAMES.AUTHORIZE_PAYMENT,
    description: "Authorize payment based on call quality analysis",
    schema: AuthorizePaymentSchema,
  })
  async authorizePaymentBasedOnQuality(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof AuthorizePaymentSchema>
  ): Promise<string> {
    try {
      const { meetingId, qualityScore, qualityPassed, paymentAmount, paymentRecipient, notes } = args;
      
      // Validate meeting ID
      if (!meetingId) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.MEETING_ID_REQUIRED}`;
      }
      
      // Get meeting info
      const meeting = this.meetings.get(meetingId);
      if (!meeting) {
        return `${EMOJIS.CROSS_MARK} Meeting with ID ${meetingId} not found`;
      }
      
      // Get analysis to confirm quality
      const analysis = this.analyses.get(meetingId);
      if (!analysis) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.QUALITY_CHECK_REQUIRED} Please run analyzeCallQuality first.`;
      }
      
      // Determine if payment should be authorized
      const shouldAuthorize = qualityPassed || analysis.qualityPassed;
      
      if (!shouldAuthorize) {
        return `${EMOJIS.CROSS_MARK} ${ERROR_MESSAGES.QUALITY_THRESHOLD_NOT_MET} Payment cannot be authorized.`;
      }
      
      // Generate transaction ID
      const transactionId = `tx_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      
      // Create payment authorization record
      const authorization: PaymentAuthorization = {
        meetingId,
        authorized: true,
        amount: paymentAmount,
        recipient: paymentRecipient,
        timestamp: new Date(),
        reason: notes || `Quality score: ${qualityScore || analysis.qualityScore}/10`,
        transactionId,
      };
      
      // Store the authorization
      this.paymentAuthorizations.set(meetingId, authorization);
      
      // Format response with payment details
      return `
${EMOJIS.CHECK_MARK} ${EMOJIS.MONEY} **Payment Authorization Successful**

${EMOJIS.DOCUMENT} **Meeting Details:**
- Meeting ID: ${meetingId}
- Meeting Title: ${meeting.title}
- Duration: ${meeting.duration ? Math.floor(meeting.duration / 60) : 30} minutes

${EMOJIS.STAR} **Quality Assessment:**
- Quality Score: ${qualityScore || analysis.qualityScore}/10
${shouldAuthorize ? `${EMOJIS.CHECK_MARK} Quality threshold passed!` : `${EMOJIS.CROSS_MARK} Quality threshold not met.`}

${EMOJIS.MONEY} **Payment Details:**
- Amount: ${paymentAmount || "Service standard rate"}
- Recipient: ${paymentRecipient || "Service provider"}
- Transaction ID: ${transactionId}
- Timestamp: ${authorization.timestamp.toLocaleString()}
${notes ? `- Notes: ${notes}` : ""}

${EMOJIS.SPARKLES} **Payment has been authorized and will be processed.**
The service provider will receive payment according to the agreed terms.
`;
    } catch (error) {
      return `${EMOJIS.CROSS_MARK} Error authorizing payment: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
} 