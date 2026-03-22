# URL Assessor Skill

Activated when a WhatsApp message contains an `instagram.com` URL.

## Steps

### 1. Extract content

Run the extraction helper:
```bash
python /skills/url-assessor/extract.py "<instagram_url>"
```

Parse the JSON output. If `error: private_or_unavailable`, reply:
> "This post is private or unavailable. Can you share the tool name directly?"
Then stop.

### 2. Identify the tool

From `caption` + `transcript`, identify the tool or feature being shown.
Look for: tool name, GitHub URL, website, install command.

If you cannot identify a specific tool, reply:
> "I couldn't identify the tool from this video. Can you tell me the name?"
Then stop.

### 3. Research the tool

Fetch the tool's GitHub README or official docs using WebFetch.
Focus on: what it does, how to install it, what category it is
(plugin / MCP server / skill / CLAUDE.md change).

### 4. Read current setup

Read these files from the mounted ~/.claude (read-only):
- `~/.claude/settings.json` — installed plugins and MCP servers
- `~/.claude/CLAUDE.md` — workflow rules and preferences
- `~/.claude/skills/` — list installed custom skills

### 5. Send Exchange 1 — assessment

Reply in this format:
```
Posted by @<poster> on <date>.
This is [Tool] — a [plugin / MCP server / skill / workflow rule].
It does [one-sentence description].

Impact on your setup:
- [Compatible / Conflicts with X / Adds new capability Y]
```

Track exchange count = 1.

### 6. Handle optional follow-up (Exchange 2)

If the user asks a follow-up question, answer it concisely.
Exchange count = 2. Do not answer more than one follow-up.

### 7. Send final message (Exchange 3)

Always send this as the final message, regardless of whether exchange 2 happened:
> "Should I go ahead and install this?"

### 8. Handle install response

Interpret the user's reply as intent:
- **Yes intent** ("yes", "yeah", "sure", "do it", "go ahead", "go for it"): proceed to Step 9
- **No intent** ("no", "skip", "not now", "nah"): reply "Got it, skipping." and stop
- **Ambiguous**: reply "Just to confirm — should I go ahead and install this?" and wait

### 9. Write IPC action file

Write a JSON file to `~/nanoclaw/ipc/actions/<uuid>.json`:

```json
{
  "id": "<uuid>",
  "type": "<plugin_install | mcp_add | skill_write | claude_md_append>",
  "payload": {
    "repo": "<github-repo>",
    "key": "<mcp-server-name>",
    "config": {},
    "skill_name": "<name>",
    "skill_content": "<markdown>",
    "content": "<text to append>"
  },
  "tool_name": "<Tool name>",
  "requested_at": "<ISO timestamp>"
}
```

### 10. Wait for result

Poll `~/nanoclaw/ipc/results/<same-uuid>.json` every 2 seconds, up to 60 seconds.

On success result (`"status": "success"`):
> "Done. Here's what changed: [result.summary]"

On failure result (`"status": "error"`):
> "Installation partially failed: [result.error]. You can retry by saying 'yes' again or fix it manually."

On timeout:
> "Installation timed out. Check ~/nanoclaw/ipc/ for details."
