/*
  # Initial Schema Setup

  1. New Tables
    - processing_results
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - type (text, either 'summary' or 'subtitles')
      - input_type (text, either 'text', 'document', 'video', or 'url')
      - original_content (text)
      - processed_content (text)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on processing_results table
    - Add policies for authenticated users to manage their own data
*/

CREATE TABLE IF NOT EXISTS processing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('summary', 'subtitles')),
  input_type text NOT NULL CHECK (input_type IN ('text', 'document', 'video', 'url')),
  original_content text NOT NULL,
  processed_content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE processing_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own results"
  ON processing_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own results"
  ON processing_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own results"
  ON processing_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);