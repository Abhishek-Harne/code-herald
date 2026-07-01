"use client";

import { useState } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────

function parseRepoInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };
  const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };
  return null;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}

function firstLine(msg) { return msg.split("\n")[0]; }

// ── icons ─────────────────────────────────────────────────────────────────────

function IconClipboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="8" height="11" rx="1.5" />
      <path d="M5 4H4a1.5 1.5 0 0 0-1.5 1.5v7A1.5 1.5 0 0 0 4 14h5.5" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l3.5 3.5L13 4.5" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

// ── copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-colors ${
        copied
          ? "text-amber-400"
          : "text-stone-500 hover:text-stone-300"
      }`}
    >
      {copied ? <IconCheck /> : <IconClipboard />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── commit card ───────────────────────────────────────────────────────────────

function CommitCard({ commit }) {
  const [post, setPost] = useState(null);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [postError, setPostError] = useState(null);

  const [script, setScript] = useState(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState(null);

  async function handleGeneratePost() {
    setGeneratingPost(true);
    setPostError(null);
    setPost(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commit.message, filesChanged: commit.filesChanged }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setPost(data.post);
    } catch (err) {
      setPostError(err.message || "Something went wrong.");
    } finally {
      setGeneratingPost(false);
    }
  }

  async function handleGenerateScript() {
    setGeneratingScript(true);
    setScriptError(null);
    setScript(null);
    try {
      const res = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commit.message, filesChanged: commit.filesChanged }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setScript(data.script);
    } catch (err) {
      setScriptError(err.message || "Something went wrong.");
    } finally {
      setGeneratingScript(false);
    }
  }

  return (
    <article className="group relative overflow-hidden rounded-xl border border-stone-800 bg-stone-900 transition-colors hover:border-stone-700">
      {/* amber left accent bar */}
      <div className="absolute left-0 top-0 h-full w-0.5 bg-amber-400/40 transition-colors group-hover:bg-amber-400/70" />

      <div className="p-5 sm:p-6">
        {/* commit headline + actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug text-stone-100">
              {firstLine(commit.message)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-stone-400">{commit.author}</span>
              <span className="text-stone-700" aria-hidden>·</span>
              <span className="font-mono text-xs text-stone-500">{formatDate(commit.date)}</span>
              <span className="text-stone-700" aria-hidden>·</span>
              <code className="rounded border border-stone-700 bg-stone-950 px-1.5 py-0.5 font-mono text-xs text-amber-400/80">
                {commit.sha.slice(0, 7)}
              </code>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              onClick={handleGeneratePost}
              disabled={generatingPost}
              className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-400/40 disabled:text-stone-950/40"
            >
              {generatingPost ? "Generating…" : "Generate post"}
            </button>
            <button
              onClick={handleGenerateScript}
              disabled={generatingScript}
              className="rounded-lg border border-stone-700 bg-transparent px-3.5 py-2 text-xs font-semibold text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 disabled:cursor-not-allowed disabled:text-stone-600"
            >
              {generatingScript ? "Generating…" : "Video script"}
            </button>
          </div>
        </div>

        {/* file path chips */}
        {commit.filesChanged?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {commit.filesChanged.slice(0, 6).map((file) => (
              <span
                key={file}
                title={file}
                className="inline-block max-w-[200px] truncate rounded border border-stone-700/60 bg-stone-950 px-2 py-0.5 font-mono text-[11px] text-stone-500"
              >
                {file}
              </span>
            ))}
            {commit.filesChanged.length > 6 && (
              <span className="rounded border border-stone-700/60 bg-stone-950 px-2 py-0.5 font-mono text-[11px] text-stone-600">
                +{commit.filesChanged.length - 6} more
              </span>
            )}
          </div>
        )}

        {/* post error */}
        {postError && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-400">
            {postError}
          </div>
        )}

        {/* generated post */}
        {post && (
          <div className="mt-5 rounded-lg border border-stone-700 bg-stone-950/60">
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">
                LinkedIn Post
              </span>
              <CopyButton text={post} />
            </div>
            <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-stone-200">
              {post}
            </p>
          </div>
        )}

        {/* script error */}
        {scriptError && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-400">
            {scriptError}
          </div>
        )}

        {/* generated script */}
        {script && (
          <div className="mt-5 rounded-lg border border-stone-700 bg-stone-950">
            <div className="flex items-center justify-between border-b border-stone-800 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Recording" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Video Script · 30–45 sec
                </span>
              </div>
              <CopyButton text={script} />
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-stone-300">
              {script}
            </pre>
            <div className="border-t border-stone-800 px-4 py-3">
              <a
                href="https://gemini.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-xs text-stone-500 transition-colors hover:text-amber-400"
              >
                Paste this script into Google Veo to generate a video
                <IconArrow />
              </a>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [repoInput, setRepoInput] = useState("");
  const [commits, setCommits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFetchCommits(e) {
    e.preventDefault();
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError("Enter a repo as owner/repo or a full GitHub URL — e.g. facebook/react");
      setCommits(null);
      return;
    }
    setLoading(true);
    setError(null);
    setCommits(null);
    try {
      const res = await fetch(
        `/api/commits?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setCommits(data.commits || []);
    } catch (err) {
      setError(err.message || "Something went wrong fetching commits.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-stone-950">
      <div className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">

        {/* ── masthead ── */}
        <header className="mb-10 border-b border-stone-800 pb-8">
          <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-600">
            Engineering journalism
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-100 sm:text-4xl">
            Code<span className="text-amber-400">Herald</span>
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-stone-500">
            Turn what your engineers ship into stories the world reads.
          </p>
        </header>

        {/* ── repo input ── */}
        <form onSubmit={handleFetchCommits} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo — e.g. facebook/react"
            className="flex-1 rounded-lg border border-stone-700 bg-stone-900 px-4 py-2.5 font-mono text-sm text-stone-200 outline-none placeholder:text-stone-600 transition-colors focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-400/40 disabled:text-stone-950/40"
          >
            {loading ? "Fetching…" : "Fetch commits"}
          </button>
        </form>

        {/* ── input error ── */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-400">
            {error}
          </div>
        )}

        {/* ── loading state ── */}
        {loading && (
          <div className="mt-20 flex flex-col items-center gap-4">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-700 border-t-amber-400" />
            <p className="font-mono text-xs text-stone-600">Fetching recent commits…</p>
          </div>
        )}

        {/* ── empty state ── */}
        {!loading && commits && commits.length === 0 && (
          <div className="mt-20 text-center">
            <p className="font-mono text-xs text-stone-600">No commits found for that repo.</p>
          </div>
        )}

        {/* ── commits list ── */}
        {!loading && commits && commits.length > 0 && (
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-stone-600">
                Recent commits
              </span>
              <div className="h-px flex-1 bg-stone-800" />
              <span className="font-mono text-[10px] text-stone-700">{commits.length}</span>
            </div>
            <div className="space-y-3">
              {commits.map((commit) => (
                <CommitCard key={commit.sha} commit={commit} />
              ))}
            </div>
          </div>
        )}

        {/* ── idle empty state (before any search) ── */}
        {!loading && !commits && !error && (
          <div className="mt-20 text-center">
            <p className="font-mono text-xs text-stone-700">
              Enter a GitHub repo above to pull recent commits.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
