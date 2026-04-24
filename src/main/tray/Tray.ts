import { Menu, Tray, nativeImage } from 'electron';

export interface AppTrayOptions {
  showMainWindow: () => void;
  quit: () => void;
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect width="16" height="16" rx="3" fill="#09090b"/>
      <path d="M5 4h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" fill="#fafafa"/>
      <path d="M6 6.25h4M6 8h4M6 9.75h2.5" stroke="#09090b" stroke-width="1" stroke-linecap="round"/>
    </svg>
  `.trim();
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  return nativeImage.createFromDataURL(dataUrl).resize({ width: 16, height: 16 });
}

export function createAppTray(options: AppTrayOptions): Tray {
  const tray = new Tray(createTrayIcon());
  const menu = Menu.buildFromTemplate([
    { label: 'Show Chamber', click: options.showMainWindow },
    { type: 'separator' },
    { label: 'Quit', click: options.quit },
  ]);

  tray.setToolTip('Chamber');
  tray.setContextMenu(menu);
  tray.on('click', options.showMainWindow);

  return tray;
}
