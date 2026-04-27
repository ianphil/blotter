import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { findRendererPage, launchElectronApp, type LaunchedElectronApp } from './electronApp';

const cdpPort = Number(process.env.CHAMBER_E2E_MONICA_CDP_PORT ?? 9335);

test.describe('electron Monica existing mind smoke', () => {
  test.setTimeout(180_000);

  let app: LaunchedElectronApp | undefined;
  let mindPath = '';
  let userDataPath = '';
  const tempRoots: string[] = [];

  test.beforeAll(async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'chamber-monica-smoke-'));
    mindPath = path.join(root, 'monica');
    userDataPath = path.join(root, 'user-data');
    tempRoots.push(root);
    seedMonicaMind(mindPath);

    app = await launchElectronApp({
      cdpPort,
      env: {
        CHAMBER_E2E_USER_DATA: userDataPath,
      },
    });
  });

  test.afterAll(async () => {
    await app?.close();
    for (const root of tempRoots) {
      await removeTempRoot(root);
    }
  });

  test('opens an existing Monica mind without a live chat turn', async () => {
    const page = await findRendererPage(app?.browser, app?.logs ?? []);
    await page.waitForLoadState('domcontentloaded');

    const mind = await page.evaluate(async (pathToMind) => {
      const mind = await window.electronAPI.mind.add(pathToMind);
      await window.electronAPI.mind.setActive(mind.mindId);
      return mind;
    }, mindPath);

    await expect.poll(
      () => page.evaluate(() => window.electronAPI.mind.list().then((minds) => minds.map((item) => item.identity.name))),
    ).toEqual(['Monica']);

    await page.getByRole('button', { name: 'Monica' }).first().click();
    await expect(page.getByText('How can I help you today?')).toBeVisible();
    await expect(page.getByPlaceholder('Message your agent… (paste an image to attach)')).toBeEnabled();
    expect(mind.identity.name).toBe('Monica');

    await page.evaluate((mindId) => window.electronAPI.mind.remove(mindId), mind.mindId);
  });
});

function seedMonicaMind(mindPath: string): void {
  fs.mkdirSync(path.join(mindPath, '.github', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(mindPath, '.working-memory'), { recursive: true });
  fs.writeFileSync(
    path.join(mindPath, 'SOUL.md'),
    [
      '# Monica',
      '',
      'You are Monica, Chamber\'s meticulous, upbeat, systems-minded organizer.',
      '',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(mindPath, '.github', 'agents', 'monica.agent.md'),
    [
      '---',
      'name: Monica',
      'description: Chamber smoke-test organizer persona',
      '---',
      '',
      '# Monica Agent',
      '',
      'Help the user organize work with crisp checklists, clean priorities, and cheerful precision.',
      '',
    ].join('\n'),
  );
  for (const file of ['memory.md', 'rules.md', 'log.md']) {
    fs.writeFileSync(path.join(mindPath, '.working-memory', file), '');
  }
}

async function removeTempRoot(root: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM' || attempt === 9) {
        console.warn(`[monica-smoke] Failed to remove temp root ${root}:`, error);
        return;
      }
      await delay(250);
    }
  }
}
