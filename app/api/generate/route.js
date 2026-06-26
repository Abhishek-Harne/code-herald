export async function POST(request) {
  const body = await request.json()
  const { message, filesChanged } = body || {}

  if (!message || !Array.isArray(filesChanged)) {
    return Response.json(
      { error: 'Missing required fields: message (string) and filesChanged (array)' },
      { status: 400 }
    )
  }

  const prompt = `You are a tech communicator who explains software changes to a general, non-engineer audience.

Turn the following raw GitHub commit into a short, engaging LinkedIn-style post. Explain what changed and why it matters, in plain English, with no technical jargon. Make it interesting to someone who doesn't code.

Commit message:
${message}

Files changed:
${filesChanged.join('\n')}

Write only the LinkedIn post text, nothing else.`

  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
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
