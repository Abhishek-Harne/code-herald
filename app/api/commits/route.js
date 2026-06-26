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

  const listRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`,
    { headers }
  )

  if (!listRes.ok) {
    const body = await listRes.text()
    return Response.json(
      { error: `GitHub API error: ${listRes.status}`, details: body },
      { status: listRes.status }
    )
  }

  const commits = await listRes.json()

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

  return Response.json({ commits: detailed })
}
