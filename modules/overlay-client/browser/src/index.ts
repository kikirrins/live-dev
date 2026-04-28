import { captureViewport } from "./capture";
import { extractSourceInfo } from "./fiber";
import { OVERLAY_CSS } from "./styles";

interface LivedevConfig {
  endpoint: string;
  userId?: string;
}

function getConfig(): LivedevConfig {
  const cfg = typeof window !== "undefined" && (window as any).__LIVEDEV__;
  return {
    endpoint: cfg?.endpoint ?? "/api/livedev/issues",
    userId: cfg?.userId,
  };
}

/** Get only direct text content of an element, ignoring child elements */
function getDirectText(el: Element): string {
  let text = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? "";
    }
  }
  return text.trim();
}

class LiveDevOverlay {
  private active = false;
  private root: HTMLDivElement;
  private toggle: HTMLButtonElement;
  private highlight: HTMLDivElement;
  private label: HTMLDivElement;
  private panel: HTMLDivElement | null = null;
  private currentTarget: Element | null = null;
  private panelGeneration = 0;
  private toastStack: HTMLElement | null = null;

  constructor() {
    this.injectStyles();
    this.root = document.createElement("div");
    this.root.className = "livedev-root";
    document.body.appendChild(this.root);

    this.toggle = document.createElement("button");
    this.toggle.className = "livedev-toggle";
    this.toggle.textContent = "● Live-Dev";
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

  private injectStyles() {
    const style = document.createElement("style");
    style.textContent = OVERLAY_CSS;
    document.head.appendChild(style);
  }

  private setActive(on: boolean) {
    this.active = on;
    this.toggle.dataset.active = String(on);
    this.toggle.textContent = on ? "● Live-Dev (on)" : "● Live-Dev";
    if (!on) {
      this.closePanel();
      this.highlight.style.display = "none";
      this.label.style.display = "none";
      document.body.style.cursor = "";
    } else {
      document.body.style.cursor = "crosshair";
    }
  }

  private isOverlayNode(el: Element | null): boolean {
    while (el) {
      if (el === this.root) return true;
      el = el.parentElement;
    }
    return false;
  }

  private onMouseMove = (e: MouseEvent) => {
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
      this.label.textContent = `${info.componentName} — ${shortenPath(info.fileName)}:${info.lineNumber}`;
    } else {
      this.label.style.display = "block";
      this.label.style.left = `${rect.left}px`;
      this.label.style.top = `${Math.max(0, rect.top - 22)}px`;
      this.label.textContent = `<${el.tagName.toLowerCase()}> (no source)`;
    }
  };

