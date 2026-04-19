# Scanner Extension

Continuous M365 email and Teams monitoring via WorkIQ MCP.

## What it does

Provides tools for the Copilot agent to:
- Scan M365 email and Teams for actionable signals
- Store and deduplicate signals locally
- Track signal status (new → reviewed → acted/dismissed)
- Report scanner statistics

## Tools

| Tool | Description |
|------|-------------|
| `scanner_get_signals` | Retrieve stored signals, filter by status |
| `scanner_save_scan_results` | Save new scan results with deduplication |
| `scanner_update_signal` | Update signal status |
| `scanner_get_stats` | Get signal counts by status and priority |

## Usage with cron

Pair with the cron extension to run scans on a schedule:
```
Create a cron job that runs every 5 minutes: scan my email and Teams for actionable items using WorkIQ, then save results using scanner_save_scan_results.
```

## Data

Signals are stored in `data/signals.json` as a JSON array.
Each signal has: id, source, title, summary, sender, priority, context, suggestedAction, status, receivedAt, scannedAt.
