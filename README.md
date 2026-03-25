# Paper Tracker

A [Claude Code skill](https://code.claude.com/docs/en/skills) that automatically logs papers to a Google Spreadsheet.

Say things like "add this paper" or paste an arXiv URL, and Claude fills in the metadata and adds it to your spreadsheet.

## Features

- Natural language input — just tell Claude about a paper
- Auto-fills metadata from arXiv (title, authors, year, venue, keywords, summary)
- Tracks predictions (before reading) and reflections (after reading)
- Paper titles link directly to PDFs

## Spreadsheet Columns

| No. | Year | Author | Paper Title | Venue | Keywords | Summary | Prediction | Reflection |
|-----|------|-----------------------|-------------|-------|----------|---------|------------|------------|

## Setup

### 1. Copy the Reference Spreadsheet

The easiest way to get started. The reference spreadsheet already has the Apps Script code (`scripts/Code.gs`) pre-configured — you only need to deploy it.

1. Open the [reference spreadsheet](https://docs.google.com/spreadsheets/d/146kfIHreEfudDg5VcSU5lqWHV9rypc3d6NrJmYLKz2k/edit?usp=sharing)
2. Click **File > Make a copy**
3. Rename the sheet tab if desired (e.g., "My Papers")

### 2. Deploy the Apps Script

The copied spreadsheet already contains the Apps Script code. You just need to deploy it as a web app.

1. Open your copied spreadsheet
2. Click **Extensions > Apps Script**
   - You should see the `doPost` function already there. If not, copy the code from [`scripts/Code.gs`](scripts/Code.gs)
3. Click **Deploy > New deployment**
4. Click the gear icon (Select type) > **Web app**
5. Fill in the deployment settings:
   - **Description**: anything (e.g., "paper-tracker")
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**

6. Click **Deploy**
7. On first deploy, Google will ask you to authorize. Click **Authorize access**, then:
   - If you see **"Google hasn't verified this app"**, click **Advanced** > **Go to (project name) (unsafe)** > **Allow**
   - This warning is normal for all personal Apps Script projects. It simply means the app hasn't gone through Google's OAuth verification process — it does NOT mean the code is dangerous. You can verify the code yourself in the Apps Script editor (it matches [`scripts/Code.gs`](scripts/Code.gs) exactly). The warning shows your own email because you are both the developer and the user.
8. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/.../exec`)

> **Tip:** If you ever update the Apps Script code, you must create a **new deployment** (Deploy > New deployment) for changes to take effect. Editing the code alone doesn't update the live web app.

### 3. Configure the Skill

Create `config.json` in the skill directory (`~/.claude/skills/paper-tracker/`):

```json
{
  "api_endpoint": "https://script.google.com/macros/s/PASTE_YOUR_WEB_APP_URL/exec",
  "sheet_name": "Sheet1",
  "summary_language": "ko"
}
```

- `api_endpoint`: The Web app URL you copied in step 2
- `sheet_name`: The exact name of your sheet tab (check the tab at the bottom of your spreadsheet)
- `summary_language`: Language for auto-generated summaries and keywords (e.g., `"ko"` for Korean, `"en"` for English, `"ja"` for Japanese). Defaults to English if not set.

### 4. (Optional) arxiv MCP Server

For automatic metadata lookup from arXiv URLs/IDs, install the [arxiv MCP server](https://github.com/blazickjp/arxiv-mcp-server). Without it, you'll need to provide paper details manually.

## Usage Examples

```
> Add this paper - Attention Is All You Need, Vaswani et al., 2017, NeurIPS
> Add paper arxiv.org/abs/2301.12345
> I think this paper will show that attention alone can replace RNNs  (updates prediction)
```

## Installation

Copy this directory to your Claude Code skills folder:

```bash
cp -r paper-tracker ~/.claude/skills/
```

Or clone and symlink:

```bash
git clone https://github.com/YOUR_USERNAME/paper-tracker.git
ln -s $(pwd)/paper-tracker ~/.claude/skills/paper-tracker
```

## File Structure

```
paper-tracker/
├── SKILL.md          # Skill instructions (used by Claude)
├── config.json       # API endpoint & sheet config (create your own, not committed)
├── scripts/
│   └── Code.gs       # Google Apps Script source code
└── README.md         # This file
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=hanbyul-kim/paper-tracker&type=Date)](https://star-history.com/#hanbyul-kim/paper-tracker&Date)
