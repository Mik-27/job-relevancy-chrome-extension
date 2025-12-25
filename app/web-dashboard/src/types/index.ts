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

export type InterviewType = 'screening' | 'technical' | 'system_design' | 'behavioral' | 'hiring_manager';
export type RoundStatus = 'scheduled' | 'progressed' | 'rejected' | 'cancelled';

export interface PrepQuestion {
  q: string;    // The question text
  hint: string; // The answer key or advice
  sample_answer: string; // A sample answer or solution
}

export interface InterviewPrepMaterial {
  focus_areas: string[];
  questions: PrepQuestion[];
  tips: string[];
}

export interface InterviewRound {
  id: string;
  application_id: string;
  round_number: number;
  interview_type: InterviewType;
  interview_date: string | null;
  status: RoundStatus;
  user_feedback: string | null;
  // CHANGED: No longer 'any', now strictly typed
  prep_material: InterviewPrepMaterial | null; 
  created_at: string;
}