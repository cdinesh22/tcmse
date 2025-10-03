const express = require('express')
const axios = require('axios')
const Temple = require('../models/Temple')

const router = express.Router()

// POST /api/assistant
// Body: { question: string, templeId?: string, lang?: string }
router.post('/', async (req, res) => {
  try {
    const { question, templeId, lang } = req.body || {}
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ message: 'Question is required' })
    }

    const provider = (process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')).toLowerCase()
    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (provider === 'openai') {
      if (!openaiKey) return res.status(503).json({ message: 'OpenAI not configured' })
    } else {
      if (!geminiKey) return res.status(503).json({ message: 'Gemini not configured' })
    }

    let temple = null
    if (templeId) {
      try { temple = await Temple.findById(templeId).lean() } catch (_) {}
    }

    const contextLines = []
    if (temple) {
      contextLines.push(`Temple: ${temple.name}`)
      if (temple.description) contextLines.push(`Description: ${temple.description}`)
      if (temple.location) contextLines.push(`Location: ${temple.location.address}, ${temple.location.city}, ${temple.location.state}`)
      if (temple.timings) contextLines.push(`Timings: open ${temple.timings.openTime}, close ${temple.timings.closeTime}`)
      if (Array.isArray(temple.timings?.breakTime) && temple.timings.breakTime.length) {
        contextLines.push('Breaks: ' + temple.timings.breakTime.map(b => `${b.start}-${b.end}${b.reason ? ` (${b.reason})` : ''}`).join(', '))
      }
      if (Array.isArray(temple.rules) && temple.rules.length) contextLines.push('Rules: ' + temple.rules.join('; '))
      if (Array.isArray(temple.facilities) && temple.facilities.length) contextLines.push('Facilities: ' + temple.facilities.map(f => f.type || f.name).join(', '))
      if (temple.externalSources?.websiteUrl) contextLines.push(`Official website: ${temple.externalSources.websiteUrl}`)
      if (temple.currentStatus && temple.capacity?.maxVisitorsPerSlot) {
        const occ = temple.currentStatus.currentOccupancy || 0
        const cap = temple.capacity.maxVisitorsPerSlot
        const pct = Math.round((occ / Math.max(1, cap)) * 100)
        contextLines.push(`Occupancy: ${occ}/${cap} (~${pct}%)`)
      }
    }


    const systemPrompt = [
      'You are a polite, concise Temple Assistant. Answer questions about Indian temples clearly and helpfully.',
      'If the question asks about timings, address open/close and breaks. For location, provide address and a Google Maps link if coordinates are given.',
      'Be culturally respectful. Keep answers short, with bullet points when listing items.',
      'If the requested info is not present in context, say you do not have that detail and suggest checking the official website if available.',
      lang ? `Answer in ${lang} language if possible.` : '',
    ].filter(Boolean).join('\n')

    const combinedPrompt = [
      systemPrompt,
      temple ? ('Context about selected temple:\n' + contextLines.join('\n')) : null,
      'Question: ' + question,
    ].filter(Boolean).join('\n\n')

    let data
    let usedProvider = provider

    async function tryOpenAI() {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      const url = 'https://api.openai.com/v1/chat/completions'
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      }
      if (process.env.OPENAI_PROJECT) headers['OpenAI-Project'] = process.env.OPENAI_PROJECT
      if (process.env.OPENAI_ORG) headers['OpenAI-Organization'] = process.env.OPENAI_ORG
      const resp = await axios.post(
        url,
        {
          model,
          messages: [
            { role: 'system', content: 'You are a polite, concise Temple Assistant. Be culturally respectful and helpful.' },
            { role: 'user', content: combinedPrompt }
          ],
          temperature: 0.4
        },
        {
          timeout: 20000,
          headers,
        }
      )
      return resp.data
    }

    async function tryGemini() {
      const primaryModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'
      const primaryVersion = process.env.GEMINI_API_VERSION || 'v1'
      const modelCandidates = [primaryModel, 'gemini-1.5-flash']
      const versionCandidates = [primaryVersion, 'v1beta']
      let lastErr
      for (const v of versionCandidates) {
        for (const m of modelCandidates) {
          try {
            const url = `https://generativelanguage.googleapis.com/${v}/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(geminiKey)}`
            const resp = await axios.post(
              url,
              {
                contents: [
                  { role: 'user', parts: [{ text: combinedPrompt }] }
                ]
              },
              { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
            )
            console.log(`[assistant] Gemini OK with version=${v} model=${m}`)
            return resp.data
          } catch (e) {
            const status = e?.response?.status
            lastErr = e
            console.warn(`[assistant] Gemini attempt failed version=${v} model=${m} status=${status || 'unknown'}`)
            const code = e?.response?.data?.error?.status || ''
            if (status !== 404 && code !== 'NOT_FOUND') throw e
          }
        }
      }
      throw lastErr || new Error('All Gemini attempts failed')
    }

    // Prefer the configured provider; on failure, fallback to the other if available
    try {
      if (provider === 'openai') {
        data = await tryOpenAI(); usedProvider = 'openai'
      } else {
        data = await tryGemini(); usedProvider = 'gemini'
      }
    } catch (primaryErr) {
      const primaryName = provider
      const fallbackName = provider === 'openai' ? 'gemini' : 'openai'
      const canFallback = (provider === 'openai' && geminiKey) || (provider !== 'openai' && openaiKey)
      console.warn(`[assistant] Primary provider failed (${primaryName}). ${canFallback ? 'Trying fallback: ' + fallbackName : 'No fallback available.'}`)
      if (canFallback) {
        try {
          if (provider === 'openai') { data = await tryGemini(); usedProvider = 'gemini' }
          else { data = await tryOpenAI(); usedProvider = 'openai' }
        } catch (fallbackErr) {
          throw fallbackErr
        }
      } else {
        throw primaryErr
      }
    }

    let text = 'Sorry, I could not generate a response.'
    if (usedProvider === 'openai') {
      text = data?.choices?.[0]?.message?.content || text
    } else {
      text = (data?.candidates?.[0]?.content?.parts || []).map(p => p?.text || '').join('') || text
    }
    return res.json({ text })
  } catch (err) {
    const detail = err?.response?.data || { message: err.message }
    console.error('Assistant error (Gemini):', detail)
    return res.status(500).json({ message: 'Assistant service error', detail })
  }
})

