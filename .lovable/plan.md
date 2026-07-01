# Plan: Universal Source-Type Support Across All 14 Tabs

This change touches a single 3980-line `src/App.jsx`. To keep it safe and reviewable, I'll introduce one central "source schema" layer and route every tab through it — no tab logic gets rewritten from scratch, only redirected to the shared layer.

## 1. Central source schema (new module: `src/sources.js`)

A single file all tabs import from. Defines:

- `SOURCE_TYPES` — the 12 types (كتاب عربي، كتاب أجنبي، رسالة ماجستير، أطروحة دكتوراه، بحث علمي، مجلة علمية، مؤتمر علمي، صحيفة، موقع إلكتروني، موسوعة، وثيقة أرشيفية، تقرير رسمي، مصدر أولي).
- `FIELDS_BY_TYPE` — per-type field list (author/title/publisher/year/url/archiveRef/...).
- `BIB_SECTIONS` — the 7 final-bibliography sections + the rule that maps each type → section.
- `formatCitation(source)` — returns the formatted footnote per the templates you specified (book / thesis / article / conference / newspaper / website / archive / encyclopedia).
- `formatBibEntry(source)` — same but page number stripped, author as "Last, First".
- `detectTypeFromUrl(url, meta)` — heuristic for the URL importer (journal/news/encyclopedia/website).

## 2. Per-tab integration (in `src/App.jsx`)

For each tab I only change the read/write path, not the surrounding UI shell:

1. **🏠 Home** — stats/diversity/latest already read from `combinedDocs`; switch the diversity labels to `SOURCE_TYPES` and count by `source.type`.
2. **📖 Structure** — already uses `combinedDocs`; ensure library items expose `type` so badges count every type.
3. **🗂️ Documents** — filter dropdown rendered from `SOURCE_TYPES`; search scans all type-specific fields.
4. **🗃️ Smart Cards** — AI prompt switched to "مصادر" + lists author/type instead of archive-ref only.
5. **🌐 Translator** — "Add to Archive" becomes "Add to Library" with a type selector (defaults to current archive type).
6. **📜 Dictionary** — untouched.
7. **📚 My Library** — type dropdown wired to `SOURCE_TYPES`; form fields rendered dynamically from `FIELDS_BY_TYPE[type]`.
8. **🔗 URL Import** — after fetch, calls `detectTypeFromUrl` and pre-fills the dynamic form.
9. **➕ Add Source** — same dynamic form as My Library (shared sub-component `<SourceFields type=... value=... onChange=... />`).
10. **📤 Export** — list shows all types; per-row citation uses `formatCitation`.
11. **📋 Final References** — sections built from `BIB_SECTIONS`; sort alphabetically by last-name within each.
12. **🎓 Defense Simulator** — chapter-scoped source list pulls from `combinedDocs` + includes `type` and `author` in the prompt.
13. **🤖 AI Assistant** — same context expansion as #12.
14. **✈️ Telegram** — suggestion query loops over `combinedDocs` (all types), not docs-only.

## 3. Data-shape compatibility

Existing `DOCS_FROM_INDEX` records get a default `type: "وثيقة أرشيفية"` at load time so nothing breaks. Existing `library` localStorage entries keep their keys; `sourceType` is read as `type` if present. Footnote modal + bibliography builder keep their current entry points — only the citation formatter behind them changes.

## 4. Verification

Drive Playwright through the 8 acceptance tests you listed (add book → Home/Export; add thesis → Structure; URL import auto-detect; Export shows mixed types; bibliography sectioning; dashboard counts; simulator prompt; all 14 tabs open).

## Risk / scope note

This is a large surgical pass on one 3980-line file. I will not delete `DOCS_FROM_INDEX`, the footnote modal, the bibliography modal, or any tab. If during implementation a tab's existing structure makes a clean swap impossible without rewriting that tab, I will stop and report rather than rewrite it.

Approve and I'll execute end-to-end in the next turn.
