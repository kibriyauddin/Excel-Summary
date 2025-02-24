/*
  # Fix RLS Policies and Add Public Access

  1. Changes
    - Update RLS policies to handle both authenticated and public access
    - Add enable_row_level_security to ensure policies are enforced
    - Add public access policy for initial inserts

  2. Security
    - Maintain data isolation between users
    - Allow public access for initial processing
    - Ensure data integrity
*/

CREATE TABLE IF NOT EXISTS processing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('summary', 'subtitles')),
  input_type text NOT NULL CHECK (input_type IN ('text', 'document', 'video', 'url')),
  original_content text NOT NULL,
  processed_content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE processing_results ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own results" ON processing_results;
DROP POLICY IF EXISTS "Users can view their own results" ON processing_results;
DROP POLICY IF EXISTS "Users can update their own results" ON processing_results;
DROP POLICY IF EXISTS "Public can insert results" ON processing_results;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users"
  ON processing_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Enable insert access for authenticated users"
  ON processing_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable public insert access"
  ON processing_results FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Enable public read access"
  ON processing_results FOR SELECT
  TO anon
  USING (user_id IS NULL);