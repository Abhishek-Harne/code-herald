export async function POST(request) {
  const body = await request.json()
  const { message, filesChanged } = body || {}

  if (!message || !Array.isArray(filesChanged)) {
    return Response.json(
      { error: 'Missing required fields: message (string) and filesChanged (array)' },
      { status: 400 }
    )
  }

  const systemPrompt = `You are a sharp technical writer who explains engineering work to a smart but non-expert audience. You are concrete and specific, never hype-y.

BANNED: "exciting news", "we're thrilled", "game-changer", "for all of us", gratuitous exclamation marks, and empty enthusiasm. No filler.

Anchor the post in the actual change: use both the commit message and the file paths to infer what specifically changed, name the real technical concept in plain English, and explain concretely why it matters to a developer or user.

Structure: a sharp one-line hook, 2-3 sentences explaining what changed and why, and a crisp closing thought. Keep it tight — under 100 words.

Honesty valve: if the commit message is too vague or trivial to say anything substantive (e.g. "fix", "wip", or an internal build tweak), do not inflate it. Instead write a short, honest line acknowledging it's a small internal change and briefly what area it touched. Never fabricate significance.

Write only the LinkedIn post text, nothing else.`

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
  const post = data.choices?.[0]?.message?.content?.trim()

  return Response.json({ post })
}
