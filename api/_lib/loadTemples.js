import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

let cached = null

export function loadTemples() {
  if (cached) return cached
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const dataPath = path.join(__dirname, '../../frontend/data/temples.json')
  const raw = readFileSync(dataPath, 'utf-8')
  const json = JSON.parse(raw)
  cached = Array.isArray(json) ? json : []
  return cached
}


