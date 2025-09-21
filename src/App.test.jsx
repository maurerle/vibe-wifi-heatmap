import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App smoke', () => {
  it('renders title and buttons', () => {
    render(<App />)
    expect(screen.getByText(/WiFi Coverage Heatmap/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Run Speedtest at Current Location/i })).toBeInTheDocument()
  })
})
