import jwt from 'jsonwebtoken'

export default async function handler(req, res) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    const user = { _id: decoded.sub, email: decoded.email, role: decoded.role, name: decoded.email.split('@')[0] }
    return res.status(200).json({ data: { user } })
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
}


