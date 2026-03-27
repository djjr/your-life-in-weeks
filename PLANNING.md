# Project Planning Notes

## What This Is

A personal biographical archive visualized as a "life in weeks" grid — 100 years × 52 weeks, each cell representing one week of life. Weeks containing artifacts are highlighted. The concept is inspired by Dr. Peter Attia's life-in-weeks visualization.

The owner (Dan Ryan, born 1959-07-07) is building a tool to process and display his personal archive: letters, photos, documents, and eventually audio/video. The goal is to eventually have something from every week of his life represented.

---

## Current State (as of March 2026)

### What works
- Grid visualization in `index3.html` (v0.4) — loads `weeks-index.json`, highlights weeks with artifacts
- **Hover** → lightweight tooltip showing week number, date range, artifact count
- **Click** → right-side panel slides in with artifact list for that week
- **Click artifact** → panel transitions to viewer; back button returns to list
- Viewer renders PDFs (iframe), images, video, audio, and text/markdown by `media_type`
- Metadata panel (collapsible) shows summary, transcription, and key-value fields; opens automatically when no media file is available
- `build-weeks-index.mjs` — scans vault `.md` metadata files, generates `weeks-index.json`
- Indexer supports `--base_url` for local dev; relative `url:` values in artifact files are resolved against `baseUrl` at runtime
- Full metadata schema implemented: `url`, `media_type`, `people`, `location`, `source`, `summary`, `transcription`
- Vault is an Obsidian-style folder (`djjr-memoir/`) with artifact metadata in `djjr-memoir/artifacts/`
- 12 real artifact records in the vault, spanning 1959–2009
- Artifact `.md` metadata files committed to repo; binary files (PDFs, images) are NOT

### What doesn't exist yet
- Web server hosting for binary artifact files (PDFs, images, audio, video)
- AI-assisted ingestion pipeline
- Text artifact conversion pipeline (docx, wikidot → `.md`)
- Search / filtering by people, tags, type, date range
- Authentication on hosted artifacts

### Hosting setup
- GitHub Pages serves the app (`index3.html` + `weeks-index.json` + artifact `.md` files)
- `weeks-index.json` is committed (metadata only, no raw binary content)
- Binary artifact files are NOT in the repo — plan is to host on a personal web server
- For local dev: run `python3 -m http.server 8000` and pass `--base_url http://localhost:8000/djjr-memoir` to the indexer
- Privacy: repo is public; raw binaries will be on a separate server with auth added later

---

## Artifact Model

**The two-file rule:** Every artifact has exactly two representations:

1. **Metadata file** (`djjr-memoir/artifacts/Foo.md`) — always a metadata record. YAML frontmatter only; body may contain personal notes about the artifact but is not the artifact itself.
2. **Artifact file** — the actual document, image, PDF, audio, etc. Hosted separately (web server or local). Referenced via `url:` in the metadata file.

**Exception for short text content:** Use `transcription:` in the metadata frontmatter to inline text content (letter transcriptions, short notes). This keeps the metadata file as the single source of truth without needing a separate hosted file.

**Text artifact pipeline (planned):** For longer text documents (essays, diaries, converted docx/wikidot files), convert to `.md`, host the `.md` file, and reference it via `url:` + `media_type: text/markdown`. The viewer fetches and renders it.

**Known quirk:** If a hosted artifact `.md` file contains YAML frontmatter, the indexer will pick it up as a metadata record if it lives inside the vault directory. Avoid storing artifact files inside the vault, or ensure they have no frontmatter.

---

## Architecture

```
[Physical archive / digital source]
       |
       v
[Scan / photograph / export]
       |
       v
[AI ingestion tool]  <-- to be built
  - reads the artifact (PDF, image, docx, wikidot, etc.)
  - extracts date, people, type, location
  - generates title, summary, transcription excerpt
  - writes .md metadata file to vault
  - uploads binary/converted file to web server
  - sets url: and media_type: in metadata
       |
       v
[djjr-memoir/artifacts/*.md]  <-- vault on local Mac, committed to repo
       |
       v
[build-weeks-index.mjs]  <-- run locally after adding/editing artifacts
  node build-weeks-index.mjs \
    --vault ~/Documents/PROJECTS/your-life-in-weeks/djjr-memoir \
    --birthdate 1959-07-07 \
    --base_url http://localhost:8000/djjr-memoir \
    --out ./weeks-index.json
       |
       v
[weeks-index.json]  <-- committed to repo, served via GitHub Pages
       |
       v
[index3.html]  <-- viewer, loads weeks-index.json at runtime
                   fetches binary artifact content from web server by url:
                   fetches text artifact content from url: (relative or absolute)
```

---

## Artifact Metadata Schema

### Implemented fields
| Field | Notes |
|-------|-------|
| `title` | Display name; falls back to filename |
| `id` | Stable unique ID; falls back to file path |
| `date` | YYYY-MM-DD (quote in YAML to avoid auto-parse as Date object) |
| `date_start` / `date_end` | Aliases for `start` / `end` |
| `start` / `end` | Date range (YYYY-MM-DD) |
| `week` | Manual week override (0-based) |
| `type` | Free-form string, e.g. "correspondence" |
| `tags` | Array or comma-separated string |
| `url` | URL to artifact file; relative paths resolved against `baseUrl` |
| `media_type` | MIME type — controls how viewer renders the artifact |
| `people` | Array of names mentioned or depicted |
| `location` | Where created or where event took place |
| `source` | Physical archive location (box, folder) |
| `summary` | Short human- or AI-written description |
| `transcription` | Full text of letters/documents; rendered inline in viewer |

### Supported media types
| `media_type` | Viewer behavior |
|---|---|
| `image/jpeg`, `image/png`, etc. | `<img>` embed |
| `application/pdf` | `<iframe>` embed |
| `video/mp4`, etc. | `<video>` player |
| `audio/mp3`, `audio/wav`, etc. | `<audio>` player |
| `text/plain`, `text/markdown` | Fetch and render as markdown |
| *(blank or unrecognized)* | "File not available offline" |

---

## Next Steps (rough priority order)

1. **Set up web server** — host binary artifact files (PDFs, images); plan for auth later
2. **Text artifact pipeline** — convert docx/wikidot to `.md`; test with a few handcrafted examples using `text/markdown`
3. **AI ingestion pipeline** — Claude API tool that reads a scanned file, extracts metadata, writes `.md` record, uploads binary
4. **Search / filtering** — filter grid by people, tags, type, date range
5. **Authentication** — protect raw artifacts on the web server

---

## Technical Notes

- Stack: vanilla HTML/CSS/JS (no framework), Node.js for build scripts
- Dependencies: `glob`, `gray-matter` (frontmatter parsing)
- `weeks-index.json` schema: `memoir-weeks-index/v1`
- All dates stored/parsed at noon UTC to avoid timezone edge cases
- Week index is 0-based (week 0 = birth week)
- Unquoted YAML dates (e.g. `date_start: 1981-01-01`) are auto-parsed by js-yaml as JS Date objects; indexer handles both forms

---

## Key Files

| File | Purpose |
|------|---------|
| `index3.html` | Main viewer (v0.4) |
| `build-weeks-index.mjs` | Indexer — generates `weeks-index.json` from vault |
| `build-weeks-index-debug.mjs` | Verbose version for diagnosing indexer issues |
| `weeks-index.json` | Generated artifact index (committed for GitHub Pages) |
| `ARTIFACTS.md` | Artifact file format reference |
| `PLANNING.md` | This file |
| `djjr-memoir/` | Local Obsidian vault (committed — metadata `.md` files only, no binaries) |
