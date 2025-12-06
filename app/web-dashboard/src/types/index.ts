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

export interface UploadResumeResponse {
  filename: string;
  company: string;
  message: string;
  content: string;
}