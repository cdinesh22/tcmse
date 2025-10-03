// Lightweight GitHub JSON storage helper using GitHub Contents API
// Requires env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, optional GITHUB_BRANCH (default: main), GITHUB_DATA_DIR (default: data)
import { Buffer } from 'node:buffer'

const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || 'main'
const OWNER = process.env.GITHUB_OWNER
const REPO = process.env.GITHUB_REPO
const DATA_DIR = process.env.GITHUB_DATA_DIR || 'data'
const TOKEN = process.env.GITHUB_TOKEN

function ensureEnv() {
  if (!OWNER || !REPO) throw new Error('Missing GITHUB_OWNER or GITHUB_REPO')
  if (!TOKEN) throw new Error('Missing GITHUB_TOKEN')
}

export async function fetchJsonFile(relativePath) {
  ensureEnv()
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(DATA_DIR + '/' + relativePath)}?ref=${encodeURIComponent(DEFAULT_BRANCH)}`
  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sih-app'
    }
  })
  if (res.status === 404) return { json: null, sha: null }
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`)
  const body = await res.json()
  if (!body || !body.content) return { json: null, sha: body.sha || null }
  const decoded = Buffer.from(body.content, 'base64').toString('utf-8')
  return { json: JSON.parse(decoded), sha: body.sha }
}

export async function putJsonFile(relativePath, data, message = 'Update data') {
  ensureEnv()
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(DATA_DIR + '/' + relativePath)}`
  const current = await fetchJsonFile(relativePath)
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64')
  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'sih-app'
    },
    body: JSON.stringify({
      message,
      content,
      branch: DEFAULT_BRANCH,
      sha: current.sha || undefined
    })
  })
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status}`)
  const body = await res.json()
  return { sha: body.content?.sha || null }
}


