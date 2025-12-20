export interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  linkedin_profile: string;
  personal_website?: string;
  phone_number: string;
  location: string;
  cv_url?: string;
}

export interface OutreachRecord {
  id: string;
  prospect_name: string;
  prospect_email?: string;
  company_name?: string;
  job_link?: string;
  status: string;
  created_at: string;
  draft_metadata?: {
    id: string;
    message?: {
      id: string;
      threadId: string;
    };
  };
  sent_at?: string;
}

// NEW: Response interface matching backend schema
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}


// Define Resume Interface locally or in types/index.ts
export interface ResumeItem {
  id: number;
  filename: string;
  company: string;
  created_at: string;
  autoscore: boolean;
  file_url?: string;
  tags_role: string[];
  tags_category: string[];
}

export interface UploadResumeResponse {
  filename: string;
  company: string;
  message: string;
  content: string;
  resume: ResumeItem;
}

export interface Application {
  id: string;
  company_name: string;
  job_title: string;
  job_url?: string;
  job_id?: string;
  salary_range?: string;
  status: 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';
  referred_by?: string;
  resume_id?: number;
  job_description?: string;
  notes?: string;
  on_board: boolean;
  created_at: string;
  updated_at: string;
}

// --- Interview Prep Types ---

export interface CompanyAnalysis {
  values: string[];
  tech_stack: string[];
  challenges: string[];
}

export interface TechnicalQuestion {
  question: string;
  topic: string;
  answer_key: string;
}

export interface ResumeDeepDiveQuestion {
  question: string;
  context: string;
}

export interface BehavioralQuestion {
  question: string;
  competency: string;
}

export interface InterviewPrepContent {
  company_analysis: CompanyAnalysis;
  technical_questions: TechnicalQuestion[];
  resume_deep_dive: ResumeDeepDiveQuestion[];
  behavioral_questions: BehavioralQuestion[];
}

export interface InterviewPrep {
  id: string;
  application_id: string;
  content: InterviewPrepContent;
  created_at: string;
}