// Ephemeral in-memory bookings for demo; for persistence wire to GitHub storage
let BOOKINGS = []

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ data: { bookings: BOOKINGS.slice(-50).reverse() } })
  }
  if (req.method === 'POST') {
    const payload = req.body || {}
    const id = `BK-${Date.now()}-${Math.random().toString(36).slice(2,6)}`.toUpperCase()
    const booking = { _id: id, status: 'confirmed', createdAt: new Date().toISOString(), ...payload }
    BOOKINGS.push(booking)
    return res.status(201).json({ data: { booking } })
  }
  if (req.method === 'DELETE') {
    const { id } = req.query
    BOOKINGS = BOOKINGS.filter(b => b._id !== id)
    return res.status(204).end()
  }
  return res.status(405).json({ message: 'Method not allowed' })
}


