// Phase 2 RPC layer — channel-agnostic dispatcher + transports.
//
// CRITICAL: This directory must not import from 'electron'. It is designed to
// lift out into an `apps/server` package. Electron-specific concerns live in
// `src/main/ipc/` adapters that translate BrowserWindow/webContents into the
// transport-agnostic InvocationCtx defined here.
//
// See `~/.copilot/session-state/.../plan.md` and `docs/design-notes.md`.

export {};
