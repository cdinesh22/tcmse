import jwt from 'jsonwebtoken'

const users = [
  { _id: 'admin', name: 'Temple Admin', email: 'admin@temple.com', role: 'admin', password: 'admin123' },
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  const { email, password } = req.body || {}
  const user = users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ sub: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  return res.status(200).json({ data: { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, token } })
}


