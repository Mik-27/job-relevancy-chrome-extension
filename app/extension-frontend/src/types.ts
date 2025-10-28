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

// Message from Background to Popup with the final analysis result
export interface AnalysisCompleteMessage {
  type: "analysisComplete";
  data: AnalysisResult;
}

// Message from Background to Popup when an error occurs
export interface AnalysisErrorMessage {
  type: "analysisError";
  error: string;
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