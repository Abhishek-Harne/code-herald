export async function POST(request) {
  const body = await request.json()
  const { message, filesChanged, format = 'reel', repoContext = {} } = body || {}

  if (!message || !Array.isArray(filesChanged)) {
    return Response.json(
      { error: 'Missing required fields: message (string) and filesChanged (array)' },
      { status: 400 }
    )
  }

  const isReel = format !== 'youtube'
  const formatLabel = isReel ? 'Reel (30–45 seconds)' : 'YouTube Short (60–120 seconds)'

  const repoLine = repoContext.description
    ? `Repo description: ${repoContext.description}`
    : repoContext.readme
    ? `README excerpt: ${repoContext.readme.slice(0, 200)}`
    : 'No repo context available.'

  const systemPrompt = `You are a sharp technical writer creating video scripts for software teams. Format: ${formatLabel}.

BANNED: "exciting news", "we're thrilled", "game-changer", gratuitous exclamation marks, empty enthusiasm, corporate filler, fabricated significance.

You have access to:
1. The repo context (description/README) — what the project actually is
2. The commit message — what changed
3. The file paths — where it changed

Follow this narrative arc exactly, in order:

BEAT 1 — Context/setup: What is this project, for someone who's never heard of it? Use the repo context. One or two crisp lines.
BEAT 2 — Why it matters: What's the real-world stake? Why should a developer or user care about this area?
BEAT 3 — What shipped: The actual change from this commit. Name the real technical concept in plain English.
BEAT 4 — The difference: Where and how will a user or developer actually feel this? Concrete and specific.
BEAT 5 — Long-term angle: What does this enable or signal going forward?
BEAT 6 — Closing hook: One tight, memorable takeaway.

${isReel
  ? 'REEL FORMAT: Hit every beat fast and tight. Compress context to a single sharp line. Punch through each beat in a sentence or two. No padding. Energetic but not hypey.'
  : 'YOUTUBE FORMAT: Let each beat breathe. More depth on "why it matters" and "long-term". Still concrete and honest — just more room.'}

Script format (use this structure exactly — no extra commentary):

HOOK: [one punchy opening sentence spoken in the first 3 seconds]

VO: [context/setup — beat 1]
[visual suggestion in brackets]

VO: [why it matters — beat 2]
[visual suggestion in brackets]

VO: [what shipped — beat 3]
[visual suggestion in brackets]

VO: [the difference — beat 4]
[visual suggestion in brackets]

VO: [long-term angle — beat 5]
[visual suggestion in brackets]

VO: [closing hook — beat 6]
[visual suggestion in brackets]

Visual suggestions must be concrete and achievable: screen recordings, text overlays, code snippets, diagrams, before/after comparisons.

Honesty valve: if the commit is too vague or trivial (e.g. "fix", "wip", a minor build tweak), do not force a grand narrative. Write a short, honest script acknowledging it's a small internal change and what area it touched. Keep the same structure but compress it — don't fabricate stakes.`

  const userPrompt = `Repo context:
${repoLine}

Commit message:
${message}

Files changed:
${filesChanged.join('\n')}`

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!groqRes.ok) {
    const details = await groqRes.text()
    return Response.json(
      { error: `Groq API error: ${groqRes.status}`, details },
      { status: groqRes.status }
    )
  }

  const data = await groqRes.json()
  const script = data.choices?.[0]?.message?.content?.trim()

  return Response.json({ script })
}
