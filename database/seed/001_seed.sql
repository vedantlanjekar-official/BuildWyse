-- BuildWyse Platform — Initial Seed Data
-- Run after 001_initial_schema.sql and 001_rls_policies.sql
--
-- NOTE: This seed does NOT insert into auth.users.
-- User accounts must be created via Supabase Auth (signup) or the application
-- seed/bootstrap process, which should then insert matching rows into
-- public.profiles and public.user_roles.

BEGIN;

-- ---------------------------------------------------------------------------
-- Skills catalog
-- ---------------------------------------------------------------------------
INSERT INTO public.skills (name, category, description) VALUES
  -- Frontend
  ('React', 'Frontend', 'React library for building user interfaces'),
  ('Next.js', 'Frontend', 'React framework for production-grade applications'),
  ('TypeScript', 'Frontend', 'Typed superset of JavaScript'),
  ('JavaScript', 'Frontend', 'Core web programming language'),
  ('Tailwind CSS', 'Frontend', 'Utility-first CSS framework'),
  ('HTML5', 'Frontend', 'Markup language for web pages'),
  ('CSS3', 'Frontend', 'Stylesheet language for web presentation'),
  ('Vue.js', 'Frontend', 'Progressive JavaScript framework'),
  ('Angular', 'Frontend', 'Platform for building mobile and desktop web applications'),
  ('Svelte', 'Frontend', 'Modern frontend compiler framework'),
  ('Redux', 'Frontend', 'Predictable state container for JavaScript apps'),
  ('Zustand', 'Frontend', 'Lightweight state management for React'),

  -- UI/UX & Design
  ('UI/UX Design', 'Design', 'User interface and user experience design'),
  ('Figma', 'Design', 'Collaborative interface design tool'),
  ('Adobe XD', 'Design', 'UX/UI design and prototyping tool'),
  ('Wireframing', 'Design', 'Low-fidelity layout and structure design'),
  ('Prototyping', 'Design', 'Interactive mockups and design validation'),
  ('Design Systems', 'Design', 'Reusable component and pattern libraries'),
  ('Accessibility (WCAG)', 'Design', 'Web accessibility standards and implementation'),

  -- Backend
  ('Node.js', 'Backend', 'JavaScript runtime for server-side development'),
  ('Python', 'Backend', 'General-purpose programming language'),
  ('Django', 'Backend', 'High-level Python web framework'),
  ('FastAPI', 'Backend', 'Modern Python API framework'),
  ('Express.js', 'Backend', 'Minimal Node.js web application framework'),
  ('NestJS', 'Backend', 'Progressive Node.js framework for scalable APIs'),
  ('Java', 'Backend', 'Enterprise-grade object-oriented language'),
  ('Spring Boot', 'Backend', 'Java framework for microservices and APIs'),
  ('Go', 'Backend', 'Compiled language for efficient backend services'),
  ('Ruby on Rails', 'Backend', 'Full-stack Ruby web framework'),
  ('PHP', 'Backend', 'Server-side scripting language'),
  ('Laravel', 'Backend', 'PHP web application framework'),
  ('GraphQL', 'Backend', 'Query language for APIs'),
  ('REST APIs', 'Backend', 'Representational state transfer API design'),

  -- Database
  ('PostgreSQL', 'Database', 'Advanced open-source relational database'),
  ('MySQL', 'Database', 'Popular open-source relational database'),
  ('MongoDB', 'Database', 'Document-oriented NoSQL database'),
  ('Redis', 'Database', 'In-memory data structure store and cache'),
  ('Supabase', 'Database', 'Open-source Firebase alternative with Postgres'),
  ('Prisma', 'Database', 'Next-generation ORM for Node.js and TypeScript'),
  ('SQL', 'Database', 'Structured query language for relational databases'),

  -- DevOps & Cloud
  ('Docker', 'DevOps', 'Containerization platform'),
  ('Kubernetes', 'DevOps', 'Container orchestration system'),
  ('AWS', 'DevOps', 'Amazon Web Services cloud platform'),
  ('Google Cloud', 'DevOps', 'Google Cloud Platform services'),
  ('Azure', 'DevOps', 'Microsoft cloud computing platform'),
  ('Vercel', 'DevOps', 'Frontend cloud platform for Next.js deployments'),
  ('CI/CD', 'DevOps', 'Continuous integration and deployment pipelines'),
  ('Terraform', 'DevOps', 'Infrastructure as code tool'),
  ('Linux', 'DevOps', 'Unix-like operating system for servers'),

  -- Mobile
  ('React Native', 'Mobile', 'Cross-platform mobile framework using React'),
  ('Flutter', 'Mobile', 'Google UI toolkit for cross-platform apps'),
  ('Swift', 'Mobile', 'Apple platform programming language'),
  ('Kotlin', 'Mobile', 'Modern language for Android development'),
  ('iOS Development', 'Mobile', 'Native Apple mobile application development'),
  ('Android Development', 'Mobile', 'Native Google mobile application development'),

  -- AI & Data
  ('Machine Learning', 'AI/ML', 'Algorithms that learn from data'),
  ('TensorFlow', 'AI/ML', 'Open-source machine learning framework'),
  ('PyTorch', 'AI/ML', 'Deep learning framework'),
  ('OpenAI API', 'AI/ML', 'Integration with OpenAI language and embedding models'),
  ('LangChain', 'AI/ML', 'Framework for LLM-powered application development'),
  ('Data Analysis', 'AI/ML', 'Statistical analysis and data interpretation'),
  ('Pandas', 'AI/ML', 'Python data analysis library'),

  -- Hardware & IoT
  ('Embedded Systems', 'Hardware', 'Firmware and microcontroller development'),
  ('IoT', 'Hardware', 'Internet of Things device integration'),
  ('Arduino', 'Hardware', 'Open-source electronics prototyping platform'),
  ('Raspberry Pi', 'Hardware', 'Single-board computer for embedded projects'),
  ('PCB Design', 'Hardware', 'Printed circuit board design and layout'),

  -- Testing & Quality
  ('Jest', 'Testing', 'JavaScript testing framework'),
  ('Cypress', 'Testing', 'End-to-end testing framework'),
  ('Playwright', 'Testing', 'Cross-browser automation and testing'),
  ('Unit Testing', 'Testing', 'Testing individual code units in isolation'),
  ('QA Engineering', 'Testing', 'Quality assurance and test strategy'),

  -- Project & Soft Skills
  ('Agile/Scrum', 'Methodology', 'Iterative project management methodology'),
  ('Technical Writing', 'Soft Skills', 'Documentation and specification writing'),
  ('Project Management', 'Soft Skills', 'Planning, execution, and delivery management'),
  ('Communication', 'Soft Skills', 'Client and team communication skills')
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- ---------------------------------------------------------------------------
-- Application bootstrap reminder
-- ---------------------------------------------------------------------------
-- After creating users via Supabase Auth, the app should:
--   1. INSERT INTO public.profiles (id, email, ...) VALUES (auth_user_id, ...);
--   2. INSERT INTO public.user_roles (user_id, role) VALUES (..., 'client'|'freelancer'|...);
--   3. For freelancers: INSERT INTO public.freelancer_profiles (user_id, ...);
--   4. For enterprise: INSERT INTO public.organizations + organization_members;
