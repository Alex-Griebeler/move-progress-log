
-- Fix ai_project_memory policies: INSERT uses WITH CHECK
CREATE POLICY "service role insert" ON public.ai_project_memory FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "service role update" ON public.ai_project_memory FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "service role delete" ON public.ai_project_memory FOR DELETE USING (auth.role() = 'service_role');
