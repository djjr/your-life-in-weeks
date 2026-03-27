# Artifact Files

Artifacts are Markdown metadata files that represent items in your personal archive — letters, photos, documents, audio, video, notes — placed on the life-in-weeks grid by date.

## The Two-File Rule

Every artifact has two representations:

1. **Metadata file** (`djjr-memoir/artifacts/Foo.md`) — a YAML frontmatter record describing the artifact. This is what gets committed to the repo and indexed. The body of the file may contain personal notes but is not the artifact itself.
2. **Artifact file** — the actual document, image, PDF, audio, etc. Hosted separately (web server or local file server). Referenced via `url:` in the metadata file.

**Exception:** Use `transcription:` in the frontmatter to inline short text content (letter transcriptions, brief notes). This avoids needing a separate hosted file for text-only items.

## Directory Structure

Metadata files can live anywhere inside your vault directory. The indexer scans all `.md` files recursively:

```
vault/
├── artifacts/
│   ├── 1981 Dan Chambliss to Dan Ryan.md
│   ├── 1981 Agnes Seber to Dan Ryan.md
│   └── letters/
│       └── 1985 some letter.md
├── photos/
│   └── 1990 vacation.md
└── notes.md
```

The paths `.obsidian/` and `node_modules/` are excluded automatically.

**Note:** Do not store artifact files (the binaries or text documents) inside the vault directory. The indexer will attempt to parse any `.md` file with frontmatter it finds as a metadata record.

---

## File Format

```markdown
---
title: "1981 Agnes Seber to Dan Ryan"
id: "000001"
date_start: "1981-05-15"
type: correspondence
tags: [letters, family]
url: "artifacts/1981 Agnes Seber to Dan Ryan.pdf"
media_type: application/pdf
people: [Agnes Seber, Dan Ryan]
location: "Schenectady, NY"
source: "Box 3, Folder 12"
summary: "Agnes writes about summer plans and mentions the Chambliss visit."
transcription: |
  Dear Dan,
  I hope this letter finds you well...
---

Personal notes about the artifact go here (optional, not displayed in viewer).
```

---

## Frontmatter Fields

### `title` (recommended)

Display name shown in the artifact list and viewer.

```yaml
title: "Unsent letter from Dan Ryan to Dan Chambliss"
```

Falls back to filename (without `.md`) if omitted.

---

### `id` (optional)

Stable unique identifier. Used internally in the index.

```yaml
id: "000003"
```

Falls back to the relative file path if omitted.

---

### `date_start` and `date_end` (recommended)

The date(s) the artifact is associated with. Also accepted as `date`, `start`, `end`.

```yaml
date_start: "1981-05-15"
date_end: "1981-05-15"
```

For artifacts spanning a range (a trip, a period, a project):

```yaml
date_start: "1981-01-01"
date_end: "1981-06-30"
```

The artifact will appear highlighted across all weeks in the range.

**Always quote dates in YAML** (`"1981-05-15"` not `1981-05-15`) to prevent js-yaml from auto-parsing them as JavaScript Date objects.

---

### `week` (optional)

Manually assign to a specific week index, overriding date-based calculation. Useful for undated items.

```yaml
week: 1140
```

Week index is 0-based (week 0 = birth week).

---

### `type` (optional)

Free-form string categorizing the artifact.

```yaml
type: correspondence
```

Common values: `correspondence`, `photo`, `document`, `audio`, `video`, `note`, `certificate`

---

### `tags` (optional)

One or more tags for categorization.

```yaml
tags: [letters, family, 1981]
```

---

### `url` (recommended)

Path or URL to the actual artifact file.

```yaml
# Relative to vault root — resolved against --base_url at runtime
url: "artifacts/1981 Agnes Seber to Dan Ryan.pdf"

# Absolute URL — used as-is, works anywhere
url: "https://yourserver.com/memoir/artifacts/1981-agnes-seber.pdf"

# External resource
url: "https://www.newspapers.com/article/12345"
```

Relative paths are resolved against the `--base_url` passed to the indexer. This lets you use the same metadata files locally (`http://localhost:8000/djjr-memoir`) and in production (your web server) by changing only the indexer flag.

---

### `media_type` (recommended when `url` is set)

MIME type telling the viewer how to render the artifact.

| Value | Renders as |
|-------|-----------|
| `image/jpeg`, `image/png`, `image/gif`, etc. | Inline image |
| `application/pdf` | Embedded PDF viewer |
| `video/mp4`, `video/mov`, etc. | Video player |
| `audio/mp3`, `audio/wav`, etc. | Audio player |
| `text/markdown`, `text/plain` | Fetched and rendered as markdown |
| *(blank or unrecognized)* | "File not available offline" |

```yaml
media_type: application/pdf
```

---

### `people` (optional)

Names of people mentioned or depicted.

```yaml
people: [Agnes Seber, Dan Ryan]
```

---

### `location` (optional)

Where the artifact was created or where the event took place.

```yaml
location: "Schenectady, NY"
```

---

### `source` (optional)

Physical location of the original item in your archive.

```yaml
source: "Box 3, Folder 12"
```

---

### `summary` (optional)

Short human- or AI-written description. Displayed prominently in the viewer metadata panel.

```yaml
summary: "Agnes writes about summer plans and mentions the Chambliss visit."
```

---

### `transcription` (optional)

Full text of a letter or document. Rendered inline in the viewer — use this instead of a separate hosted file for short text content.

```yaml
transcription: |
  Dear Dan,
  I hope this letter finds you well...
```

---

## Date Formats

All date fields must use `YYYY-MM-DD` format, quoted:

```yaml
date_start: "1981-01-24"   # correct
date_start: 1981-01-24     # works but may cause issues — always quote
date_start: "Jan 24 1981"  # will not be parsed
date_start: "1/24/81"      # will not be parsed
```

Dates are interpreted at noon UTC to avoid off-by-one errors from timezone differences.

---

## Building the Index

After adding or editing artifact files, run the indexer:

```bash
node build-weeks-index.mjs \
  --vault "~/Documents/PROJECTS/your-life-in-weeks/djjr-memoir" \
  --birthdate "1959-07-07" \
  --base_url "http://localhost:8000/djjr-memoir" \
  --out "./weeks-index.json"
```

Then commit `weeks-index.json` to deploy the changes to GitHub Pages.

### Indexer flags

| Flag | Required | Description |
|------|----------|-------------|
| `--vault` | Yes | Path to vault directory (`~` is supported) |
| `--birthdate` | Yes | Your birth date in `YYYY-MM-DD` format |
| `--base_url` | No | Base URL for resolving relative `url:` values (e.g. `http://localhost:8000/djjr-memoir`) |
| `--out` | No | Output path (default: `./weeks-index.json`) |
| `--week_base` | No | `0` for 0-indexed weeks (default), `1` for 1-indexed |

### Index output

`weeks-index.json` contains:
- Full artifact metadata for all records
- `byWeek` map — week index → list of artifact IDs (handles date ranges)
- `byTag` map — tag name → list of artifact IDs
- `birthdate` and `baseUrl` (auto-populates the viewer's birthdate field)
