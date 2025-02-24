export interface ProcessingResult {
  id: string;
  user_id: string;
  type: 'summary' | 'subtitles';
  input_type: 'text' | 'document' | 'video' | 'url';
  original_content: string;
  processed_content: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  created_at: string;
}