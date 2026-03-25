# Artifact Files

Artifacts are Markdown files that represent memories, documents, letters, photos, or any other items you want to place on your life-in-weeks grid. Each artifact is associated with a specific week (or range of weeks) by date.

## Directory Structure

Artifact files can live anywhere inside your vault directory. The indexer scans all `.md` files recursively, so you can organize them however you like:

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

## File Format

Each artifact file uses YAML frontmatter followed by optional Markdown body content.

```markdown
---
title: "Letter from Dan Chambliss to Dan Ryan"
id: "000002"
date: "1981-01-24"
type: "correspondence"
tags: [letters, 1981]
---

Body content of the artifact goes here. This can be the full text of a
letter, notes about a photo, or any other content.
```

## Frontmatter Fields

### `title` (recommended)

The display title shown in the grid tooltip and artifact list.

```yaml
title: "Unsent letter from Dan Ryan to Dan Chambliss"
```

If omitted, the filename (without `.md`) is used as the title.

---

### `id` (optional)

A stable, unique identifier for this artifact. Used in the index to reference the artifact from week and tag lookups.

```yaml
id: "000003"
```

If omitted, the relative file path is used as the ID.

---

### `date` (optional)

The date the artifact is associated with, in `YYYY-MM-DD` format. The indexer uses this to calculate which week of your life the artifact falls in.

```yaml
date: "1981-03-06"
```

---

### `start` and `end` (optional)

Use these instead of `date` when an artifact spans a range of dates (e.g., a trip, a period in school, a project).

```yaml
start: "1981-01-01"
end: "1981-06-30"
```

The artifact will appear highlighted across all weeks in the range.

---

### `week` (optional)

Manually assign an artifact to a specific week index, overriding date-based calculation. Useful for undated items or when you want explicit placement.

```yaml
week: 1140
```

Week index is 0-based by default (the week you were born = week 0). Pass `--week_base 1` to the indexer to use 1-based indexing.

---

### `type` (optional)

A free-form string categorizing the artifact.

```yaml
type: "correspondence"
```

---

### `tags` (optional)

One or more tags for categorization. Can be a YAML array or a comma-separated string.

```yaml
# Array form
tags: [letters, family, 1981]

# String form
tags: "letters, family, 1981"
```

---

## Date Formats

All date fields (`date`, `start`, `end`) must use `YYYY-MM-DD` format:

```yaml
date: "1981-01-24"   # correct
date: "Jan 24 1981"  # will not be parsed
date: "1/24/81"      # will not be parsed
```

Dates are interpreted at noon UTC to avoid off-by-one errors from timezone differences.

---

## Building the Index

Once your artifact files are in place, run the indexer to generate `weeks-index.json`:

```bash
node build-weeks-index.mjs \
  --vault "/Users/dan/Documents/PROJECTS/your-life-in-weeks/djjr-memoir" \
  --birthdate "1947-01-01" \
  --out "./weeks-index.json"
```

> **Note:** The `--vault` path must be a full absolute path. Tilde shorthand (`~/Documents/...`) is not expanded and will result in zero artifacts found.

### Options

| Flag | Required | Description |
|------|----------|-------------|
| `--vault` | Yes | Full absolute path to the directory containing your artifact files (no `~`) |
| `--birthdate` | Yes | Your birth date in `YYYY-MM-DD` format |
| `--out` | No | Output path for the index file (default: `./weeks-index.json`) |
| `--week_base` | No | `0` for 0-indexed weeks (default), `1` for 1-indexed |

### Output

The indexer writes a `weeks-index.json` file that the HTML visualization loads. It contains:

- All artifact metadata (title, id, path, type, tags, dates, week indices)
- A `byWeek` map — week index → list of artifact IDs
- A `byTag` map — tag name → list of artifact IDs

---

## Example Artifact

```markdown
---
title: "1981 Agnes Seber to Dan Ryan"
id: "000001"
date: "1981-05-15"
type: "correspondence"
tags: [letters, family]
---

Dear Dan,

I hope this letter finds you well...
```

This artifact would appear highlighted on the week of May 15, 1981 in the grid visualization.
