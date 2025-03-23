import { z } from "zod";

// Otter AI action provider constants
export const OTTER_AI_ACTION_NAMES = {
  JOIN_CALL: "joinMeetingWithOtterAi",
  GET_TRANSCRIPT: "getOtterAiTranscript",
  GET_TRANSCRIPT_SUMMARY: "getOtterAiTranscriptSummary",
  ANALYZE_CALL_QUALITY: "analyzeCallQuality",
  AUTHORIZE_PAYMENT: "authorizePaymentBasedOnQuality",
};

export const OTTER_AI_DESCRIPTION = "An AI assistant that can join calls, record and transcribe meetings, analyze call quality, and authorize payments based on quality metrics.";

// Error messages for common failures
export const ERROR_MESSAGES = {
  INVALID_MEETING_LINK: "Invalid meeting link. Please provide a valid Google Meet or Zoom link.",
  MEETING_ACCESS_FAILED: "Failed to access the meeting. Please check your permissions and try again.",
  TRANSCRIPT_NOT_FOUND: "Transcript not found for this meeting.",
  SUMMARY_NOT_FOUND: "Summary not found for this meeting.",
  ANALYSIS_FAILED: "Failed to analyze call quality.",
  MEETING_ID_REQUIRED: "Meeting ID is required.",
  QUALITY_CHECK_REQUIRED: "Quality check is required before authorizing payment.",
  QUALITY_THRESHOLD_NOT_MET: "Quality threshold not met. Payment cannot be authorized."
};

// Service quality thresholds
export const QUALITY_THRESHOLDS = {
  MIN_QUALITY_SCORE: 7,
  MIN_DURATION_SECONDS: 1200, // 20 minutes
  MIN_STUDENT_SPEAKING_PERCENTAGE: 40,
  MIN_TARGET_LANGUAGE_PERCENTAGE: 80
};

// Demo data
export const DEMO_TRANSCRIPT = `
User A: Good morning! How are you today?
User B: I'm doing well, thank you. I'm ready for our lesson.
User A: Great! Today we'll be focusing on conversational phrases for travel.
User B: That sounds useful. I'm planning a trip next month.
User A: Perfect! Let's start with some basic expressions you might use at the airport.
User B: I often struggle with understanding announcements at airports.
User A: That's a common challenge. Let's practice some airline announcements first.
User B: Could you speak a bit slower please?
User A: Of course. Let's take it step by step. Repeat after me: "Excuse me, what time is boarding?"
User B: Excuse me, what time is boarding?
User A: Very good! Now try: "Which gate is flight AC123 departing from?"
User B: Which gate is flight AC123 departing from?
User A: Excellent pronunciation! Let's continue with some restaurant vocabulary...
`;

export const DEMO_SUMMARY = `
Overview
A 30-minute language learning session focused on travel phrases. The teacher introduced airport and travel vocabulary, with the student practicing pronunciation and asking questions. The student mentioned an upcoming trip and expressed difficulty with understanding airport announcements.

Action Items

* Student to review airport vocabulary flashcards
* Practice listening to sample airport announcements (link shared in chat)
* Complete exercise 3.4 in the textbook
* Prepare 3 questions about hotel reservations for next session

Outline
1. Introduction and greeting (0:00-2:15)
2. Discussion of travel needs and challenges (2:15-5:30)
3. Airport vocabulary and phrases (5:30-15:45)
4. Pronunciation practice and correction (15:45-25:10)
5. Summary and homework assignment (25:10-30:00)

Keywords

* Travel vocabulary
* Airport announcements
* Pronunciation
* Listening comprehension
* Practice dialogues
`;

// Demo call analysis results
export const DEMO_ANALYSIS = {
  meetingId: "",
  callDuration: 1800, // 30 minutes
  qualityScore: 8.5,
  qualityPassed: true,
  speakerBreakdown: {
    "Teacher": 55,
    "Student": 45
  },
  languageBreakdown: {
    "Target Language": 85,
    "Native Language": 15
  },
  learningObjectives: [
    "Practice travel-related vocabulary",
    "Improve pronunciation of question phrases",
    "Develop listening comprehension for public announcements"
  ],
  vocabCoverage: [
    "Airport terminology",
    "Travel booking phrases",
    "Transportation vocabulary",
    "Hotel check-in expressions"
  ],
  qualityBreakdown: {
    "Student Engagement": 8,
    "Teacher Clarity": 9,
    "Pronunciation Correction": 8.5,
    "Vocabulary Relevance": 9,
    "Pacing": 7.5
  },
  recommendations: [
    "Provide more listening exercises for airport announcements",
    "Allow more time for student to practice complex sentences",
    "Include more realistic dialogue scenarios",
    "Consider supplementary materials for airport vocabulary"
  ]
};

// Otter AI meeting recording status options
export enum MeetingStatus {
  JOINING = "joining",
  RECORDING = "recording",
  TRANSCRIBING = "transcribing",
  COMPLETED = "completed",
  FAILED = "failed"
}

// Otter AI portal URLs - simulated
export const OTTER_AI_URLS = {
  TRANSCRIPT_BASE: "https://otter.ai/u/",
  TRANSCRIPT: "/notes",
  SUMMARY: "/summary"
};

// Otter AI API endpoints - simulated
export const OTTER_AI_API = {
  JOIN_MEETING: "https://api.otter.ai/v1/meetings/join",
  GET_TRANSCRIPT: "https://api.otter.ai/v1/meetings/{meetingId}/transcript",
  GET_SUMMARY: "https://api.otter.ai/v1/meetings/{meetingId}/summary",
  ANALYZE_QUALITY: "https://api.otter.ai/v1/meetings/{meetingId}/analyze"
};

// Emoji constants for nicer output
export const EMOJIS = {
  CHECK_MARK: "✅",
  CROSS_MARK: "❌",
  WARNING: "⚠️",
  DOCUMENT: "📄",
  MICROPHONE: "🎤",
  HEADPHONES: "🎧",
  ROBOT: "🤖",
  MAGNIFYING_GLASS: "🔍",
  CLOCK: "⏱️",
  SPARKLES: "✨",
  STAR: "⭐",
  LIGHT_BULB: "💡",
  CHART: "📊",
  MONEY: "💰",
  TEACHER: "👨‍🏫",
  STUDENT: "👨‍🎓"
}; 