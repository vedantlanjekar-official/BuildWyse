-- Ensure documents storage bucket exists (also in database/seed/002_storage_buckets.sql).
-- Run via Supabase SQL editor or: supabase db execute -f database/migrations/002_documents_storage.sql

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf','text/markdown','text/plain','application/json'])
ON CONFLICT (id) DO NOTHING;

-- document_versions.file_url stores the storage path: {project_id}/{document_id}/v{version}.pdf
-- document_versions.content holds markdown; content_json holds structured AI output + pdf_path
