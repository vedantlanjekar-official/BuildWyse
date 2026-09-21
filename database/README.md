# BuildWyse Database

PostgreSQL schema, migrations, RLS policies, and seed data for Supabase project **qeumykfaranencaeewjv**.

## Quick links

- Full schema docs: [docs/database/DATABASE.md](../docs/database/DATABASE.md)
- RLS retest guide: [tests/security/test_rls_notes.md](../tests/security/test_rls_notes.md)
- Product workflows: [000_WORKFLOWS_AND_MODULE_CONNECTIONS.md](../000_WORKFLOWS_AND_MODULE_CONNECTIONS.md)

## Directory layout

```
database/
├── migrations/
│   ├── parts/              # Ordered migration parts (01–15)
│   ├── chunks/             # Alternative chunked apply files
│   ├── 001_initial_schema.sql
│   └── 001_initial_schema_apply.sql
├── policies/
│   └── 001_rls_policies.sql
└── seed/
    └── 001_seed.sql
```

## Apply order

1. `migrations/parts/01_extensions.sql` through `14_platform.sql`
2. `migrations/parts/15_helper_functions.sql`
3. `policies/001_rls_policies.sql`
4. `seed/001_seed.sql` (optional)

Or run the monolithic `001_initial_schema_apply.sql` then policies + helpers.

## Supabase project

- **URL:** `https://qeumykfaranencaeewjv.supabase.co`
- **Dashboard:** https://supabase.com/dashboard/project/qeumykfaranencaeewjv
- **Tables:** 84 public application tables
- **Extensions:** uuid-ossp, pgcrypto, pgvector

Never paste service role keys into this repository.