// GET /api/assistant/stream?question=...&templeId=...&lang=...
router.get('/stream', async (req, res) => {
  try {
    const question = String(req.query.question || '')
    const templeId = req.query.templeId ? String(req.query.templeId) : undefined
    const lang = req.query.lang ? String(req.query.lang) : undefined
    if (!question) {
      res.status(400).end('Missing question')
      return
    }

    // Determine provider and API keys
    const provider = (process.env.AI_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'gemini')).toLowerCase()
    const geminiKey = process.env.GEMINI_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    })

    if (provider === 'openai') {
      if (!openaiKey) {
        res.write(`event: error\n`)
        res.write(`data: ${JSON.stringify({ message: 'OpenAI not configured' })}\n\n`)
        res.end(); return
      }
    } else if (!geminiKey) {
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ message: 'Gemini not configured' })}\n\n`)
      res.end(); return
    }

    let temple = null
    if (templeId) {
      try { temple = await Temple.findById(templeId).lean() } catch (_) {}
    }

    const contextLines = []
    if (temple) {
      contextLines.push(`Temple: ${temple.name}`)
      if (temple.description) contextLines.push(`Description: ${temple.description}`)
      if (temple.location) contextLines.push(`Location: ${temple.location.address}, ${temple.location.city}, ${temple.location.state}`)
      if (temple.timings) contextLines.push(`Timings: open ${temple.timings.openTime}, close ${temple.timings.closeTime}`)
      if (Array.isArray(temple.timings?.breakTime) && temple.timings.breakTime.length) {
        contextLines.push('Breaks: ' + temple.timings.breakTime.map(b => `${b.start}-${b.end}${b.reason ? ` (${b.reason})` : ''}`).join(', '))
      }
      if (Array.isArray(temple.rules) && temple.rules.length) contextLines.push('Rules: ' + temple.rules.join('; '))
      if (Array.isArray(temple.facilities) && temple.facilities.length) contextLines.push('Facilities: ' + temple.facilities.map(f => f.type || f.name).join(', '))
      if (temple.externalSources?.websiteUrl) contextLines.push(`Official website: ${temple.externalSources.websiteUrl}`)
      if (temple.currentStatus && temple.capacity?.maxVisitorsPerSlot) {
        const occ = temple.currentStatus.currentOccupancy || 0
        const cap = temple.capacity.maxVisitorsPerSlot
        const pct = Math.round((occ / Math.max(1, cap)) * 100)
        contextLines.push(`Occupancy: ${occ}/${cap} (~${pct}%)`)
      }
    }

    const systemPrompt = [
      'You are a polite, concise Temple Assistant. Answer questions about Indian temples clearly and helpfully.',
      'If the question asks about timings, address open/close and breaks. For location, provide address and a Google Maps link if coordinates are given.',
      'Be culturally respectful. Keep answers short, with bullet points when listing items.',
      'If the requested info is not present in context, say you do not have that detail and suggest checking the official website if available.',
      lang ? `Answer in ${lang} language if possible.` : '',
    ].filter(Boolean).join('\n')

    const combinedPrompt = [
      systemPrompt,
      temple ? ('Context about selected temple:\n' + contextLines.join('\n')) : null,
      'Question: ' + question,
    ].filter(Boolean).join('\n\n')

    let data
    let usedProvider = provider

    async function tryOpenAI() {
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'
      const url = 'https://api.openai.com/v1/chat/completions'
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      }
      const org = process.env.OPENAI_ORG || process.env.OPENAI_PROJECT
      if (org) headers['OpenAI-Organization'] = org
      const resp = await axios.post(
        url,
        {
          model,
          messages: [
            { role: 'system', content: 'You are a polite, concise Temple Assistant. Be culturally respectful and helpful.' },
            { role: 'user', content: combinedPrompt }
          ],
          temperature: 0.4
        },
        { timeout: 20000, headers }
      )
      return resp.data
    }

    async function tryGemini() {
      const primaryModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest'
      const primaryVersion = process.env.GEMINI_API_VERSION || 'v1'
      const modelCandidates = [primaryModel, 'gemini-1.5-flash']
      const versionCandidates = [primaryVersion, 'v1beta']
      let lastErr
      for (const v of versionCandidates) {
        for (const m of modelCandidates) {
          try {
            const url = `https://generativelanguage.googleapis.com/${v}/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(geminiKey)}`
            const resp = await axios.post(
              url,
              { contents: [ { role: 'user', parts: [{ text: combinedPrompt }] } ] },
              { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
            )
            console.log(`[assistant-stream] Gemini OK with version=${v} model=${m}`)
            return resp.data
          } catch (e) {
            const status = e?.response?.status
            lastErr = e
            console.warn(`[assistant-stream] attempt failed version=${v} model=${m} status=${status || 'unknown'}`)
            const code = e?.response?.data?.error?.status || ''
            if (status !== 404 && code !== 'NOT_FOUND') throw e
          }
        }
      }
      throw lastErr || new Error('All Gemini attempts failed')
    }

    try {
      if (provider === 'openai') { data = await tryOpenAI(); usedProvider = 'openai' }
      else { data = await tryGemini(); usedProvider = 'gemini' }
    } catch (primaryErr) {
      const canFallback = (provider === 'openai' && geminiKey) || (provider !== 'openai' && openaiKey)
      console.warn(`[assistant-stream] Primary provider failed (${provider}). ${canFallback ? 'Trying fallback' : 'No fallback available'}`)
      if (canFallback) {
        if (provider === 'openai') { data = await tryGemini(); usedProvider = 'gemini' }
        else { data = await tryOpenAI(); usedProvider = 'openai' }
      } else {
        throw primaryErr
      }
    }
    let fullText = 'Sorry, I could not generate a response.'
    if (usedProvider === 'openai') {
      fullText = data?.choices?.[0]?.message?.content || fullText
    } else {
      fullText = (data?.candidates?.[0]?.content?.parts || []).map(p => p?.text || '').join('') || fullText
    }

    const CHUNK = 80
    for (let i = 0; i < fullText.length; i += CHUNK) {
      const slice = fullText.slice(i, i + CHUNK)
      res.write(`data: ${JSON.stringify({ text: slice })}\n\n`)
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 25))
    }
    res.write(`event: done\n`)
    res.write(`data: {"done": true}\n\n`)
    res.end()
  } catch (err) {
    console.error('Assistant stream error (Gemini):', err?.response?.data || err.message)
    try {
      res.write(`event: error\n`)
      res.write(`data: ${JSON.stringify({ message: 'Streaming error' })}\n\n`)
      res.end()
    } catch (_) {}
  }
})

module.exports = router
