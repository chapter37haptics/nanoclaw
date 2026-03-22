import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, readFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'nanoclaw-ipc-handler-test');

describe('ipc-action-handler', () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true });
  });
  afterEach(async () => {
    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('parseActionFile reads and returns action JSON', async () => {
    const { parseActionFile } = await import('./ipc-action-handler.js');
    const action = {
      id: 'test-1',
      type: 'plugin_install',
      payload: { repo: 'user/plugin' },
      tool_name: 'Test Plugin',
      requested_at: new Date().toISOString(),
    };
    const filePath = path.join(TEST_DIR, 'test-1.json');
    await writeFile(filePath, JSON.stringify(action));
    const parsed = await parseActionFile(filePath);
    expect(parsed.id).toBe('test-1');
    expect(parsed.type).toBe('plugin_install');
  });

  it('writeResult writes JSON to the results path', async () => {
    const { writeResult } = await import('./ipc-action-handler.js');
    await writeResult(TEST_DIR, 'test-2', {
      status: 'success',
      summary: 'Done.',
    });
    const resultPath = path.join(TEST_DIR, 'test-2-result.json');
    expect(existsSync(resultPath)).toBe(true);
    const content = JSON.parse(await readFile(resultPath, 'utf-8'));
    expect(content.status).toBe('success');
    expect(content.summary).toBe('Done.');
  });

  it('writeResult writes error result', async () => {
    const { writeResult } = await import('./ipc-action-handler.js');
    await writeResult(TEST_DIR, 'test-3', {
      status: 'error',
      error: 'Failed.',
    });
    const content = JSON.parse(
      await readFile(path.join(TEST_DIR, 'test-3-result.json'), 'utf-8'),
    );
    expect(content.status).toBe('error');
    expect(content.error).toBe('Failed.');
  });

  it('executeAction mcp_add adds entry to settings.json', async () => {
    const { executeAction } = await import('./ipc-action-handler.js');
    const origHome = process.env.HOME;
    process.env.HOME = TEST_DIR;
    try {
      await mkdir(path.join(TEST_DIR, '.claude'), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, '.claude', 'settings.json'),
        JSON.stringify({ mcpServers: {} }),
      );

      const result = await executeAction({
        id: 'act-1',
        type: 'mcp_add',
        payload: {
          key: 'test-server',
          config: { command: 'npx', args: ['test'] },
        },
        tool_name: 'Test MCP',
        requested_at: new Date().toISOString(),
      });
      expect(result.status).toBe('success');
      const updated = JSON.parse(
        await readFile(
          path.join(TEST_DIR, '.claude', 'settings.json'),
          'utf-8',
        ),
      );
      expect(updated.mcpServers['test-server']).toEqual({
        command: 'npx',
        args: ['test'],
      });
    } finally {
      process.env.HOME = origHome;
    }
  });

  it('executeAction skill_write creates skill file', async () => {
    const { executeAction } = await import('./ipc-action-handler.js');
    const origHome = process.env.HOME;
    process.env.HOME = TEST_DIR;
    try {
      await mkdir(path.join(TEST_DIR, '.claude', 'skills'), {
        recursive: true,
      });
      const result = await executeAction({
        id: 'act-2',
        type: 'skill_write',
        payload: {
          skill_name: 'my-skill',
          skill_content: '# My Skill\nDoes stuff.',
        },
        tool_name: 'My Skill',
        requested_at: new Date().toISOString(),
      });
      expect(result.status).toBe('success');
      const content = await readFile(
        path.join(TEST_DIR, '.claude', 'skills', 'my-skill.md'),
        'utf-8',
      );
      expect(content).toContain('# My Skill');
    } finally {
      process.env.HOME = origHome;
    }
  });

  it('executeAction claude_md_append appends to CLAUDE.md', async () => {
    const { executeAction } = await import('./ipc-action-handler.js');
    const origHome = process.env.HOME;
    process.env.HOME = TEST_DIR;
    try {
      await mkdir(path.join(TEST_DIR, '.claude'), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, '.claude', 'CLAUDE.md'),
        '# Existing\n',
      );
      const result = await executeAction({
        id: 'act-3',
        type: 'claude_md_append',
        payload: { content: '## New Section\nNew content.' },
        tool_name: 'Some Rule',
        requested_at: new Date().toISOString(),
      });
      expect(result.status).toBe('success');
      const content = await readFile(
        path.join(TEST_DIR, '.claude', 'CLAUDE.md'),
        'utf-8',
      );
      expect(content).toContain('## New Section');
      expect(content).toContain('# Existing');
    } finally {
      process.env.HOME = origHome;
    }
  });

  it('executeAction returns error result on unknown type', async () => {
    const { executeAction } = await import('./ipc-action-handler.js');
    const result = await executeAction({
      id: 'act-4',
      type: 'unknown_type' as any,
      payload: {},
      tool_name: 'Unknown',
      requested_at: new Date().toISOString(),
    });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Unknown action type');
  });
});
