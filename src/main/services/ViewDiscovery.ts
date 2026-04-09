// Lens view discovery — scans mind for view.json manifests, reads view data, handles prompt refresh.

import * as fs from 'fs';
import * as path from 'path';
import { BrowserWindow } from 'electron';
import type { LensViewManifest } from '../../shared/types';
import type { ChatService } from './ChatService';

export class ViewDiscovery {
  private views: LensViewManifest[] = [];
  private watchers: fs.FSWatcher[] = [];
  private mindPath: string | null = null;
  private chatService: ChatService;

  constructor(chatService: ChatService) {
    this.chatService = chatService;
  }

  async scan(mindPath: string): Promise<LensViewManifest[]> {
    this.mindPath = mindPath;
    this.views = [];

    const lensDir = path.join(mindPath, '.github', 'lens');

    // Seed default hello-world view if .github/lens/ is empty or missing
    this.seedDefaults(lensDir);

    if (fs.existsSync(lensDir)) {
      const entries = fs.readdirSync(lensDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const viewJsonPath = path.join(lensDir, entry.name, 'view.json');
        if (!fs.existsSync(viewJsonPath)) continue;

        try {
          const raw = fs.readFileSync(viewJsonPath, 'utf-8');
          const manifest = JSON.parse(raw) as LensViewManifest;
          manifest.id = entry.name;
          manifest._basePath = path.join(lensDir, entry.name);
          this.views.push(manifest);
          console.log(`[ViewDiscovery] Found view: ${manifest.name} (${entry.name})`);
        } catch (err) {
          console.error(`[ViewDiscovery] Failed to parse ${viewJsonPath}:`, err);
        }
      }
    }

    return this.views;
  }

  getViews(): LensViewManifest[] {
    return this.views;
  }

  getViewData(viewId: string): Record<string, unknown> | null {
    const view = this.views.find(v => v.id === viewId);
    if (!view || !view._basePath) return null;

    const dataPath = path.join(view._basePath, view.source);
    if (!fs.existsSync(dataPath)) return null;

    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[ViewDiscovery] Failed to read data for ${viewId}:`, err);
      return null;
    }
  }

  async refreshView(viewId: string): Promise<Record<string, unknown> | null> {
    const view = this.views.find(v => v.id === viewId);
    if (!view || !view.prompt || !view._basePath) return this.getViewData(viewId);

    // Build the full prompt with output path context
    const dataPath = path.join(view._basePath, view.source);
    const fullPrompt = `${view.prompt}\n\nWrite the JSON output to: ${dataPath}`;

    try {
      await this.chatService.sendBackgroundPrompt(fullPrompt);
      // Agent has completed — re-read the data file
      return this.getViewData(viewId);
    } catch (err) {
      console.error(`[ViewDiscovery] Refresh failed for ${viewId}:`, err);
      return this.getViewData(viewId);
    }
  }

  private seedDefaults(lensDir: string): void {
    const helloDir = path.join(lensDir, 'hello-world');
    const helloViewJson = path.join(helloDir, 'view.json');

    if (fs.existsSync(helloViewJson)) return;

    console.log('[ViewDiscovery] Seeding default hello-world view');
    fs.mkdirSync(helloDir, { recursive: true });
    fs.writeFileSync(helloViewJson, JSON.stringify({
      name: 'Hello World',
      icon: 'zap',
      view: 'form',
      source: 'data.json',
      prompt: 'Report your current status including: your agent name, the mind directory name, how many files are in inbox/, how many initiatives exist, how many domains exist, and what extensions are loaded. Write the result as a flat JSON object to the path specified below.',
      refreshOn: 'click',
      schema: {
        properties: {
          agent: { type: 'string', title: 'Agent' },
          mind: { type: 'string', title: 'Mind' },
          inbox_count: { type: 'number', title: 'Inbox Items' },
          initiatives: { type: 'number', title: 'Initiatives' },
          domains: { type: 'number', title: 'Domains' },
          extensions: { type: 'string', title: 'Extensions' },
          status: { type: 'string', title: 'Status' },
        },
      },
    }, null, 2));
  }

  startWatching(onChanged: () => void): void {
    this.stopWatching();
    if (!this.mindPath) return;

    const lensDir = path.join(this.mindPath, '.github', 'lens');

    for (const dir of [lensDir]) {
      if (!fs.existsSync(dir)) continue;
      try {
        const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
          if (filename && (filename.endsWith('view.json') || filename.endsWith('.json'))) {
            // Debounce: re-scan after a short delay
            setTimeout(() => {
              if (this.mindPath) {
                this.scan(this.mindPath).then(onChanged);
              }
            }, 300);
          }
        });
        this.watchers.push(watcher);
      } catch (err) {
        console.error(`[ViewDiscovery] Failed to watch ${dir}:`, err);
      }
    }
  }

  stopWatching(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
  }
}
