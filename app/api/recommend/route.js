export async function POST(request) {
  const body = await request.json()
  const { commits } = body || {}

  if (!Array.isArray(commits) || commits.length === 0) {
    return Response.json({ recommendations: [] })
  }

  const commitList = commits
    .map((c, i) =>
      `${i + 1}. SHA: ${c.sha}\n   Message: ${c.message.split('\n')[0]}\n   Files: ${(c.filesChanged || []).slice(0, 5).join(', ') || 'none'}`
    )
    .join('\n\n')

  const systemPrompt = `You are a newsroom editor reviewing a batch of GitHub commits. Identify 1–2 commits with the highest story potential for a non-technical public audience.

PRIORITIZE: user-facing features, meaningful bug fixes that affect end users, new capabilities, notable performance improvements, important security fixes.
DEPRIORITIZE: internal build changes, CI/CD, dependency bumps, linting/formatting, refactors with no user impact, test-only changes, version bumps, chores.

Be honest. If the batch is mostly internal/trivial work, return 0 or 1 recommendation. Never inflate a trivial commit. If nothing is worth a public story, return an empty array.

For each recommended commit, write a concise one-sentence reason in plain English (no jargon) explaining why a non-technical audience would care.

Return ONLY valid JSON, no markdown, no preamble:
{"recommendations": [{"sha": "full_sha_here", "reason": "one sentence"}]}`

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
        { role: 'user', content: `Commits to review:\n\n${commitList}` },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!groqRes.ok) {
    return Response.json({ recommendations: [] })
  }

  const data = await groqRes.json()
  const raw = data.choices?.[0]?.message?.content?.trim()

  try {
    const parsed = JSON.parse(raw)
    return Response.json({ recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [] })
  } catch {
    return Response.json({ recommendations: [] })
  }
}
