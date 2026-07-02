"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  GitBranch as Github,
  Link2 as Linkedin,
  Globe,
  GitCommit,
  Sparkles,
  Send,
  Eye,
  Zap,
  ArrowRight,
  Users,
  Check,
  Clipboard,
  ChevronDown,
  Terminal,
  Megaphone,
  Heart,
  Share2,
  Clock,
  Trash2,
  X,
  FileText,
  Video,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

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

function formatRelative(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

function firstLine(msg) { return msg.split("\n")[0]; }

function buildShareUrls(post, commit, owner, repo) {
  const title = firstLine(commit.message);
  const ghUrl = `https://github.com/${owner}/${repo}/commit/${commit.sha}`;
  const shortPost = post.length > 280 ? post.slice(0, 277) + "…" : post;
  return {
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(ghUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(post)}`,
    twitter:  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shortPost)}`,
    hn:       `https://news.ycombinator.com/submitlink?t=${encodeURIComponent(title)}&u=${encodeURIComponent(ghUrl)}`,
    reddit:   `https://www.reddit.com/submit?title=${encodeURIComponent(title)}&text=${encodeURIComponent(post)}`,
  };
}

// ── localStorage history ──────────────────────────────────────────────────────

const HISTORY_KEY = "codeherald_history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function useHistory() {
  const [history, setHistory] = useState([]);

  // Load from localStorage on mount
  useEffect(() => { setHistory(loadHistory()); }, []);

  const addEntry = useCallback((entry) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item = { id, ...entry, timestamp: new Date().toISOString(), action: null };
    setHistory((prev) => {
      const next = [item, ...prev];
      saveHistory(next);
      return next;
    });
    return id;
  }, []);

  const updateAction = useCallback((id, action) => {
    setHistory((prev) => {
      const next = prev.map((item) => item.id === id ? { ...item, action } : item);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return { history, addEntry, updateAction, clearHistory };
}

// ── shared UI primitives ──────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy", onCopied }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }
  return (
    <button onClick={handleCopy} title="Copy to clipboard"
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
        copied
          ? "border-amber-400/40 bg-amber-400/10 text-amber-400"
          : "border-stone-700 bg-stone-900 text-stone-300 hover:border-stone-600 hover:bg-stone-800 hover:text-stone-100"
      }`}>
      {copied ? <Check size={12} /> : <Clipboard size={12} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function ShareButton({ href, label, tooltip, hoverClass, onShare }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" title={tooltip}
      onClick={onShare}
      className={`flex items-center justify-center rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 font-mono text-xs font-bold text-stone-300 transition-all hover:border-transparent hover:text-white ${hoverClass}`}>
      {label}
    </a>
  );
}

function Collapsible({ expanded, children }) {
  return (
    <div style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
      <div style={{ overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// ── history panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ history, onUpdateAction, onClear, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true" role="dialog">
      {/* backdrop */}
      <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* drawer */}
      <div className="relative flex w-full max-w-lg flex-col border-l border-stone-800 bg-stone-950 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber-400" />
            <span className="text-sm font-semibold text-stone-100">History</span>
            {history.length > 0 && (
              <span className="rounded-full border border-stone-700 bg-stone-900 px-2 py-0.5 font-mono text-[10px] text-stone-400">
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={onClear}
                className="flex items-center gap-1.5 rounded-lg border border-stone-700 px-2.5 py-1.5 text-xs text-stone-500 transition-colors hover:border-red-900/60 hover:bg-red-950/30 hover:text-red-400">
                <Trash2 size={11} /> Clear all
              </button>
            )}
            <button onClick={onClose} title="Close"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-800 text-stone-500 transition-colors hover:border-stone-700 hover:text-stone-300">
              <X size={13} />
            </button>
          </div>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-8 py-24 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-stone-800 bg-stone-900">
                <Clock size={20} className="text-stone-600" />
              </div>
              <p className="text-sm font-medium text-stone-400">Nothing generated yet</p>
              <p className="text-xs leading-relaxed text-stone-600">Fetch a repo and create your first story — it'll appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-stone-800/60">
              {history.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <li key={item.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {/* type icon */}
                      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${item.type === "post" ? "border-amber-400/20 bg-amber-400/5" : "border-stone-700 bg-stone-900"}`}>
                        {item.type === "post"
                          ? <FileText size={12} className="text-amber-400" />
                          : <Video size={12} className="text-stone-400" />
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-stone-200">{item.commitTitle}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-[10px] text-stone-500">{item.repo}</span>
                          <span className="text-stone-700">·</span>
                          <span className={`font-mono text-[10px] ${item.type === "post" ? "text-amber-400/60" : "text-stone-500"}`}>
                            {item.type === "post" ? "LinkedIn post" : `Script · ${item.format || "reel"}`}
                          </span>
                          <span className="text-stone-700">·</span>
                          <span className="font-mono text-[10px] text-stone-600">{formatRelative(item.timestamp)}</span>
                        </div>
                        {item.action && (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded border border-stone-700 bg-stone-900 px-1.5 py-0.5 font-mono text-[9px] text-stone-500">
                            <Check size={8} className="text-amber-400" /> {item.action}
                          </span>
                        )}
                      </div>

                      <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="shrink-0 text-stone-600 transition-colors hover:text-stone-400">
                        <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                      </button>
                    </div>

                    {/* expanded content */}
                    <Collapsible expanded={isExpanded}>
                      <div className="mt-3 rounded-lg border border-stone-800 bg-stone-900/50">
                        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap p-3 font-mono text-[11px] leading-relaxed text-stone-300">
                          {item.content}
                        </pre>
                        <div className="border-t border-stone-800 px-3 py-2">
                          <CopyButton
                            text={item.content}
                            label="Re-copy"
                            onCopied={() => onUpdateAction(item.id, "copied")}
                          />
                        </div>
                      </div>
                    </Collapsible>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── commit card ───────────────────────────────────────────────────────────────

function CommitCard({ commit, owner, repo, recommendation, repoContext, addEntry, updateAction }) {
  const [post, setPost] = useState(null);
  const [generatingPost, setGeneratingPost] = useState(false);
  const [postError, setPostError] = useState(null);
  const [postExpanded, setPostExpanded] = useState(true);
  const [postHistoryId, setPostHistoryId] = useState(null);

  const [script, setScript] = useState(null);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState(null);
  const [scriptExpanded, setScriptExpanded] = useState(true);
  const [scriptFormat, setScriptFormat] = useState("reel");
  const [scriptHistoryId, setScriptHistoryId] = useState(null);

  async function handleGeneratePost() {
    setGeneratingPost(true); setPostError(null); setPost(null); setPostExpanded(true); setPostHistoryId(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: commit.message, filesChanged: commit.filesChanged }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setPost(data.post);
      const id = addEntry({
        repo: `${owner}/${repo}`,
        commitTitle: firstLine(commit.message),
        commitSha: commit.sha,
        type: "post",
        content: data.post,
      });
      setPostHistoryId(id);
    } catch (err) { setPostError(err.message || "Something went wrong."); }
    finally { setGeneratingPost(false); }
  }

  async function handleGenerateScript() {
    setGeneratingScript(true); setScriptError(null); setScript(null); setScriptExpanded(true); setScriptHistoryId(null);
    try {
      const res = await fetch("/api/script", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: commit.message,
          filesChanged: commit.filesChanged,
          format: scriptFormat,
          repoContext: repoContext || {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setScript(data.script);
      const id = addEntry({
        repo: `${owner}/${repo}`,
        commitTitle: firstLine(commit.message),
        commitSha: commit.sha,
        type: "script",
        format: scriptFormat,
        content: data.script,
      });
      setScriptHistoryId(id);
    } catch (err) { setScriptError(err.message || "Something went wrong."); }
    finally { setGeneratingScript(false); }
  }

  const shareUrls = post ? buildShareUrls(post, commit, owner, repo) : null;
  const isRecommended = Boolean(recommendation);

  return (
    <article className={`group relative overflow-hidden rounded-xl border bg-stone-900 transition-colors ${isRecommended ? "border-amber-400/40 hover:border-amber-400/60" : "border-stone-800 hover:border-stone-700"}`}>
      <div className={`absolute left-0 top-0 h-full w-0.5 transition-colors ${isRecommended ? "bg-amber-400/70" : "bg-amber-400/30 group-hover:bg-amber-400/60"}`} />

      <div className="p-5 sm:p-6">
        {/* headline + action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug text-stone-100">{firstLine(commit.message)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-xs text-stone-400">{commit.author}</span>
              <span className="text-stone-700" aria-hidden>·</span>
              <span className="font-mono text-xs text-stone-500">{formatDate(commit.date)}</span>
              <span className="text-stone-700" aria-hidden>·</span>
              <code className="rounded border border-stone-700 bg-stone-950 px-1.5 py-0.5 font-mono text-xs text-amber-400/80">
                {commit.sha.slice(0, 7)}
              </code>
            </div>
            {isRecommended && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2">
                <span className="mt-px font-mono text-xs text-amber-400">★</span>
                <div>
                  <span className="text-xs font-semibold text-amber-300">Recommended story</span>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-500">{recommendation.reason}</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <button onClick={handleGeneratePost} disabled={generatingPost}
              className="rounded-lg bg-amber-400 px-3.5 py-2 text-xs font-semibold text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-400/40 disabled:text-stone-950/40">
              {generatingPost ? "Generating…" : "Generate post"}
            </button>
            <div className="flex items-center gap-1.5">
              <div className="flex overflow-hidden rounded-lg border border-stone-700">
                <button onClick={() => setScriptFormat("reel")}
                  className={`px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${scriptFormat === "reel" ? "bg-stone-700 text-stone-100" : "bg-stone-900 text-stone-500 hover:text-stone-300"}`}>
                  Reel
                </button>
                <button onClick={() => setScriptFormat("youtube")}
                  className={`border-l border-stone-700 px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${scriptFormat === "youtube" ? "bg-stone-700 text-stone-100" : "bg-stone-900 text-stone-500 hover:text-stone-300"}`}>
                  YouTube
                </button>
              </div>
              <button onClick={handleGenerateScript} disabled={generatingScript}
                className="flex-1 rounded-lg border border-stone-700 bg-transparent px-2.5 py-1.5 text-[11px] font-semibold text-stone-300 transition-colors hover:border-stone-600 hover:bg-stone-800 disabled:cursor-not-allowed disabled:text-stone-600">
                {generatingScript ? "Generating…" : "Script"}
              </button>
            </div>
          </div>
        </div>

        {/* file chips */}
        {commit.filesChanged?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {commit.filesChanged.slice(0, 6).map((file) => (
              <span key={file} title={file} className="inline-block max-w-[200px] truncate rounded border border-stone-700/60 bg-stone-950 px-2 py-0.5 font-mono text-[11px] text-stone-500">
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

        {postError && <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-400">{postError}</div>}

        {post && (
          <div className="mt-5 rounded-lg border border-stone-700 bg-stone-950/60">
            <div className="flex items-center justify-between gap-2 border-b border-stone-800 px-4 py-2.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">LinkedIn Post</span>
              <button onClick={() => setPostExpanded(e => !e)} title={postExpanded ? "Collapse" : "Expand"}
                className="flex items-center rounded p-1 text-stone-500 transition-colors hover:text-stone-300">
                <ChevronDown size={13} className={`transition-transform duration-200 ${postExpanded ? "" : "-rotate-90"}`} />
              </button>
            </div>
            <Collapsible expanded={postExpanded}>
              <p className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-stone-200">{post}</p>
              {shareUrls && (
                <div className="border-t border-stone-800 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                      <Share2 size={11} /> Share →
                    </span>
                    <ShareButton href={shareUrls.linkedin} label="in" tooltip="Share on LinkedIn" hoverClass="hover:bg-[#0077b5]"
                      onShare={() => postHistoryId && updateAction(postHistoryId, "shared to LinkedIn")} />
                    <ShareButton href={shareUrls.twitter}  label="𝕏"  tooltip="Post on X / Twitter" hoverClass="hover:bg-stone-700"
                      onShare={() => postHistoryId && updateAction(postHistoryId, "shared to X")} />
                    <ShareButton href={shareUrls.hn}       label="HN" tooltip="Submit to Hacker News" hoverClass="hover:bg-[#ff6600]"
                      onShare={() => postHistoryId && updateAction(postHistoryId, "submitted to HN")} />
                    <ShareButton href={shareUrls.reddit}   label="r/" tooltip="Post to Reddit" hoverClass="hover:bg-[#ff4500]"
                      onShare={() => postHistoryId && updateAction(postHistoryId, "shared to Reddit")} />
                    <span className="text-stone-800">|</span>
                    <CopyButton text={post} label="Copy post"
                      onCopied={() => postHistoryId && updateAction(postHistoryId, "copied")} />
                  </div>
                </div>
              )}
            </Collapsible>
          </div>
        )}

        {scriptError && <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-xs text-red-400">{scriptError}</div>}

        {script && (
          <div className="mt-5 rounded-lg border border-stone-700 bg-stone-950">
            <div className="flex items-center justify-between gap-2 border-b border-stone-800 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                  Video Script · {scriptFormat === "reel" ? "30–45 sec" : "60–120 sec"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CopyButton text={script}
                  onCopied={() => scriptHistoryId && updateAction(scriptHistoryId, "copied")} />
                <button onClick={() => setScriptExpanded(e => !e)} title={scriptExpanded ? "Collapse" : "Expand"}
                  className="flex items-center rounded p-1 text-stone-600 transition-colors hover:text-stone-400">
                  <ChevronDown size={13} className={`transition-transform duration-200 ${scriptExpanded ? "" : "-rotate-90"}`} />
                </button>
              </div>
            </div>
            <Collapsible expanded={scriptExpanded}>
              <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-xs leading-relaxed text-stone-300">{script}</pre>
              <div className="border-t border-stone-800 px-4 py-3">
                <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-xs text-stone-500 transition-colors hover:text-amber-400">
                  Paste this script into Google Veo to generate a video <ArrowRight size={12} />
                </a>
              </div>
            </Collapsible>
          </div>
        )}
      </div>
    </article>
  );
}

// ── navbar ────────────────────────────────────────────────────────────────────

function Navbar({ onOpenHistory, historyCount }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-200 ${scrolled ? "border-b border-stone-800 bg-stone-950/90 backdrop-blur-sm" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#" className="flex items-center gap-2 text-sm font-semibold text-stone-100">
          <span className="font-mono text-amber-400">{">"}</span>
          Code<span className="text-amber-400">Herald</span>
        </a>
        <nav className="flex items-center gap-4 sm:gap-6">
          <a href="#how-it-works" className="hidden text-xs font-medium text-stone-500 transition-colors hover:text-stone-200 sm:block">How it works</a>
          <a href="#why"          className="hidden text-xs font-medium text-stone-500 transition-colors hover:text-stone-200 sm:block">Why</a>
          <a href="#use-cases"    className="hidden text-xs font-medium text-stone-500 transition-colors hover:text-stone-200 sm:block">Use cases</a>
          <button onClick={onOpenHistory}
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100">
            <Clock size={12} />
            History
            {historyCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 font-mono text-[9px] font-bold text-stone-950">
                {historyCount > 99 ? "99+" : historyCount}
              </span>
            )}
          </button>
          <a href="https://abhishekharne.vercel.app/" target="_blank" rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100 sm:flex">
            <Globe size={13} /> Portfolio
          </a>
          <a href="https://www.linkedin.com/in/abhishek-harne/" target="_blank" rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100 sm:flex">
            <Linkedin size={13} /> LinkedIn
          </a>
          <a href="https://github.com/Abhishek-Harne" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-300 transition-colors hover:border-stone-600 hover:text-stone-100">
            <Github size={13} /> GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

// ── example repos ─────────────────────────────────────────────────────────────

const EXAMPLE_REPOS = [
  { owner: "facebook",     repo: "react",        label: "UI library",      display: "facebook/react" },
  { owner: "vercel",       repo: "next.js",       label: "React framework", display: "vercel/next.js" },
  { owner: "tailwindlabs", repo: "tailwindcss",   label: "CSS framework",   display: "tailwindlabs/tailwindcss" },
  { owner: "microsoft",    repo: "vscode",        label: "Code editor",     display: "microsoft/vscode" },
];

// ── hero ──────────────────────────────────────────────────────────────────────

function Hero({ repoInput, setRepoInput, onFetch, loading }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-5 pb-12 pt-32 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/5 blur-3xl" />

      <div className="relative z-10 w-full max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/80 px-3.5 py-1.5 text-xs font-medium text-stone-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          GitHub commits → LinkedIn posts + video scripts
        </div>

        <h1 className="text-4xl font-semibold leading-tight tracking-tight text-stone-100 sm:text-5xl lg:text-6xl">
          Every commit deserves<br /><span className="text-amber-400">an audience.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-stone-400 sm:text-lg">
          Turn what your engineers ship into stories the world reads. Paste any GitHub repo and get polished content for every commit — instantly.
        </p>

        <form onSubmit={onFetch} className="mx-auto mt-10 flex max-w-xl flex-col gap-2 sm:flex-row">
          <input type="text" value={repoInput} onChange={(e) => setRepoInput(e.target.value)}
            placeholder="owner/repo — e.g. facebook/react"
            className="flex-1 rounded-xl border border-stone-700 bg-stone-900 px-4 py-3 font-mono text-sm text-stone-200 outline-none placeholder:text-stone-600 transition-colors focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/10" />
          <button type="submit" disabled={loading}
            className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-400/40 disabled:text-stone-950/40">
            {loading ? "Fetching…" : "Fetch commits"}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXAMPLE_REPOS.map(({ owner, repo, label, display }) => (
            <button key={display} onClick={() => onFetch(null, owner, repo)}
              className="group rounded-xl border border-stone-800 bg-stone-900/60 px-3 py-3 text-left transition-all hover:border-amber-400/30 hover:bg-stone-900">
              <span className="block truncate font-mono text-xs text-stone-300 transition-colors group-hover:text-amber-400">{display}</span>
              <span className="mt-1 block text-[11px] text-stone-600 transition-colors group-hover:text-stone-500">{label}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-stone-700">Click any card to fetch recent commits instantly</p>

        {/* sticky note */}
        <div className="mx-auto mt-8 max-w-sm rotate-[-0.8deg] rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-left shadow-sm">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/70">Builder's note</p>
          <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
            Video scripts are ready to paste into a video gen AI tool — but this could go further. With access to a Video Gen AI API (e.g. Google Veo), CodeHerald could generate the actual clip automatically. That's the next step — just waiting on API access.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── results area ──────────────────────────────────────────────────────────────

function ResultsArea({ commits, loading, error, owner, repo, recommendations, recommendLoading, repoContext, addEntry, updateAction }) {
  if (!loading && !commits && !error) return null;

  const recMap = Object.fromEntries((recommendations || []).map((r) => [r.sha, r]));

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-5 py-4 font-mono text-sm text-red-400">{error}</div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-stone-700 border-t-amber-400" />
          <p className="font-mono text-xs text-stone-600">Fetching recent commits…</p>
        </div>
      )}

      {!loading && commits && commits.length === 0 && (
        <p className="py-16 text-center font-mono text-xs text-stone-600">No commits found for that repo.</p>
      )}

      {!loading && commits && commits.length > 0 && (
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-stone-600">Recent commits</span>
            <div className="h-px flex-1 bg-stone-800" />
            {recommendLoading && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-stone-700">
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-stone-700 border-t-amber-400/60" />
                Analyzing story potential…
              </span>
            )}
            <span className="font-mono text-[10px] text-stone-700">{commits.length}</span>
          </div>
          <div className="space-y-3">
            {commits.map((commit) => (
              <CommitCard
                key={commit.sha}
                commit={commit}
                owner={owner}
                repo={repo}
                recommendation={recMap[commit.sha] || null}
                repoContext={repoContext}
                addEntry={addEntry}
                updateAction={updateAction}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// ── how it works ──────────────────────────────────────────────────────────────

const STEPS = [
  { num: "01", icon: GitCommit, title: "Pull commits from any repo",    desc: "Paste a GitHub repo URL. CodeHerald fetches the 10 most recent commits with author, date, and changed files." },
  { num: "02", icon: Sparkles,  title: "AI translates the engineering", desc: "A carefully tuned prompt sends commit context to Groq's LLM. No hype, no filler — concrete, honest plain-English." },
  { num: "03", icon: Send,      title: "Get content ready to publish",  desc: "A LinkedIn post and a 30–45 second video script, structured and ready. Copy or share with one click." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-stone-800 bg-stone-950 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">How it works</div>
        <h2 className="max-w-md text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">From Git to published story in seconds.</h2>
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative flex flex-col gap-4">
                {i < STEPS.length - 1 && (
                  <div className="absolute right-0 top-8 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-stone-700 to-transparent sm:block" />
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-700 bg-stone-900">
                    <Icon size={18} className="text-amber-400" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-stone-700">{step.num}</span>
                </div>
                <h3 className="text-sm font-semibold text-stone-200">{step.title}</h3>
                <p className="text-xs leading-relaxed text-stone-500">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── why this exists ───────────────────────────────────────────────────────────

function WhyThisExists() {
  return (
    <section id="why" className="border-t border-stone-800 bg-stone-950 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">Why this exists</div>
        <blockquote className="relative pl-6">
          <div className="absolute left-0 top-0 h-full w-0.5 bg-amber-400/40" />
          <p className="text-xl font-medium leading-relaxed tracking-tight text-stone-200 sm:text-2xl">
            Incredible engineering work happens every day and almost none of it reaches the outside world.
          </p>
          <p className="mt-6 text-base leading-relaxed text-stone-400">
            Great features ship buried in commit logs no one reads. The gap isn't the work — it's the translation. Engineers aren't failing at communication. The tooling is failing them.
          </p>
          <p className="mt-4 text-base leading-relaxed text-stone-400">
            CodeHerald reads what your team actually ships and turns it into stories people want to read, at a pace no human content team can match. Not spin. Not marketing copy. The real thing, in plain English.
          </p>
        </blockquote>
      </div>
    </section>
  );
}

// ── benefits ──────────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: Eye,      title: "Surface hidden work",       desc: "Great engineering ships invisibly. CodeHerald makes every meaningful change visible to the people who should care about it." },
  { icon: Zap,      title: "Content at agency speed",   desc: "What takes a content team a day takes CodeHerald 10 seconds. No briefs, no back-and-forth, no translation meetings." },
  { icon: Terminal, title: "No translation lost",       desc: "Engineers don't have to explain their work to marketers. The AI reads the commit and the diff — the signal stays intact." },
  { icon: Globe,    title: "Free and open",             desc: "No pricing tiers, no seat limits. Works with any public GitHub repo. Built in the open by an engineer who ships." },
];

function Benefits() {
  return (
    <section id="about" className="border-t border-stone-800 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">Why CodeHerald</div>
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">Built for teams that ship faster than they talk.</h2>
        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-stone-800 sm:grid-cols-2">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.title} className="flex flex-col gap-3 bg-stone-950 p-6 transition-colors hover:bg-stone-900/60 sm:p-8">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-800 bg-stone-900">
                  <Icon size={16} className="text-amber-400" />
                </div>
                <h3 className="text-sm font-semibold text-stone-100">{b.title}</h3>
                <p className="text-xs leading-relaxed text-stone-500">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── use cases ─────────────────────────────────────────────────────────────────

const USE_CASES = [
  { icon: Megaphone, who: "DevRel teams",              what: "Turn every release into a polished LinkedIn post or talk intro — without writing a word from scratch." },
  { icon: Terminal,  who: "Engineering-led startups",  what: "Show your technical credibility publicly. Build in public without the overhead of a dedicated content function." },
  { icon: Users,     who: "Technical marketers",       what: "Get accurate, jargon-free summaries of what shipped — without needing an engineer to explain it." },
  { icon: Heart,     who: "Open-source maintainers",   what: "Announce releases and significant merges to an audience that cares, in language that lands beyond GitHub." },
];

function UseCases() {
  return (
    <section id="use-cases" className="border-t border-stone-800 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-amber-400/60">Use cases</div>
        <h2 className="max-w-lg text-2xl font-semibold tracking-tight text-stone-100 sm:text-3xl">Who ships with CodeHerald.</h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {USE_CASES.map((uc) => {
            const Icon = uc.icon;
            return (
              <div key={uc.who} className="group flex gap-4 rounded-xl border border-stone-800 bg-stone-900/40 p-5 transition-colors hover:border-stone-700 hover:bg-stone-900">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-700 bg-stone-900 transition-colors group-hover:border-amber-400/30">
                  <Icon size={14} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-200">{uc.who}</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">{uc.what}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-stone-800 px-5 py-16 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-1.5 text-sm text-stone-400">
          Made with <Heart size={13} className="fill-red-400 text-red-400" /> and curiosity by{" "}
          <span className="font-medium text-stone-200">Abhishek Harne</span>
        </div>
        <p className="font-mono text-[11px] text-stone-700">Built with Claude · Deployed on Vercel</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="https://abhishekharne.vercel.app/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-xs text-stone-500 transition-colors hover:border-stone-700 hover:text-amber-400">
            <Globe size={13} /> Portfolio
          </a>
          <a href="https://www.linkedin.com/in/abhishek-harne/" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-xs text-stone-500 transition-colors hover:border-stone-700 hover:text-amber-400">
            <Linkedin size={13} /> LinkedIn
          </a>
          <a href="https://github.com/Abhishek-Harne" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-2 text-xs text-stone-500 transition-colors hover:border-stone-700 hover:text-amber-400">
            <Github size={13} /> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const [repoInput, setRepoInput] = useState("");
  const [currentOwner, setCurrentOwner] = useState("");
  const [currentRepo, setCurrentRepo] = useState("");
  const [commits, setCommits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [repoContext, setRepoContext] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const resultsRef = useRef(null);

  const { history, addEntry, updateAction, clearHistory } = useHistory();

  // Close history panel on Escape
  useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setHistoryOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  async function fetchRecommendations(fetchedCommits) {
    setRecommendLoading(true);
    setRecommendations([]);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commits: fetchedCommits }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch { /* fail silently */ }
    finally { setRecommendLoading(false); }
  }

  async function handleFetchCommits(e, overrideOwner, overrideRepo) {
    if (e) e.preventDefault();

    let owner, repo;
    if (overrideOwner && overrideRepo) {
      owner = overrideOwner; repo = overrideRepo;
      setRepoInput(`${overrideOwner}/${overrideRepo}`);
    } else {
      const parsed = parseRepoInput(repoInput);
      if (!parsed) {
        setError("Enter a repo as owner/repo or a full GitHub URL — e.g. facebook/react");
        setCommits(null);
        return;
      }
      owner = parsed.owner; repo = parsed.repo;
    }

    setCurrentOwner(owner);
    setCurrentRepo(repo);
    setLoading(true);
    setError(null);
    setCommits(null);
    setRecommendations([]);
    setRepoContext(null);

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

    try {
      const res = await fetch(`/api/commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const fetchedCommits = data.commits || [];
      setCommits(fetchedCommits);
      setRepoContext(data.repoContext || null);
      if (fetchedCommits.length > 0) fetchRecommendations(fetchedCommits);
    } catch (err) {
      setError(err.message || "Something went wrong fetching commits.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar onOpenHistory={() => setHistoryOpen(true)} historyCount={history.length} />
      <main>
        <Hero repoInput={repoInput} setRepoInput={setRepoInput} onFetch={handleFetchCommits} loading={loading} />
        <div ref={resultsRef} className="scroll-mt-8">
          <ResultsArea
            commits={commits}
            loading={loading}
            error={error}
            owner={currentOwner}
            repo={currentRepo}
            recommendations={recommendations}
            recommendLoading={recommendLoading}
            repoContext={repoContext}
            addEntry={addEntry}
            updateAction={updateAction}
          />
        </div>
        <HowItWorks />
        <WhyThisExists />
        <Benefits />
        <UseCases />
      </main>
      <Footer />

      {historyOpen && (
        <HistoryPanel
          history={history}
          onUpdateAction={updateAction}
          onClear={clearHistory}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </>
  );
}
