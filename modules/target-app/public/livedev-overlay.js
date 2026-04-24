var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// browser/src/fiber.ts
var INTERNAL_NAMES = /* @__PURE__ */ new Set([
  // React internals
  "Suspense",
  "Fragment",
  "Provider",
  "Consumer",
  "ForwardRef",
  "ContextProvider",
  // Next.js App Router
  "InnerLayoutRouter",
  "OuterLayoutRouter",
  "RenderFromTemplateContext",
  "RedirectErrorBoundary",
  "RedirectBoundary",
  "NotFoundErrorBoundary",
  "NotFoundBoundary",
  "LoadingBoundary",
  "ErrorBoundary",
  "ClientPageRoot",
  "HotReload",
  "Router",
  "AppRouter",
  "ServerRoot",
  "RSCComponent",
  "Root",
  "RootLayoutComponent",
  // Next.js App Router scroll/focus
  "ScrollAndFocusHandler",
  "InnerScrollAndFocusHandler",
  // Next.js dev overlay
  "ReactDevOverlay",
  "ErrorBoundaryHandler",
  "DevRootNotFoundBoundary",
  "DevRootHTTPAccessFallbackBoundary",
  "HTTPAccessFallbackBoundary",
  // Next.js context adapters
  "PathnameContextProviderAdapter",
  "ServerInsertedHTMLContext",
  "ServerInsertedHTMLProvider",
  "AppRouterAnnouncer",
  "PageTreeLayoutErrorBoundary"
]);
function isUserComponent(name) {
  if (!name || !/^[A-Z]/.test(name)) return false;
  if (INTERNAL_NAMES.has(name)) return false;
  if (/Boundary$|^(Inner|Outer)/.test(name)) return false;
  if (/Overlay$|^Dev[A-Z]/.test(name)) return false;
  if (/^Pathname|^AppRouter|^ServerInserted/.test(name)) return false;
  return true;
}
function getFiberFromNode(node) {
  const key = Object.keys(node).find(
    (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
  );
  return key ? node[key] : null;
}
function getFiberFromNodeOrAncestor(node) {
  let el = node;
  while (el) {
    const fiber = getFiberFromNode(el);
    if (fiber) return fiber;
    el = el.parentElement;
  }
  return null;
}
function getComponentName(fiber) {
  const type = fiber?.type ?? fiber?.elementType;
  if (!type) return null;
  if (typeof type === "string") return type;
  return type.displayName || type.name || type.render?.displayName || type.render?.name || type.type?.displayName || type.type?.name || null;
}
function getSourceFromFiber(fiber) {
  if (fiber._debugSource) return fiber._debugSource;
  if (fiber.memoizedProps?.__source) return fiber.memoizedProps.__source;
  if (fiber.pendingProps?.__source) return fiber.pendingProps.__source;
  return null;
}
function collectFiberParents(node, excludeName) {
  const fiber = getFiberFromNodeOrAncestor(node);
  if (!fiber) return [];
  const owners = [];
  let walk = fiber.return;
  while (walk && owners.length < 20) {
    const name = getComponentName(walk);
    if (name && isUserComponent(name) && name !== excludeName && !owners.includes(name)) {
      owners.push(name);
    }
    walk = walk.return;
  }
  return owners;
}
function extractSourceInfo(node) {
  let attrEl = node;
  while (attrEl) {
    const src = attrEl.getAttribute("data-livedev-src");
    const comp = attrEl.getAttribute("data-livedev-component");
    if (src) {
      const [fileName, lineStr] = src.split(":");
      const lineNumber = parseInt(lineStr ?? "0", 10);
      const componentName2 = comp ?? "unknown";
      const domParents = [];
      let p2 = attrEl.parentElement;
      while (p2 && domParents.length < 8) {
        const parentComp = p2.getAttribute("data-livedev-component");
        if (parentComp && parentComp !== componentName2 && /^[A-Z]/.test(parentComp)) {
          if (!domParents.includes(parentComp)) domParents.push(parentComp);
        }
        p2 = p2.parentElement;
      }
      const fiberParents = collectFiberParents(node, componentName2);
      const parentChain2 = [...domParents];
      for (const fp of fiberParents) {
        if (!parentChain2.includes(fp) && fp !== componentName2) {
          parentChain2.push(fp);
        }
        if (parentChain2.length >= 8) break;
      }
      return { fileName, lineNumber, componentName: componentName2, parentChain: parentChain2 };
    }
    attrEl = attrEl.parentElement;
  }
  const fiber = getFiberFromNodeOrAncestor(node);
  if (!fiber) return null;
  let sourceFiber = null;
  let sourceData = null;
  let walk = fiber;
  while (walk) {
    const src = getSourceFromFiber(walk);
    if (src) {
      sourceFiber = walk;
      sourceData = src;
      break;
    }
    walk = walk.return;
  }
  let componentName = null;
  let componentFiber = sourceFiber ?? fiber;
  while (componentFiber) {
    const name = getComponentName(componentFiber);
    if (name && isUserComponent(name)) {
      componentName = name;
      break;
    }
    componentFiber = componentFiber.return;
  }
  if (componentName && !sourceData && componentFiber) {
    let srcWalk = componentFiber;
    while (srcWalk) {
      const src = getSourceFromFiber(srcWalk);
      if (src) {
        sourceData = src;
        break;
      }
      srcWalk = srcWalk.return;
    }
  }
  if (!componentName) {
    let fallbackFiber = fiber;
    while (fallbackFiber) {
      const name = getComponentName(fallbackFiber);
      if (name && /^[A-Z]/.test(name)) {
        componentName = name;
        break;
      }
      fallbackFiber = fallbackFiber.return;
    }
  }
  if (!componentName) return null;
  const parentChain = [];
  let p = componentFiber?.return;
  while (p && parentChain.length < 8) {
    const name = getComponentName(p);
    if (name && isUserComponent(name) && name !== componentName) {
      if (!parentChain.includes(name)) parentChain.push(name);
    }
    p = p.return;
  }
  return {
    fileName: sourceData?.fileName ?? "unknown",
    lineNumber: sourceData?.lineNumber ?? 0,
    columnNumber: sourceData?.columnNumber,
    componentName,
    parentChain
  };
}

// browser/src/styles.ts
var OVERLAY_CSS = `
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
  .livedev-toast-stack {
    position: fixed; bottom: 72px; right: 16px;
    display: flex; flex-direction: column-reverse; gap: 8px;
    z-index: 2147483003;
  }
  .livedev-toast {
    padding: 10px 14px; border-radius: 8px; color: #fff;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    min-width: 220px; max-width: 360px;
    font: 500 13px -apple-system, system-ui, sans-serif;
    animation: livedev-toast-in 160ms ease-out;
  }
  .livedev-toast[data-kind="success"] { background: #10b981; }
  .livedev-toast[data-kind="error"] { background: #ef4444; }
  .livedev-toast[data-kind="warn"] { background: #f59e0b; }
  .livedev-toast a { color: inherit; text-decoration: underline; margin-left: 8px; }
  @keyframes livedev-toast-in {
    from { transform: translateY(8px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }
  @keyframes livedev-toast-out {
    from { transform: translateY(0);   opacity: 1; }
    to   { transform: translateY(8px); opacity: 0; }
  }
`;

// browser/src/index.ts
function getConfig() {
  const cfg = typeof window !== "undefined" && window.__LIVEDEV__;
  return {
    endpoint: cfg?.endpoint ?? "/api/livedev/issues",
    userId: cfg?.userId
  };
}
function getDirectText(el) {
  let text = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? "";
    }
  }
  return text.trim();
}
var LiveDevOverlay = class {
  constructor() {
    __publicField(this, "active", false);
    __publicField(this, "root");
    __publicField(this, "toggle");
    __publicField(this, "highlight");
    __publicField(this, "label");
    __publicField(this, "panel", null);
    __publicField(this, "currentTarget", null);
    __publicField(this, "panelGeneration", 0);
    __publicField(this, "toastStack", null);
    __publicField(this, "onMouseMove", (e) => {
      if (!this.active) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || this.isOverlayNode(el)) {
        this.highlight.style.display = "none";
        this.label.style.display = "none";
        return;
      }
      this.currentTarget = el;
      const rect = el.getBoundingClientRect();
      this.highlight.style.display = "block";
      this.highlight.style.left = `${rect.left}px`;
      this.highlight.style.top = `${rect.top}px`;
      this.highlight.style.width = `${rect.width}px`;
      this.highlight.style.height = `${rect.height}px`;
      const info = extractSourceInfo(el);
      if (info) {
        this.label.style.display = "block";
        this.label.style.left = `${rect.left}px`;
        this.label.style.top = `${Math.max(0, rect.top - 22)}px`;
        this.label.textContent = `${info.componentName} \u2014 ${shortenPath(info.fileName)}:${info.lineNumber}`;
      } else {
        this.label.style.display = "block";
        this.label.style.left = `${rect.left}px`;
        this.label.style.top = `${Math.max(0, rect.top - 22)}px`;
        this.label.textContent = `<${el.tagName.toLowerCase()}> (no source)`;
      }
    });
    __publicField(this, "onClick", (e) => {
      if (!this.active) return;
      const target = e.target;
      if (!target || this.isOverlayNode(target)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.openPanel(target);
    });
    this.injectStyles();
    this.root = document.createElement("div");
    this.root.className = "livedev-root";
    document.body.appendChild(this.root);
    this.toggle = document.createElement("button");
    this.toggle.className = "livedev-toggle";
    this.toggle.textContent = "\u25CF Live-Dev";
    this.toggle.addEventListener("click", () => this.setActive(!this.active));
    this.root.appendChild(this.toggle);
    this.highlight = document.createElement("div");
    this.highlight.className = "livedev-highlight";
    this.highlight.style.display = "none";
    this.root.appendChild(this.highlight);
    this.label = document.createElement("div");
    this.label.className = "livedev-label";
    this.label.style.display = "none";
    this.root.appendChild(this.label);
    document.addEventListener("mousemove", this.onMouseMove, true);
    document.addEventListener("click", this.onClick, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.panel) this.closePanel();
        else if (this.active) this.setActive(false);
        return;
      }
      if (e.key === "L" && e.shiftKey && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.setActive(!this.active);
      }
    });
  }
  injectStyles() {
    const style = document.createElement("style");
    style.textContent = OVERLAY_CSS;
    document.head.appendChild(style);
  }
  setActive(on) {
    this.active = on;
    this.toggle.dataset.active = String(on);
    this.toggle.textContent = on ? "\u25CF Live-Dev (on)" : "\u25CF Live-Dev";
    if (!on) {
      this.closePanel();
      this.highlight.style.display = "none";
      this.label.style.display = "none";
      document.body.style.cursor = "";
    } else {
      document.body.style.cursor = "crosshair";
    }
  }
  isOverlayNode(el) {
    while (el) {
      if (el === this.root) return true;
      el = el.parentElement;
    }
    return false;
  }
  openPanel(el) {
    ++this.panelGeneration;
    this.closePanel();
    this.highlight.style.display = "none";
    this.label.style.display = "none";
    const info = extractSourceInfo(el);
    const elementText = getDirectText(el).slice(0, 300);
    const safeText = elementText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeUrl = location.href.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    this.panel = document.createElement("div");
    this.panel.className = "livedev-panel";
    this.panel.innerHTML = `
      <h3>Describe the change</h3>
      <div class="meta">
        <div><span class="k">component:</span> ${info?.componentName ?? "unknown"}</div>
        <div><span class="k">file:</span> ${info?.fileName ?? "unknown"}:${info?.lineNumber ?? "?"}</div>
        <div><span class="k">parents:</span> ${info?.parentChain.join(" \u203A ") || "\u2014"}</div>
        <div><span class="k">element:</span> &lt;${el.tagName.toLowerCase()}&gt;</div>
        ${safeText ? `<div><span class="k">text:</span> ${safeText}</div>` : ""}
        <div><span class="k">url:</span> ${safeUrl}</div>
      </div>
      <textarea placeholder="e.g. make this button bigger and use our brand blue"></textarea>
      <div class="actions">
        <button class="secondary" data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    `;
    this.root.appendChild(this.panel);
    const textarea = this.panel.querySelector("textarea");
    textarea.focus();
    this.panel.addEventListener("click", async (ev) => {
      const action = ev.target.closest("[data-action]") ? ev.target.closest("[data-action]").dataset.action : null;
      if (!action) return;
      if (action === "cancel") {
        this.closePanel();
        return;
      }
      if (action === "submit") {
        const prompt = textarea.value.trim();
        if (!prompt) {
          textarea.focus();
          return;
        }
        const source = info ?? {
          fileName: "unknown",
          lineNumber: 0,
          componentName: el.tagName.toLowerCase(),
          parentChain: []
        };
        const body = [
          `**Change request:** ${prompt}`,
          "",
          `**Component:** \`${source.componentName}\` in \`${source.fileName}:${source.lineNumber}\``,
          `**Parent chain:** ${source.parentChain.join(" > ") || "\u2014"}`,
          `**Page:** ${location.href}`,
          elementText ? `**Element text:** ${elementText}` : ""
        ].filter(Boolean).join("\n");
        const { endpoint } = getConfig();
        console.log("[livedev] submitting issue to", endpoint);
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: prompt.slice(0, 60),
              body,
              source: {
                componentName: source.componentName,
                fileName: source.fileName,
                lineNumber: source.lineNumber,
                parentChain: source.parentChain,
                url: location.href
              }
            })
          });
          if (res.status === 401 || res.status === 403) {
            this.showToast("warn", "Live-Dev: not authorized to file issues");
          } else if (res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data.html_url && data.number) {
              this.showToast("success", `Issue #${data.number} created`, data.html_url);
            } else {
              this.showToast("success", "Issue created");
            }
          } else {
            this.showToast("error", `Issue creation failed (${res.status})`);
          }
        } catch (err) {
          console.warn("[livedev] submit error:", err);
          this.showToast("error", "Live-Dev: network error");
        }
        this.closePanel();
      }
    });
  }
  closePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
  ensureToastStack() {
    if (!this.toastStack || !document.body.contains(this.toastStack)) {
      this.toastStack = document.createElement("div");
      this.toastStack.className = "livedev-toast-stack";
      document.body.appendChild(this.toastStack);
    }
    return this.toastStack;
  }
  showToast(kind, message, href) {
    const stack = this.ensureToastStack();
    const toast = document.createElement("div");
    toast.className = "livedev-toast";
    toast.dataset.kind = kind;
    toast.textContent = message;
    toast.addEventListener("click", (e) => e.stopPropagation());
    if (href) {
      const link = document.createElement("a");
      link.textContent = "View issue \u2192";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      toast.appendChild(link);
    }
    stack.appendChild(toast);
    const delay = kind === "error" ? 6e3 : 3500;
    setTimeout(() => {
      toast.style.animation = "livedev-toast-out 200ms ease-in forwards";
      setTimeout(() => {
        toast.remove();
        if (stack.childElementCount === 0) {
          stack.remove();
          if (this.toastStack === stack) this.toastStack = null;
        }
      }, 200);
    }, delay);
  }
};
function shortenPath(path) {
  const marker = "/modules/";
  const idx = path.indexOf(marker);
  if (idx >= 0) return path.slice(idx + 1);
  const parts = path.split("/");
  return parts.slice(-3).join("/");
}
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new LiveDevOverlay());
  } else {
    new LiveDevOverlay();
  }
}
