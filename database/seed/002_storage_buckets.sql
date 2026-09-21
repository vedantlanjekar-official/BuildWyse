-- Storage buckets for BuildWyse (run via Supabase SQL editor or execute_sql)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('evidence', 'evidence', false, 52428800, ARRAY['image/png','image/jpeg','image/webp','application/pdf','text/plain']),
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf','text/markdown','text/plain','application/json']),
  ('identity', 'identity', false, 20971520, ARRAY['image/png','image/jpeg','application/pdf']),
  ('certificates', 'certificates', true, 10485760, ARRAY['image/png','application/pdf'])
ON CONFLICT (id) DO NOTHING;
