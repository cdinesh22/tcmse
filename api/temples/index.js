import { fetchJsonFile } from '../../frontend/lib/storage/github.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { json } = await fetchJsonFile('temples.json')
    const list = Array.isArray(json) ? json : []
    const normalized = list.map(t => ({
      ...t,
      _id: t._id || t.id,
    }))
    return res.status(200).json({ data: { temples: normalized } })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load temples', error: e.message })
  }
}


