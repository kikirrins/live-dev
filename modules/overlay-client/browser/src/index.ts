import { extractSourceInfo } from "./fiber";
import { OVERLAY_CSS } from "./styles";

interface GitHubConfig {
  token: string;
  repo: string;
  userId?: string;
  allowedUsers?: string[];
}

function getGitHubConfig(): GitHubConfig {
  const gh = typeof window !== "undefined" && (window as any).__LIVEDEV_GITHUB__;
  return gh ?? { token: "", repo: "" };
}

let labelEnsured = false;

async function ensureLabel(gh: GitHubConfig): Promise<void> {
  if (labelEnsured) return;
  try {
    await fetch(`https://api.github.com/repos/${gh.repo}/labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${gh.token}`,
      },
      body: JSON.stringify({ name: "live-dev", color: "2563eb", description: "Change request from Live-Dev overlay" }),
    });
  } catch {}
  labelEnsured = true;
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
    const target = e.target as Element | null;
    if (!target || this.isOverlayNode(target)) return;
    // Prevent default behavior (links, buttons, forms, etc.)
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
      <textarea placeholder="e.g. make this button bigger and use our brand blue"></textarea>
      <div class="actions">
        <button class="secondary" data-action="cancel">Cancel</button>
        <button class="primary" data-action="submit">Submit</button>
      </div>
    `;
    this.root.appendChild(this.panel);

    const textarea = this.panel.querySelector("textarea")!;
    textarea.focus();

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
        const prompt = textarea.value.trim();
        if (!prompt) {
          textarea.focus();
          return;
        }
        const gh = getGitHubConfig();
        if (!gh.token || !gh.repo) {
          console.warn("[livedev] GitHub token or repo not configured");
          this.closePanel();
          return;
        }

        const source = info ?? {
          fileName: "unknown",
          lineNumber: 0,
          componentName: el.tagName.toLowerCase(),
          parentChain: [] as string[],
        };
        const body = [
          `**Change request:** ${prompt}`,
          "",
          `**Component:** \`${source.componentName}\` in \`${source.fileName}:${source.lineNumber}\``,
          `**Parent chain:** ${source.parentChain.join(" > ") || "\u2014"}`,
          `**Page:** ${location.href}`,
          elementText ? `**Element text:** ${elementText}` : "",
        ].filter(Boolean).join("\n");

        console.log("[livedev] creating GitHub issue");
        try {
          const { userId, allowedUsers } = gh as { userId?: string; allowedUsers?: string[] };
          if (!userId || !allowedUsers?.includes(userId)) {
            console.warn("[livedev] issue creation blocked: user not in whitelist");
            this.closePanel();
            return;
          }
          await ensureLabel(gh);
          const res = await fetch(`https://api.github.com/repos/${gh.repo}/issues`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${gh.token}`,
            },
            body: JSON.stringify({
              title: prompt.slice(0, 60),
              body,
              labels: ["live-dev"],
            }),
          });
          const data = await res.json();
          if (res.ok) {
            console.log("[livedev] issue created:", data.html_url);
          } else {
            console.warn("[livedev] issue creation failed:", data);
          }
        } catch (err) {
          console.warn("[livedev] GitHub API error:", err);
        }
        this.closePanel();
      }
    });
  }

  private closePanel() {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}

function shortenPath(path: string): string {
  const marker = "/packages/";
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
