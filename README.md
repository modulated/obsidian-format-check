# Format Check

An Obsidian plugin that marks files in the file browser when they need formatting, based on frontmatter timestamps.

## How it works

The plugin reads two fields from each note's frontmatter:

- `formatted` — the timestamp when the note was last formatted
- `modified` — the timestamp when the note was last modified

A coloured dot appears next to a file in the file browser tree if:

- the `formatted` field is absent, **or**
- the `formatted` timestamp is earlier than the `modified` timestamp (i.e. the note has changed since it was last formatted)

## Settings

| Setting | Description |
|---|---|
| **Dot color** | Color of the indicator dot (default: amber) |
| **Included folders** | Only check files in these folders, one per line. Leave empty to check all Markdown files. |
| **Formatted field** | Frontmatter field name for the formatted timestamp (default: `formatted`) |
| **Modified field** | Frontmatter field name for the last modified timestamp (default: `modified`) |

## Frontmatter format

```yaml
---
modified: 2026-01-15 09:30
formatted: 2026-01-14 18:00
---
```

Both fields should use `YYYY-MM-DD HH:mm` format. The field names can be changed in settings to match your vault's conventions.

## Installation

Copy `main.js`, `styles.css`, and `manifest.json` to `VaultFolder/.obsidian/plugins/obsidian-format-check/`, then enable the plugin in Obsidian settings.
