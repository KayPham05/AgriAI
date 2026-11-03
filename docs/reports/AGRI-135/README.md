# AGRI-135 — Extraction labels

2026-11-04, branch AGRI-135-extraction-labels. Renamed the Admin menu/title to Trích xuất / Quản lý trích xuất and aligned public headings, page metadata, related links, footer and editor preview labels. Existing source links, storage fields and /knowledge/API routes are preserved; no extraction automation was added.

Affected: AdminCrmPage.tsx, catalogUi.ts, CatalogEditor.tsx, PublicCatalog.tsx, AppShell.tsx and knowledge page metadata.

Verification: existing CatalogEditor and PublicKnowledge tests passed 11/11 (.cache/agri135-green.log). This is a copy-only change; no mirrored string-only tests added. DoD: implementation and focused verification complete; combined verification/review pending.
