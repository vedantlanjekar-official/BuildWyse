-- Allow budget recommendation documents in project_documents
ALTER TABLE public.project_documents
  DROP CONSTRAINT IF EXISTS project_documents_document_type_check;

ALTER TABLE public.project_documents
  ADD CONSTRAINT project_documents_document_type_check
  CHECK (document_type IN (
    'concept_logic',
    'prd',
    'technology_stack',
    'frontend_design',
    'hardware_spec',
    'architecture',
    'development_phases',
    'budget',
    'other'
  ));
