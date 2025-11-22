// User Profile information retrieved from the backend
export interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  linkedin_profile: string;
  personal_website?: string;
  github_profile?: string;
  phone_number: string;
  location: string;
  cv_url?: string;
}

// This interface defines the structure of a successful analysis from the backend
export interface AnalysisResult {
  relevancyScore: number;
  suggestions: string[];
}

// --- Messages Sent TO Listeners ---

// Message from Popup -> Background to start scraping the JD
export interface GetJobDescriptionMessage {
  type: "getJobDescription";
}

// Message from Background -> Content Script to execute the scrape
export interface ScrapeTextMessage {
  type: "scrapeText";
}

// Response from Content Script -> Background with the scraped text
export interface ScrapeTextResponse {
  text?: string;
  error?: string;
}

// Message from Popup -> Content Script to show the cover letter modal
export interface ShowCoverLetterModalMessage {
  type: "showCoverLetterModal";
  text: string;
}

// Message from Background -> Popup with the final analysis result
export interface AnalysisCompletePayload {
  analysis: AnalysisResult;
  jobDescription: string;
}

// Message from Popup to Background Script to start the full analysis pipeline
export interface StartAnalysisMessage {
  type: "startAnalysis";
  resumeText: string;
}

export interface AnalysisCompleteMessage {
  type: "analysisComplete";
  data: AnalysisCompletePayload;
}

// Message from Background -> Popup when an analysis error occurs
export interface AnalysisErrorMessage {
  type: "analysisError";
  error: string;
}

// --- Responses Sent FROM API Calls ---
export interface ScoreResponse {
  relevancyScore: number;
}

export interface ResumeWithScore extends Resume {
  score?: number | 'loading';
}

export interface SuggestionsResponse {
  suggestions: string[];
}

// --- A Comprehensive Union Type for ALL Messages ---
// This is the type that all our onMessage listeners will use.
export type ExtensionMessage =
  | GetJobDescriptionMessage
  | ScrapeTextMessage
  | ShowCoverLetterModalMessage
  | AnalysisCompleteMessage
  | AnalysisErrorMessage;

// --- Responses Sent VIA sendResponse Callback ---

export interface Resume {
  id: number;
  filename: string;
  company: string;
  autoscore: boolean;
}

export interface UploadResponse {
  filename: string;
  company: string;
  message: string;
  content: string;
}


export interface TailoredContent {
  summary: string;
  education: {
    school: string;
    degree: string;
    date: string;
    coursework: string;
    gpa: string;
  }[];
  skills: {
    languages_databases: string;
    cloud: string;
    development: string;
    others: string;
  };
  experience: {
    company: string;
    date: string;
    title: string;
    location: string;
    points: string[];
  }[];
  projects: {
    name: string;
    technologies: string;
    points: string[];
  }[];
  achievements: string[];
}

export interface TailoredResumeSchema extends TailoredContent {
  name: string;
  phone: string;
  location: string;
  email: string;
  portfolio_url: string;
  linkedin_url: string;
  github_url: string;
}

// Type for the cover letter response
export interface CoverLetterResponse {
  cover_letter_text: string;
}