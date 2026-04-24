"use client";

import { usePRs } from "./usePRs";
import type { DashboardPR } from "./types";

export interface DashboardProps {
  /**
   * Host path that returns the PR list. Must be a same-origin route that
   * authenticates the session and forwards to the livedev issues-service.
   * Defaults to "/api/livedev/prs".
   */
  endpoint?: string;
}

export function Dashboard({ endpoint }: DashboardProps = {}) {
  const { prs, loading, error, refresh } = usePRs(endpoint);

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Dev Dashboard</h1>
          <p style={styles.subtitle}>
            Open pull requests and their preview sandboxes.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          style={styles.refreshBtn}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div style={styles.error} role="alert">
          Failed to load PRs: {error}
        </div>
      )}

      {!error && prs && prs.length === 0 && !loading && (
        <div style={styles.empty}>No open pull requests.</div>
      )}

      {prs && prs.length > 0 && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Author</th>
              <th style={styles.th}>Branch</th>
              <th style={styles.th}>Updated</th>
              <th style={styles.th}>Sandbox</th>
            </tr>
          </thead>
          <tbody>
            {prs.map((pr) => (
              <PRRow key={pr.number} pr={pr} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PRRow({ pr }: { pr: DashboardPR }) {
  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <a href={pr.html_url} target="_blank" rel="noreferrer" style={styles.link}>
          #{pr.number}
        </a>
      </td>
      <td style={styles.td}>
        {pr.draft && <span style={styles.draftBadge}>draft</span>}
        <span>{pr.title}</span>
      </td>
      <td style={styles.td}>{pr.author ?? "—"}</td>
      <td style={styles.tdMono}>{pr.branch}</td>
      <td style={styles.td}>{formatRelative(pr.updated_at)}</td>
      <td style={styles.td}>
        {pr.preview_url ? (
          <a
            href={pr.preview_url}
            target="_blank"
            rel="noreferrer"
            style={styles.sandboxLink}
          >
            Open sandbox ↗
          </a>
        ) : (
          <span style={styles.muted}>No sandbox yet</span>
        )}
      </td>
    </tr>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    maxWidth: 1100,
    margin: "0 auto",
    padding: "2rem 1.5rem",
    color: "#111827",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1.5rem",
  },
  title: { fontSize: "1.5rem", fontWeight: 600, margin: 0 },
  subtitle: { color: "#6b7280", margin: "0.25rem 0 0", fontSize: "0.9rem" },
  refreshBtn: {
    padding: "0.5rem 1rem",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "white",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  error: {
    padding: "0.75rem 1rem",
    border: "1px solid #fca5a5",
    background: "#fef2f2",
    color: "#991b1b",
    borderRadius: 6,
    marginBottom: "1rem",
  },
  empty: {
    padding: "2rem",
    textAlign: "center",
    color: "#6b7280",
    border: "1px dashed #d1d5db",
    borderRadius: 6,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    textAlign: "left",
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontWeight: 500,
    fontSize: "0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  tr: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.75rem" },
  tdMono: {
    padding: "0.75rem",
    fontFamily:
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    fontSize: "0.85rem",
    color: "#374151",
  },
  link: { color: "#2563eb", textDecoration: "none", fontWeight: 500 },
  sandboxLink: {
    color: "#059669",
    textDecoration: "none",
    fontWeight: 500,
  },
  muted: { color: "#9ca3af", fontSize: "0.85rem" },
  draftBadge: {
    display: "inline-block",
    padding: "0.1rem 0.4rem",
    marginRight: "0.5rem",
    borderRadius: 4,
    background: "#f3f4f6",
    color: "#6b7280",
    fontSize: "0.75rem",
    textTransform: "uppercase",
  },
};
