import { fetchJsonFile } from '../../frontend/lib/storage/github.js'

function buildSlots(temple, dateISO) {
  const slots = []
  const startHour = 6
  const endHour = 21
  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startTime = `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`
      const endHourCalc = minute === 30 ? hour + 1 : hour
      const endMinute = minute === 30 ? 0 : 30
      const endTime = `${endHourCalc.toString().padStart(2,'0')}:${endMinute.toString().padStart(2,'0')}`
      slots.push({
        _id: `${temple.id}-${dateISO}-${startTime}`,
        temple: temple.id,
        date: dateISO,
        startTime,
        endTime,
        capacity: temple?.capacity?.maxVisitorsPerSlot || 200,
        price: 50,
        status: 'available',
        bookedCount: 0,
      })
    }
  }
  return slots
}

export default async function handler(req, res) {
  const { temple, date } = req.query
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { json } = await fetchJsonFile('temples.json')
    const list = Array.isArray(json) ? json : []
    const t = list.find(x => String(x.id||x._id) === String(temple))
    if (!t) return res.status(404).json({ message: 'Temple not found' })
    const dateISO = date || new Date().toISOString().split('T')[0]
    const slots = buildSlots({ id: t.id||t._id, capacity: t.capacity }, dateISO)
    return res.status(200).json({ data: { slots } })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to get slots', error: e.message })
  }
}


