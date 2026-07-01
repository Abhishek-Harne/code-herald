"use client";

import { useState } from "react";

function parseRepoInput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const githubUrlMatch = trimmed.match(
    /github\.com\/([^/\s]+)\/([^/\s#?]+)/i
  );
  if (githubUrlMatch) {
    return { owner: githubUrlMatch[1], repo: githubUrlMatch[2].replace(/\.git$/, "") };
  }

  const shorthandMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1], repo: shorthandMatch[2].replace(/\.git$/, "") };
  }

  return null;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function firstLine(message) {
  return message.split("\n")[0];
}

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
        body: JSON.stringify({
          message: commit.message,
          filesChanged: commit.filesChanged,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      setPost(data.post);
    } catch (err) {
      setPostError(err.message || "Something went wrong generating this post.");
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
        body: JSON.stringify({
          message: commit.message,
          filesChanged: commit.filesChanged,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      setScript(data.script);
    } catch (err) {
      setScriptError(err.message || "Something went wrong generating this script.");
    } finally {
      setGeneratingScript(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-slate-900 leading-snug">
            {firstLine(commit.message)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="font-medium text-slate-600">{commit.author}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(commit.date)}</span>
            <span aria-hidden>·</span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
              {commit.sha.slice(0, 7)}
            </code>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={handleGeneratePost}
            disabled={generatingPost}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {generatingPost ? "Generating…" : "Generate post"}
          </button>
          <button
            onClick={handleGenerateScript}
            disabled={generatingScript}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {generatingScript ? "Generating…" : "Generate video script"}
          </button>
        </div>
      </div>

      {commit.filesChanged?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {commit.filesChanged.slice(0, 6).map((file) => (
            <span
              key={file}
              className="truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 max-w-[220px]"
              title={file}
            >
              {file}
            </span>
          ))}
          {commit.filesChanged.length > 6 && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500">
              +{commit.filesChanged.length - 6} more
            </span>
          )}
        </div>
      )}

      {postError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {postError}
        </div>
      )}

      {post && (
        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500">
            Generated LinkedIn post
          </p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {post}
          </p>
        </div>
      )}

      {scriptError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {scriptError}
        </div>
      )}

      {script && (
        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-violet-500">
            Video script · 30–45 sec
          </p>
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800">
            {script}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [repoInput, setRepoInput] = useState("");
  const [commits, setCommits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFetchCommits(e) {
    e.preventDefault();
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setError("Enter a repo as owner/repo or a full GitHub URL, e.g. facebook/react.");
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
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      setCommits(data.commits || []);
    } catch (err) {
      setError(err.message || "Something went wrong fetching commits.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-16 sm:pt-24">
        <header className="text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            From commit to story, instantly
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Code<span className="text-indigo-600">Herald</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-500">
            Turn what your engineers ship into stories the world reads.
          </p>
        </header>

        <form
          onSubmit={handleFetchCommits}
          className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row"
        >
          <input
            type="text"
            value={repoInput}
            onChange={(e) => setRepoInput(e.target.value)}
            placeholder="facebook/react or https://github.com/facebook/react"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-shadow placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Fetching…" : "Fetch commits"}
          </button>
        </form>

        {error && (
          <div className="mx-auto mt-6 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-3 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500" />
            <p className="text-sm">Fetching recent commits…</p>
          </div>
        )}

        {!loading && commits && commits.length === 0 && (
          <p className="mt-16 text-center text-sm text-slate-400">
            No commits found for that repo.
          </p>
        )}

        {!loading && commits && commits.length > 0 && (
          <div className="mt-12 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Recent commits
            </h2>
            <div className="space-y-4">
              {commits.map((commit) => (
                <CommitCard key={commit.sha} commit={commit} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
