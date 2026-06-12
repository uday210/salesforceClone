# Salesforce Clone — a metadata-driven platform

A Salesforce-style **low-code platform** (not just a CRM) built with **Next.js 14**, **Supabase**, and **PostgreSQL**. Everything — objects, fields, pages, permissions, and automation — is stored as metadata and rendered dynamically, the same architecture that makes Salesforce work.

> **Honest scope note:** This reproduces Salesforce's *concepts and architecture*. The proprietary runtimes (the real Apex language, the LWC/Visualforce engines) are not literally reimplemented — they are represented by faithful, working substitutes (sandboxed JavaScript, HTML/JS components, a VF-style markup renderer). See the table below.

## Features

### Core CRM
- **Auth** via Supabase (sign up / log in)
- **Standard objects**: Account, Contact, Lead, Opportunity, Task — seeded with fields, picklists, and sample data
- **Dynamic record UI**: list views, detail pages, related lists, create/edit forms — all generated from metadata
- **Opportunity Kanban** pipeline with drag-and-drop stage changes
- **Sales Path** on Opportunity/Lead, **global search**, **dashboard** and **report builder** with charts

### Platform (Setup)
| Salesforce feature | What this app does | Parity |
|---|---|---|
| Custom Objects & Fields | Create objects/fields in the UI; stored as metadata, CRUD is generic | ✅ |
| Record Types | Per-object record types | ✅ |
| Validation Rules | Condition builder, enforced on save | ✅ |
| List Views | Per-object views with column config | ✅ |
| Profiles & Permission Sets | Object-level permission matrices, assignable to users | ✅ |
| Apps, Tabs & Navigation | App Manager + tab builder, dynamic nav | ✅ |
| Lightning App Builder | Drag-and-drop record/app/home page builder | ✅ |
| Flow Builder | Visual node graph (decision/assignment/action), runs on record events | 🟡 simplified |
| Apex | Classes & triggers authored in JS, run in a sandbox on record events | 🔴 substitute |
| Lightning Web Components | HTML/JS/CSS components with live preview | 🔴 substitute |
| Visualforce Pages | VF-style markup with a renderer | 🔴 substitute |
| Custom Labels & Custom Settings | Reusable text + config data | ✅ |

## Architecture

- **`sf_objects` / `sf_fields` / `sf_record_types`** — object & field metadata
- **`sf_records`** — a single generic table holding every record of every object as JSONB (`data`). This is what lets you create new objects without DDL.
- **`sf_list_views`, `sf_page_layouts`, `sf_lightning_pages`, `sf_apps`, `sf_tabs`** — UI metadata
- **`sf_profiles`, `sf_permission_sets`, `sf_object_permissions`, `sf_user_assignments`** — security
- **`sf_flows`, `sf_apex_classes`, `sf_lwc_components`, `sf_vf_pages`** — automation & code
- All tables are `sf_`-prefixed, RLS-enabled (authenticated access), with permission enforcement in the app layer.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon/publishable key
npm run dev
```

Environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

The database schema lives in `supabase/schema.sql`. Apply it to a fresh Supabase project, then sign up in the app — the first user is auto-assigned the System Administrator profile.

> **Auth note:** If Supabase "Confirm email" is enabled, new users must confirm before logging in. For a frictionless demo, disable it under **Authentication → Providers → Email** in the Supabase dashboard.

## Deploy to Railway

1. Push this repo to GitHub.
2. In Railway, **New Project → Deploy from GitHub repo**.
3. Add environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (these are read at build time).
4. Railway auto-detects Next.js (`npm run build` / `npm run start`); the start script binds to `$PORT`.

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · Supabase (Postgres + Auth) · lucide-react. Charts and drag-and-drop are hand-rolled (no heavy chart/DnD dependencies).
