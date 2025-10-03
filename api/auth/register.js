import jwt from 'jsonwebtoken'

// In-memory users for demo; in production replace with persistent storage
const users = [{ _id: 'admin', name: 'Temple Admin', email: 'admin@temple.com', role: 'admin', password: 'admin123' }]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const { name, email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ message: 'Missing email or password' })
  const exists = users.find(u => u.email === email)
  if (exists) return res.status(409).json({ message: 'User already exists' })
  const user = { _id: String(Date.now()), name: name || email.split('@')[0], email, role: 'pilgrim', password }
  users.push(user)
  const token = jwt.sign({ sub: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  return res.status(201).json({ data: { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token } })
}