  private onClick = (e: MouseEvent) => {
    if (!this.active) return;
    // Prefer the mousemove-tracked target — :active transforms can shift
    // an element between mousedown and click, so e.target / elementFromPoint
    // at click time may resolve to whatever's behind the shifted element.
    const tracked = this.currentTarget && !this.isOverlayNode(this.currentTarget)
      ? this.currentTarget
      : null;
    const target = tracked
      ?? (document.elementFromPoint(e.clientX, e.clientY) as Element | null)
      ?? (e.target as Element | null);
    if (!target || this.isOverlayNode(target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    this.openPanel(target);
  };

  private openPanel(el: Element) {
    ++this.panelGeneration;
    this.closePanel();
    this.highlight.style.display = "none";
    this.label.style.display = "none";
    const info = extractSourceInfo(el);

    const elementText = getDirectText(el).slice(0, 300);
    const safeText = elementText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const safeUrl = location.href
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    this.panel = document.createElement("div");
    this.panel.className = "livedev-panel";
    this.panel.innerHTML = `
      <h3>Describe the change</h3>
      <div class="meta">
        <div><span class="k">component:</span> ${info?.componentName ?? "unknown"}</div>
        <div><span class="k">file:</span> ${info?.fileName ?? "unknown"}:${info?.lineNumber ?? "?"}</div>
        <div><span class="k">parents:</span> ${info?.parentChain.join(" › ") || "—"}</div>
        <div><span class="k">element:</span> &lt;${el.tagName.toLowerCase()}&gt;</div>
        ${safeText ? `<div><span class="k">text:</span> ${safeText}</div>` : ""}
        <div><span class="k">url:</span> ${safeUrl}</div>
      </div>
      <input type="text" class="title" placeholder="Short title (e.g. Make CTA button bigger)" />
      <textarea placeholder="Describe the change in more detail (optional)"></textarea>
      <div class="actions">
        <button class="secondary" data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    `;
    this.root.appendChild(this.panel);

    const titleInput = this.panel.querySelector<HTMLInputElement>("input.title")!;
    const textarea = this.panel.querySelector("textarea")!;
    titleInput.focus();

    this.panel.addEventListener("click", async (ev) => {
      const action = (ev.target as HTMLElement).closest("[data-action]")
        ? (ev.target as HTMLElement).closest<HTMLElement>("[data-action]")!.dataset.action
        : null;
      if (!action) return;

      if (action === "cancel") {
        this.closePanel();
        return;
      }
      if (action === "submit") {
        const title = titleInput.value.trim();
        const description = textarea.value.trim();
        if (!title) {
          titleInput.focus();
          return;
        }

        const source = info ?? {
          fileName: "unknown",
          lineNumber: 0,
          componentName: el.tagName.toLowerCase(),
          parentChain: [] as string[],
        };
        const body = [
          description ? `**Change request:** ${description}` : "",
          description ? "" : "",
          `**Component:** \`${source.componentName}\` in \`${source.fileName}:${source.lineNumber}\``,
          `**Parent chain:** ${source.parentChain.join(" > ") || "—"}`,
          `**Page:** ${location.href}`,
          elementText ? `**Element text:** ${elementText}` : "",
        ].filter(Boolean).join("\n");

        const { endpoint } = getConfig();
        const elRect = el.getBoundingClientRect();

        this.closePanel();

        const meta = {
          title,
          body,
          source: {
            componentName: source.componentName,
            fileName: source.fileName,
            lineNumber: source.lineNumber,
            parentChain: source.parentChain,
            url: location.href,
          },
        };

        const blob = await new Promise<Blob | null>((resolve) => {
          requestAnimationFrame(() => {
            captureViewport({
              top: elRect.top,
              left: elRect.left,
              width: elRect.width,
              height: elRect.height,
            }).then(resolve).catch(() => resolve(null));
          });
        });

        console.log("[livedev] submitting issue to", endpoint);
        try {
          let res: Response;
          if (blob) {
            const fd = new FormData();
            fd.append("meta", JSON.stringify(meta));
            fd.append("screenshot", blob, "screenshot.png");
            res = await fetch(endpoint, {
              method: "POST",
              credentials: "same-origin",
              body: fd,
            });
          } else {
            res = await fetch(endpoint, {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(meta),
            });
          }
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
      }
    });
  }

  private closePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }

  private ensureToastStack(): HTMLElement {
    if (!this.toastStack || !document.body.contains(this.toastStack)) {
      this.toastStack = document.createElement("div");
      this.toastStack.className = "livedev-toast-stack";
      document.body.appendChild(this.toastStack);
    }
    return this.toastStack;
  }

  private showToast(kind: "success" | "error" | "warn", message: string, href?: string) {
    const stack = this.ensureToastStack();
    const toast = document.createElement("div");
    toast.className = "livedev-toast";
    toast.dataset.kind = kind;
    toast.textContent = message;
    toast.addEventListener("click", (e) => e.stopPropagation());
    if (href) {
      const link = document.createElement("a");
      link.textContent = "View issue →";
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      toast.appendChild(link);
    }
    stack.appendChild(toast);
    const delay = kind === "error" ? 6000 : 3500;
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
}

function shortenPath(path: string): string {
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
