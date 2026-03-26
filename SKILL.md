---
name: paper-tracker
description: A skill that adds paper information to a Google Spreadsheet. Use when the user says things like "add paper", "track paper", "log this paper", "add to spreadsheet", "I read this paper", "record this paper", etc. It takes paper metadata such as title, authors, venue, and automatically adds a new row to a Google Spreadsheet via a Google Apps Script web app.
---

# Paper Tracker - Auto-add Papers to Spreadsheet

## Overview
When the user provides paper information, this skill calls a Google Apps Script web app API to add a new row to a Google Spreadsheet.
It can also look up an existing paper by row number or by title before updating it.

## Read Config File (Required)
**Before making any API call, you MUST read `config.json` in the same directory as this skill to get the configuration values.**

```json
{
  "api_endpoint": "Google Apps Script web app URL",
  "sheet_name": "Target sheet name",
  "summary_language": "Language code for summary (e.g., 'ko', 'en', 'ja')"
}
```

- `api_endpoint`: Used as the URL for all curl requests
- `sheet_name`: Used as the JSON `"sheet"` field value in all API requests
- `summary_language`: Language to write the summary in (e.g., `"ko"` for Korean, `"en"` for English, `"ja"` for Japanese). If not set, defaults to English.

If config.json does not exist, guide the user to set it up by referring to README.md.

## Spreadsheet Column Structure
| Column | Col | Description | JSON Key |
|--------|-----|-------------|----------|
| No. | A | Auto-numbered (handled server-side) | - |
| Year | B | Publication year | `year` |
| Author (1st + et al.) | C | First author + et al. | `author` |
| Paper Title | D | Full paper title (hyperlinked if URL provided) | `title`, `url` |
| Venue | E | Conference or journal | `venue` |
| Keywords | F | Comma-separated keywords | `keywords` |
| Summary | G | Core summary of the paper | `summary` |
| Prediction | H | Hypotheses or active predictions made before/during reading | `prediction` |
| Reflection | I | Post-reading critique, connected ideas, application plans | `reflection` |
| Created At | J | Timestamp when the paper row was first added (server-generated) | - |
| Updated At | K | Timestamp when the paper row was last modified (server-generated) | - |

## Usage

### 1. Collect Paper Information from User
When the user provides paper information in natural language, extract the following fields:
- Required: `title` (paper title)
- Recommended: `year`, `author`, `venue`, `url` (link to paper on arXiv, etc. — if provided, the title becomes a clickable hyperlink)
- Optional: `keywords`, `summary`, `prediction`, `reflection`

It's fine if the user doesn't provide all information. Just send whatever is available.

**Language for summary:** When auto-generating `summary`, write it in the language specified by `summary_language` in config.json (e.g., `"ko"` → Korean, `"en"` → English). If the user explicitly provides it, use as-is regardless of the config.

**Language for keywords:** Always write `keywords` in English, regardless of `summary_language` config. Keywords serve as universal search terms across languages, so they must remain in English. If the user explicitly provides keywords in another language, translate them to English.

**Summary style:** When auto-generating `summary`, optimize for spreadsheet readability.
- Keep each sentence short and direct.
- Split distinct points with newline characters so each point appears on its own line within the cell.
- Do not add bullet markers, numbering, or Markdown formatting at the start of lines.
- Prefer 2-4 short lines covering problem, approach, and main finding or contribution.
- Avoid long paragraphs.

### 1-1. Auto-fill Paper Metadata (arxiv MCP server preferred)

When the user provides only an arXiv URL/ID, DOI, or paper title, automatically supplement metadata using the following priority:

**Priority 1: Use arxiv MCP server**
- If an arXiv ID is available (e.g., `2301.12345`, `arxiv.org/abs/2301.12345`):
  - Use `mcp__arxiv__search_papers` tool to search for the paper and extract title, authors, year, category, etc.
  - Or if the arXiv ID is known, use `mcp__arxiv__read_paper` to read the full paper content and extract summary/keywords as well.
- If only the paper title is available:
  - Search using `mcp__arxiv__search_papers` with query format `ti:"paper title"` to fetch metadata.
- Information to extract: `title`, `author` (first author + et al.), `year`, `venue` (arXiv category or conference info), `keywords`, `summary`, `url` (for arXiv papers, convert `/abs/` to `/pdf/` so clicking goes directly to the PDF. e.g., `https://arxiv.org/pdf/2301.12345` — the title becomes a clickable hyperlink in the spreadsheet). Format auto-generated summaries using short lines separated by newline characters rather than a single paragraph.

**Priority 2 (fallback): Direct web page parsing**
- If the arxiv MCP server call fails or the paper is not on arXiv:
  - Use `WebFetch` tool to directly fetch the paper's web page (arXiv, Semantic Scholar, ACL Anthology, etc.) and parse metadata from HTML.
  - If a DOI is available, fetch `https://doi.org/DOI`.
  - If a regular URL is provided, fetch that URL directly.
- If that also fails, use `WebSearch` to search for the paper title and gather information.

### 2. API Call
The Google Apps Script web app returns responses only via GET after a 302 redirect, so calls are made in 2 steps.
In the examples below, replace `{API_ENDPOINT}` and `{SHEET_NAME}` with values read from config.json.

