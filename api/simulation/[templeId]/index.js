import { loadTemples } from '../../_lib/loadTemples.js'

function buildMockSimulation(temple) {
  const seed = (temple?.id || temple?._id || 'x').length
  const rand = (min, max) => Math.floor(min + (max - min) * ((Math.sin(seed) + 1) / 2))
  const capacity = {
    maxVisitorsPerSlot: temple?.capacity?.maxVisitorsPerSlot || 500,
    totalDailyCapacity: temple?.capacity?.totalDailyCapacity || 10000,
  }
  const areas = ['Main Queue', 'North Gate', 'South Gate', 'Sanctum', 'Cloak Room', 'Prasad Counter'].map((name, i) => {
    const cap = 200 + i * 80
    const occ = rand(50, cap)
    const pct = Math.min(100, Math.round((occ / cap) * 100))
    const density = pct > 90 ? 'critical' : pct > 70 ? 'high' : pct > 40 ? 'medium' : 'low'
    return { name, capacity: cap, occupancy: occ, occupancyPercentage: pct, density }
  })
  const facilities = [
    { type: 'washroom', name: 'Washroom A', location: { lat: 0, lng: 0 } },
    { type: 'water', name: 'Water Point', location: { lat: 0, lng: 0 } },
    { type: 'first-aid', name: 'First Aid', location: { lat: 0, lng: 0 } },
    { type: 'parking', name: 'Parking', location: { lat: 0, lng: 0 } },
  ]
  const hourlyData = Array.from({ length: 12 }).map((_, i) => ({
    hour: 8 + i,
    expectedVisitors: 200 + i * 30,
    actualVisitors: 180 + i * 25,
  }))
  return {
    temple: {
      id: temple?.id || temple?._id,
      name: temple?.name,
      location: temple?.location || {},
      timings: temple?.timings || {},
      capacity,
    },
    areas,
    facilities,
    currentStatus: {
      expectedVisitors: hourlyData[hourlyData.length - 1].expectedVisitors,
      actualVisitors: hourlyData[hourlyData.length - 1].actualVisitors,
      isOpen: true,
      lastUpdated: new Date().toISOString(),
    },
    hourlyData,
    weatherImpact: { condition: 'Clear', temperature: 31, impactLevel: 'low' },
    alerts: [],
  }
}

export default async function handler(req, res) {
  const { templeId } = req.query
  if (!templeId) return res.status(400).json({ message: 'Missing templeId' })
  try {
    const list = loadTemples()
    const temple = list.find(t => String(t.id||t._id) === String(templeId))
    if (!temple) return res.status(404).json({ message: 'Temple not found' })
    const sim = buildMockSimulation(temple)
    return res.status(200).json({ data: sim })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to build simulation', error: e.message })
  }
}


