import { describe, it, expect } from 'vitest'
import { parsePointsFromJson, getStoredPoints, savePoints } from './App'
import '@testing-library/jest-dom'

describe('App helper functions', () => {
  it('parsePointsFromJson parses and cleans array input', () => {
    const raw = JSON.stringify([
      { lat: '10.5', lng: '20.2', download: '5', upload: '1' },
      { lat: null, lng: 'not-a-number' },
    ])
    const parsed = parsePointsFromJson(raw)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBe(1)
    expect(parsed[0].lat).toBeCloseTo(10.5)
    expect(parsed[0].download).toBe(5)
  })

  it('getStoredPoints returns [] when nothing set, and savePoints persists', () => {
    localStorage.clear()
    expect(getStoredPoints()).toEqual([])
    const pts = [{ lat: 1, lng: 2 }]
    savePoints(pts)
    expect(getStoredPoints()).toEqual(pts)
  })
})
