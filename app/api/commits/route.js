export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')

  if (!owner || !repo) {
    return Response.json(
      { error: 'Missing required query params: owner and repo' },
      { status: 400 }
    )
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // TEMP DEBUG LOGGING — remove once the 401 is diagnosed
  console.log(
    `[commits debug] GITHUB_TOKEN exists: ${Boolean(process.env.GITHUB_TOKEN)}, length: ${(process.env.GITHUB_TOKEN || '').length}`
  )

  const [listRes, repoInfoRes, readmeRes] = await Promise.all([
    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
    fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers }),
  ])

  if (!listRes.ok) {
    const body = await listRes.text()
    // TEMP DEBUG LOGGING — remove once the 401 is diagnosed
    console.log(`[commits debug] GitHub API error ${listRes.status}: ${body}`)
    return Response.json(
      { error: `GitHub API error: ${listRes.status}`, details: body },
      { status: listRes.status }
    )
  }

  const commits = await listRes.json()

  // Extract repo description
  let repoDescription = ''
  if (repoInfoRes.ok) {
    const repoInfo = await repoInfoRes.json()
    repoDescription = repoInfo.description || ''
  }

  // Extract first ~400 chars of README (best-effort)
  let readmeExcerpt = ''
  if (readmeRes.ok) {
    try {
      const readmeData = await readmeRes.json()
      if (readmeData.encoding === 'base64' && readmeData.content) {
        const decoded = Buffer.from(readmeData.content, 'base64').toString('utf-8')
        readmeExcerpt = decoded.slice(0, 400).replace(/\n+/g, ' ').trim()
      }
    } catch { /* ignore */ }
  }

  const detailed = await Promise.all(
    commits.map(async (commit) => {
      const detailRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
        { headers }
      )
      const detail = await detailRes.json()

      return {
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        filesChanged: (detail.files || []).map((f) => f.filename),
      }
    })
  )

  return Response.json({
    commits: detailed,
    repoContext: { description: repoDescription, readme: readmeExcerpt },
  })
}
