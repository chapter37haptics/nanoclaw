import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdir, readFile, rm } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

const TEST_DIR = path.join(os.tmpdir(), 'nanoclaw-ipc-handler-test')

describe('ipc-action-handler', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })
  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it('parseActionFile reads and returns action JSON', async () => {
    const { parseActionFile } = await import('./ipc-action-handler.js')
    const action = {
      id: 'test-1',
      type: 'plugin_install',
      payload: { repo: 'user/plugin' },
      tool_name: 'Test Plugin',
      requested_at: new Date().toISOString(),
    }
    const filePath = path.join(TEST_DIR, 'test-1.json')
    await writeFile(filePath, JSON.stringify(action))
    const parsed = await parseActionFile(filePath)
    expect(parsed.id).toBe('test-1')
    expect(parsed.type).toBe('plugin_install')
  })

  it('writeResult writes JSON to the results path', async () => {
    const { writeResult } = await import('./ipc-action-handler.js')
    await writeResult(TEST_DIR, 'test-2', { status: 'success', summary: 'Done.' })
    const resultPath = path.join(TEST_DIR, 'test-2-result.json')
    expect(existsSync(resultPath)).toBe(true)
    const content = JSON.parse(await readFile(resultPath, 'utf-8'))
    expect(content.status).toBe('success')
    expect(content.summary).toBe('Done.')
  })

  it('writeResult writes error result', async () => {
    const { writeResult } = await import('./ipc-action-handler.js')
    await writeResult(TEST_DIR, 'test-3', { status: 'error', error: 'Failed.' })
    const content = JSON.parse(await readFile(path.join(TEST_DIR, 'test-3-result.json'), 'utf-8'))
    expect(content.status).toBe('error')
    expect(content.error).toBe('Failed.')
  })
})