#### 2-1. Add New Paper
```bash
REDIRECT_URL=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST \
  "{API_ENDPOINT}" \
  -H "Content-Type: text/plain" \
  -d '{
    "sheet": "{SHEET_NAME}",
    "year": "year",
    "author": "Author et al.",
    "title": "Paper Title",
    "url": "https://arxiv.org/pdf/xxxx.xxxxx",
    "venue": "Conference/Journal",
    "keywords": "keyword1, keyword2",
    "summary": "Core summary",
    "prediction": "Prediction/hypothesis",
    "reflection": "Reflection"
  }') && curl -s "$REDIRECT_URL"
```
- Response: `{"status":"success","row":N}` — Added to row N. Remember this row number for later prediction/reflection updates.

#### 2-2. Update Prediction/Reflection (Modify Existing Row)
After adding a paper, if the user later provides prediction or reflection during conversation, update only that row:
```bash
REDIRECT_URL=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST \
  "{API_ENDPOINT}" \
  -H "Content-Type: text/plain" \
  -d '{
    "sheet": "{SHEET_NAME}",
    "action": "update",
    "row": N,
    "prediction": "Prediction content",
    "reflection": "Reflection content"
  }') && curl -s "$REDIRECT_URL"
```
- `row`: Row number to update (the row value returned when the paper was added)
- `prediction`, `reflection`: You can send both or just one (only the provided fields are updated)
- Response: `{"status":"success","updated_row":N}`

#### 2-3. Get Existing Paper by Row
Use this when the row number is known and you want to inspect the current values before updating:
```bash
curl -G "{API_ENDPOINT}" \
  --data-urlencode "action=get" \
  --data-urlencode "sheet={SHEET_NAME}" \
  --data-urlencode "row=N"
```

Or via POST:
```bash
REDIRECT_URL=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST \
  "{API_ENDPOINT}" \
  -H "Content-Type: text/plain" \
  -d '{
    "sheet": "{SHEET_NAME}",
    "action": "get",
    "row": N
  }') && curl -s "$REDIRECT_URL"
```
- Response: `{"status":"success","row":N,"paper":{...}}`
- `paper` includes all current fields: `no`, `year`, `author`, `title`, `url`, `venue`, `keywords`, `summary`, `prediction`, `reflection`, `created_at`, `updated_at`

#### 2-4. Find Existing Paper by Title
Use this when the row number is unknown and you want to search by paper title first:
```bash
curl -G "{API_ENDPOINT}" \
  --data-urlencode "action=find" \
  --data-urlencode "sheet={SHEET_NAME}" \
  --data-urlencode "title=Paper Title"
```

For partial title matching:
```bash
curl -G "{API_ENDPOINT}" \
  --data-urlencode "action=find" \
  --data-urlencode "sheet={SHEET_NAME}" \
  --data-urlencode "title=attention" \
  --data-urlencode "partial=true"
```

Or via POST:
```bash
REDIRECT_URL=$(curl -s -o /dev/null -w '%{redirect_url}' -X POST \
  "{API_ENDPOINT}" \
  -H "Content-Type: text/plain" \
  -d '{
    "sheet": "{SHEET_NAME}",
    "action": "find",
    "title": "Paper Title"
  }') && curl -s "$REDIRECT_URL"
```
- Default matching is case-insensitive exact match after trimming and normalizing spaces
- If `partial=true`, substring match is used instead
- Response: `{"status":"success","query":"Paper Title","match_count":M,"matches":[{"row":N,"paper":{...}}]}`
- Each `matches[i].paper` contains the full current row data

> **Note:** Use `text/plain` for Content-Type (`application/json` may cause CORS issues).

### 3. Verify Response
- New paper added successfully: `{"status":"success","row":N}`
- Prediction/reflection updated successfully: `{"status":"success","updated_row":N}`
- Row lookup succeeded: `{"status":"success","row":N,"paper":{...}}`
- Title search succeeded: `{"status":"success","query":"...","match_count":M,"matches":[...]}`
- Failure: Check error message and inform the user

## Example Conversations

**User:** "Add this paper - Attention Is All You Need, Vaswani et al., 2017, NeurIPS"

**Claude's actions:**
1. Read config.json -> get api_endpoint, sheet_name
2. Extract info: title, author, year, venue
3. Execute curl command
4. Verify result and respond "Added to the spreadsheet!"

**User:** "Add this paper arxiv.org/abs/2301.xxxxx"

**Claude's actions:**
1. Read config.json
2. Extract arXiv ID `2301.xxxxx`
3. Search paper metadata with `mcp__arxiv__search_papers`
4. (If failed) Parse arxiv.org/abs/2301.xxxxx page directly with `WebFetch`
5. Extract title, author, year, etc.
6. Execute curl command
7. Verify result and respond

**User:** (During discussion about a paper) "I think this paper will show that attention alone can replace RNNs"

**Claude's actions:**
1. Read config.json
2. Organize the user's prediction
3. Call update API with the paper's row number (prediction field)
4. Respond "Recorded your prediction in the spreadsheet!"

**User:** "Find the row for Attention Is All You Need"

**Claude's actions:**
1. Read config.json
2. Call `action=find` with the title
3. Check whether zero, one, or multiple rows matched
4. If one row matched, use that row for later updates

**User:** "What is in row 12?"

**Claude's actions:**
1. Read config.json
2. Call `action=get` with `row=12`
3. Return the current title, author, venue, summary, and any other relevant fields to the user

## Notes
- Empty fields are sent as empty strings ("")
- No. is auto-numbered by the server (Apps Script), so don't send it
- `Created At` and `Updated At` are generated by Apps Script, so don't send them in the request payload
- On new row creation, both `Created At` and `Updated At` are set to the current server time
- On row update, only `Updated At` is refreshed to the current server time
- `action=find` returns full row data for each match so the caller can update immediately without another read call
- Escape special characters (double quotes, etc.) in JSON values
- On network errors, inform the user and ask whether to retry
