import { loadTemples } from '../../_lib/loadTemples.js'

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ message: 'Missing id' })
  try {
    const list = loadTemples()
    const temple = list.find(t => String(t.id||t._id) === String(id))
    if (!temple) return res.status(404).json({ message: 'Temple not found' })
    return res.status(200).json({ data: { temple } })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load temple', error: e.message })
  }
}


