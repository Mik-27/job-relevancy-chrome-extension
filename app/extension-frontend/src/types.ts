// This interface defines the structure of a successful analysis from the backend
export interface AnalysisResult {
  relevancyScore: number;
  suggestions: string[];
}

// --- Messages Sent TO Listeners ---

// Message from Popup/Background to Content Script to start scraping
export interface ScrapeTextMessage {
  type: "scrapeText";
}

// Message from Popup to Background Script to start the full analysis pipeline
export interface StartAnalysisMessage {
  type: "startAnalysis";
  resumeText: string;
}

export interface AnalysisCompletePayload {
  analysis: AnalysisResult;
  jobDescription: string;
}

// Message from Background to Popup with the final analysis result
export interface AnalysisCompleteMessage {
  type: "analysisComplete";
  data: AnalysisCompletePayload;
}

// Message from Background to Popup when an error occurs
export interface AnalysisErrorMessage {
  type: "analysisError";
  error: string;
}

// --- Responses Sent FROM API Calls ---
export interface ScoreResponse {
  relevancyScore: number;
}

export interface SuggestionsResponse {
  suggestions: string[];
}

// A union type representing all possible messages our listeners can receive
export type ChromeMessage = 
  | ScrapeTextMessage
  | StartAnalysisMessage
  | AnalysisCompleteMessage
  | AnalysisErrorMessage;

// --- Responses Sent VIA sendResponse Callback ---

// Response from Content Script back to the sender with the scraped text
export interface ScrapeTextResponse {
  text: string;
}

export interface Resume {
  id: number;
  filename: string;
  company: string;
}

export interface UploadResponse {
  filename: string;
  company: string;
  message: string;
  content: string;
}