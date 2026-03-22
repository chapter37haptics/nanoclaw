import { exec } from 'child_process'
import { writeFile, readFile } from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface ActionFile {
  id: string
  type: 'plugin_install' | 'mcp_add' | 'skill_write' | 'claude_md_append'
  payload: Record<string, unknown>
  tool_name: string
  requested_at: string
}

export interface ActionResult {
  status: 'success' | 'error'
  summary?: string
  error?: string
}

export async function parseActionFile(filePath: string): Promise<ActionFile> {
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as ActionFile
}

export async function writeResult(
  ipcInputDir: string,
  id: string,
  result: ActionResult,
): Promise<void> {
  const resultPath = path.join(ipcInputDir, `${id}-result.json`)
  await writeFile(resultPath, JSON.stringify(result, null, 2))
}

export async function executeAction(action: ActionFile): Promise<ActionResult> {
  const claudeDir = path.join(process.env.HOME!, '.claude')

  try {
    switch (action.type) {
      case 'plugin_install': {
        const { repo } = action.payload as { repo: string }
        const { stdout } = await execAsync(`claude plugin add ${repo}`, {
          env: { ...process.env },
        })
        return { status: 'success', summary: `Plugin ${repo} installed. ${stdout.trim()}` }
      }

      case 'mcp_add': {
        const { key, config } = action.payload as { key: string; config: Record<string, unknown> }
        const settingsPath = path.join(claudeDir, 'settings.json')
        const raw = await readFile(settingsPath, 'utf-8')
        const settings = JSON.parse(raw)
        settings.mcpServers = settings.mcpServers ?? {}
        settings.mcpServers[key] = config
        await writeFile(settingsPath, JSON.stringify(settings, null, 2))
        return { status: 'success', summary: `MCP server "${key}" added to settings.json.` }
      }

      case 'skill_write': {
        const { skill_name, skill_content } = action.payload as {
          skill_name: string
          skill_content: string
        }
        const skillPath = path.join(claudeDir, 'skills', `${skill_name}.md`)
        await writeFile(skillPath, skill_content)
        return { status: 'success', summary: `Skill "${skill_name}" written to ~/.claude/skills/.` }
      }

      case 'claude_md_append': {
        const { content } = action.payload as { content: string }
        const claudeMdPath = path.join(claudeDir, 'CLAUDE.md')
        const existing = await readFile(claudeMdPath, 'utf-8')
        await writeFile(claudeMdPath, `${existing}\n\n${content}`)
        return { status: 'success', summary: 'Appended to ~/.claude/CLAUDE.md.' }
      }

      default:
        return { status: 'error', error: `Unknown action type: ${(action as ActionFile).type}` }
    }
  } catch (err) {
    return { status: 'error', error: String(err) }
  }
}
