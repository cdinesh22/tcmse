export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { currentVisitors = 0, capacityPerSlot = 0, slotDurationMinutes = 30, lanes = 2 } = req.body || {}
    const perSlotThroughput = Math.max(1, Number(capacityPerSlot)) * Math.max(1, Number(lanes))
    const slotsNeeded = perSlotThroughput ? Math.ceil(Number(currentVisitors) / perSlotThroughput) : 0
    const minutes = slotsNeeded * Math.max(1, Number(slotDurationMinutes))
    const level = minutes > 90 ? 'high' : minutes > 45 ? 'medium' : 'low'
    return res.status(200).json({ data: { minutes, level } })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to estimate waiting time', error: e.message })
  }
}


