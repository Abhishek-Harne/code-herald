export async function POST(request) {
  const body = await request.json()
  const { message, filesChanged } = body || {}

  if (!message || !Array.isArray(filesChanged)) {
    return Response.json(
      { error: 'Missing required fields: message (string) and filesChanged (array)' },
      { status: 400 }
    )
  }

  const systemPrompt = `You are a sharp technical writer creating short video scripts for a 30-45 second social media clip about a software change. Your audience is smart but not necessarily technical.

BANNED: "exciting news", "we're thrilled", "game-changer", "for all of us", gratuitous exclamation marks, and empty enthusiasm. No filler. No hype.

Use both the commit message and the file paths to infer what specifically changed. Name the real technical concept in plain English and explain concretely why it matters.

Format the script exactly like this — no extra commentary, just the script:

HOOK: [one punchy sentence spoken in the first 3 seconds that names the real change]

VO: [spoken line 1 — what was the problem or situation before]
[visual suggestion in brackets, e.g. "[screen recording of the error]"]

VO: [spoken line 2 — what changed and how]
[visual suggestion in brackets]

VO: [spoken line 3 — why it matters to a developer or user]
[visual suggestion in brackets]

VO: [spoken line 4 (optional) — crisp closing thought or implication]
[visual suggestion in brackets]

Keep each VO line short enough to be spoken naturally in under 10 seconds. Visual suggestions should be concrete and achievable (screen recordings, text overlays, code snippets, diagrams).

Honesty valve: if the commit is too vague or trivial (e.g. "fix", "wip", a minor build tweak), do not inflate it. Write a short honest script acknowledging it's a small internal change and what area it touched. Never fabricate significance.`

  const userPrompt = `Commit message:
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
