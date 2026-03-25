# Project Planning Notes

## What This Is

A personal biographical archive visualized as a "life in weeks" grid — 100 years × 52 weeks, each cell representing one week of life. Weeks containing artifacts are highlighted. The concept is inspired by Dr. Peter Attia's life-in-weeks visualization.

The owner (Dan Ryan, born 1959-07-07) is building a tool to process and display his personal archive: letters, photos, documents, and eventually audio/video. The goal is to eventually have something from every week of his life represented.

---

## Current State (as of March 2026)

### What works
- Grid visualization in `index3.html` — loads `weeks-index.json`, highlights weeks with artifacts, shows tooltips on hover
- `build-weeks-index.mjs` — scans a vault of `.md` artifact metadata files, generates `weeks-index.json`
- Vault is an Obsidian-style folder (`djjr-memoir/`) stored locally on Dan's Mac, with artifacts in `djjr-memoir/artifacts/`
- A small set of real artifacts exist (correspondence from ~1981), confirmed working with the indexer
- `ARTIFACTS.md` documents the artifact file format

### What doesn't exist yet
- Web server hosting for actual artifact files (PDFs, images)
- Viewer for artifact content (clicking a week should show the artifact)
- AI-assisted ingestion pipeline
- Authentication on hosted artifacts

### Hosting setup
- GitHub Pages is being used to serve the app (`index3.html` + `weeks-index.json`)
- `weeks-index.json` is committed to the repo (contains only metadata, no raw content)
- Raw artifact files (PDFs, images) are NOT in the repo — plan is to host on Dan's personal web server
- Privacy: repo is public; raw artifacts will be on a separate server with auth added later

---

## Architecture

```
[Physical archive]
       |
       v
[Scan / photograph]
       |
       v
[AI ingestion tool]  <-- to be built
  - reads the artifact
  - extracts date, people, type
  - generates title, summary, transcription
  - writes .md metadata file to vault
  - uploads binary to web server
       |
       v
[djjr-memoir/artifacts/*.md]  <-- vault on local Mac
       |
       v
[build-weeks-index.mjs]  <-- run locally after adding artifacts
       |
       v
[weeks-index.json]  <-- committed to repo, served via GitHub Pages
       |
       v
[index3.html]  <-- the viewer, loads weeks-index.json at runtime
                   fetches artifact content from web server by URL
```

---

## Artifact Metadata Schema

### Currently implemented fields
| Field | Notes |
|-------|-------|
| `title` | Display name; falls back to filename |
| `id` | Stable unique ID; falls back to file path |
| `date` | YYYY-MM-DD |
| `start` / `end` | Date range |
| `week` | Manual week override (0-based) |
| `type` | Free-form string, e.g. "correspondence" |
| `tags` | Array or comma-separated string |

### Planned fields (not yet in indexer/viewer)
| Field | Notes |
|-------|-------|
| `url` | URL to hosted artifact file |
| `media_type` | MIME type: image/jpeg, application/pdf, video/mp4, audio/mp3, etc. |
| `people` | Array of names mentioned or depicted |
| `location` | Where created or where event took place |
| `source` | Physical archive location (box, folder) |
| `summary` | Short AI-generated or hand-written description |
| `transcription` | Full text of letters/documents (for search) |

---

## Next Steps (rough priority order)

1. **Merge current PR** — PR #1 on GitHub, adds ARTIFACTS.md and bug fixes
2. **Build artifact viewer** — clicking a week in the grid should open a panel showing the artifact (title, summary, image/PDF embed)
3. **Add `url` and `media_type` to indexer** — pass through to `weeks-index.json` so the viewer can fetch content
4. **Set up web server** — host raw artifact files (PDFs, images); plan for auth later
5. **AI ingestion pipeline** — tool that takes a scanned file, uses Claude API to extract metadata, writes `.md` record, uploads binary
6. **Search / filtering** — filter grid by people, tags, type, date range
7. **Authentication** — protect raw artifacts on the web server

---

## Technical Notes

- Stack: vanilla HTML/CSS/JS (no framework), Node.js for build scripts
- Dependencies: `glob`, `gray-matter` (frontmatter parsing)
- The debug script (`build-weeks-index-debug.mjs`) uses `--root` instead of `--vault` — inconsistent, worth aligning eventually
- `weeks-index.json` schema is versioned as `memoir-weeks-index/v1`
- All dates stored/parsed at noon UTC to avoid timezone edge cases
- Week index is 0-based by default (week 0 = birth week)

---

## Key Files

| File | Purpose |
|------|---------|
| `index3.html` | Main viewer (most current version) |
| `build-weeks-index.mjs` | Indexer — generates weeks-index.json from vault |
| `build-weeks-index-debug.mjs` | Verbose version for diagnosing indexer issues |
| `weeks-index.json` | Generated artifact index (committed for GitHub Pages) |
| `ARTIFACTS.md` | Documentation for artifact file format |
| `PLANNING.md` | This file |
| `djjr-memoir/` | Local vault (not committed — lives on Dan's Mac) |
