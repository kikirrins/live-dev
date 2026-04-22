export const OVERLAY_CSS = `
  .livedev-root, .livedev-root * { box-sizing: border-box; }
  .livedev-toggle {
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
    background: #111; color: #fff; border: none; border-radius: 9999px;
    padding: 10px 16px; font: 500 13px -apple-system, system-ui, sans-serif;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25); cursor: pointer;
  }
  .livedev-toggle[data-active="true"] { background: #2563eb; }
  .livedev-highlight {
    position: fixed; pointer-events: none; z-index: 2147482999;
    border: 2px solid #2563eb; background: rgba(37,99,235,0.08);
    border-radius: 4px; transition: all 60ms linear;
  }
  .livedev-label {
    position: fixed; pointer-events: none; z-index: 2147483001;
    background: #2563eb; color: #fff; padding: 3px 8px;
    border-radius: 4px; font: 500 11px -apple-system, system-ui, sans-serif;
    white-space: nowrap;
  }
  .livedev-panel {
    position: fixed; right: 16px; bottom: 72px; width: 380px;
    max-height: 70vh; overflow: auto; z-index: 2147483002;
    background: #fff; color: #111; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.25); padding: 16px;
    font: 13px -apple-system, system-ui, sans-serif;
    cursor: default;
  }
  .livedev-panel h3 { margin: 0 0 8px 0; font-size: 14px; font-weight: 600; }
  .livedev-panel .meta {
    background: #f3f4f6; border-radius: 8px; padding: 10px;
    font: 500 11px ui-monospace, SFMono-Regular, monospace;
    color: #374151; margin-bottom: 12px; line-height: 1.5;
    word-break: break-all;
  }
  .livedev-panel .meta .k { color: #6b7280; }
  .livedev-panel textarea {
    width: 100%; min-height: 90px; resize: vertical;
    border: 1px solid #d1d5db; border-radius: 8px; padding: 10px;
    font: 13px -apple-system, system-ui, sans-serif;
  }
  .livedev-panel textarea:focus { outline: 2px solid #2563eb; outline-offset: 0; }
  .livedev-panel .actions {
    display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end;
  }
  .livedev-panel button {
    border: none; border-radius: 8px; padding: 8px 14px;
    font: 500 13px -apple-system, system-ui, sans-serif; cursor: pointer;
  }
  .livedev-panel .primary { background: #111; color: #fff; }
  .livedev-panel .primary:hover { background: #374151; }
  .livedev-panel .secondary { background: #e5e7eb; color: #111; }
  .livedev-screenshot {
    margin-bottom: 12px; border-radius: 8px; overflow: hidden;
    border: 1px solid #e5e7eb;
  }
  .livedev-screenshot img { display: block; width: 100%; }
`;
