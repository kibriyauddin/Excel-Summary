-- Remove anonymous access to stored processing results.
DROP POLICY IF EXISTS "Enable public insert access" ON public.processing_results;
DROP POLICY IF EXISTS "Enable public read access" ON public.processing_results;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.processing_results;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.processing_results;

CREATE POLICY "Authenticated users can read their own results"
  ON public.processing_results FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert their own results"
  ON public.processing_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can update their own results"
  ON public.processing_results FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
