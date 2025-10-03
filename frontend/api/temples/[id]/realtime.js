// Vercel Serverless Function for temple realtime info (no MongoDB)
// Reads temple metadata from GitHub-backed JSON and enriches with RSS/website hints

import RSSParser from 'rss-parser'
import axios from 'axios'
import cheerio from 'cheerio'
import { fetchJsonFile } from '../../../lib/storage/github.js'

const rssParser = new RSSParser({ timeout: 10000 })

async function safeGet(url, options = {}) {
  if (!url) return null
  try {
    const res = await axios.get(url, { timeout: 10000, ...options })
    return res.data
  } catch (_) {
    return null
  }
}

async function fetchRSSItems(feeds = []) {
  const items = []
  for (const feed of feeds) {
    try {
      const parsed = await rssParser.parseURL(feed)
      if (parsed?.items?.length) {
        items.push(
          ...parsed.items.slice(0, 5).map((it) => ({
            title: it.title,
            link: it.link,
            pubDate: it.pubDate || it.isoDate,
            source: parsed.title || feed,
          }))
        )
      }
    } catch (_) {
      // ignore
    }
  }
  return items.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0)).slice(0, 10)
}

async function scrapeWebsiteForHints(websiteUrl) {
  const html = await safeGet(websiteUrl, { responseType: 'text' })
  if (!html) return { hints: {}, notices: [] }
  const $ = cheerio.load(html)
  const text = $('body').text().replace(/\s+/g, ' ').toLowerCase()
  const hints = {}
  if (text.includes('darshan') && (text.includes('time') || text.includes('timing'))) {
    hints.darshanMentioned = true
  }
  if (text.includes('aarti') || text.includes('arati')) {
    hints.aartiMentioned = true
  }
  const notices = []
  $('a').each((_, a) => {
    const href = $(a).attr('href') || ''
    const label = $(a).text().trim()
    const l = label.toLowerCase()
    if (l.includes('notice') || l.includes('announcement') || l.includes('news')) {
      notices.push({ title: label || 'Notice', link: href.startsWith('http') ? href : new URL(href, websiteUrl).href })
    }
  })
  return { hints, notices: notices.slice(0, 5) }
}

function buildMapsLink(coords) {
  if (!coords?.latitude || !coords?.longitude) return null
  return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
}

function normalizeTimings(timings) {
  if (!timings) return null
  return {
    openTime: timings.openTime,
    closeTime: timings.closeTime,
    breakTime: Array.isArray(timings.breakTime) ? timings.breakTime : [],
  }
}

export default async function handler(req, res) {
  const { id } = req.query
  if (!id) return res.status(400).json({ message: 'Missing temple id' })

  try {
    const { json: temples } = await fetchJsonFile('temples.json')
    if (!Array.isArray(temples)) return res.status(500).json({ message: 'temples.json missing' })
    const temple = temples.find((t) => String(t.id) === String(id))
    if (!temple) return res.status(404).json({ message: 'Temple not found' })

    const websiteUrl = temple.externalSources?.websiteUrl || null
    const rssFeeds = Array.isArray(temple.externalSources?.rssFeeds) ? temple.externalSources.rssFeeds : []

    const [rssItems, websiteHints] = await Promise.all([
      fetchRSSItems(rssFeeds),
      scrapeWebsiteForHints(websiteUrl),
    ])

    const slotAvailability = temple.slotAvailability || { status: 'unknown', remaining: null }
    const data = {
      templeId: String(temple.id),
      templeName: temple.name,
      basicInfo: {
        address: temple.location?.address || null,
        city: temple.location?.city || null,
        state: temple.location?.state || null,
        websiteUrl,
        googleMapsUrl: buildMapsLink(temple.location?.coordinates),
      },
      darshanTimings: normalizeTimings(temple.timings),
      slotAvailability,
      crowd: {
        isOpen: !!temple.currentStatus?.isOpen,
        currentOccupancy: temple.currentStatus?.currentOccupancy ?? null,
        occupancyPercentage: typeof temple.occupancyPercentage === 'number' ? temple.occupancyPercentage : null,
        crowdLevel: temple.currentStatus?.crowdLevel || null,
        lastUpdated: temple.currentStatus?.lastUpdated || null,
      },
      notices: [
        ...rssItems,
        ...(websiteHints?.notices || []),
      ],
      hints: websiteHints?.hints || {},
      fetchedAt: new Date().toISOString(),
    }

    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ message: 'Failed to fetch realtime', error: e.message })
  }
}


