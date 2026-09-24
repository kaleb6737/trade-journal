import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const logo = readFileSync(new URL('../../public/brand-mark.svg', import.meta.url), 'utf8')
const token = name => css.match(new RegExp(`--${name}:\\s*(#[\\da-f]{6})`, 'i'))?.[1].toUpperCase()

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

describe('logo-aligned champagne palette', () => {
  it('uses the logo gold and highlight in the shared theme', () => {
    expect(token('gold-primary')).toBe('#E8C66A')
    expect(token('gold-light')).toBe('#FFF0BB')
    expect(logo).toContain(token('gold-primary'))
    expect(logo).toContain(token('gold-light'))
  })
  it('uses champagne instead of teal for brand accents', () => {
    expect(token('accent-primary')).toBe('#D9BC79')
    expect(css).not.toMatch(/#2dd4bf|45,\s*212,\s*191/i)
  })
  it('removes the old yellow-gold from global decorations', () => {
    expect(css).not.toMatch(/#d4af37|#f0c040|212,\s*175,\s*55/i)
  })
  it('preserves dark surfaces and semantic trading colors', () => {
    expect(token('bg-base')).toBe('#080808')
    expect(token('green')).toBe('#22C55E')
    expect(token('red')).toBe('#EF4444')
  })
  it('keeps primary gold text and button text highly readable', () => {
    expect(contrast(token('gold-primary'), token('bg-card'))).toBeGreaterThan(7)
    expect(contrast(token('accent-primary'), token('bg-base'))).toBeGreaterThan(7)
    expect(contrast('#000000', token('gold-primary'))).toBeGreaterThan(7)
    expect(contrast('#000000', token('gold-light'))).toBeGreaterThan(7)
  })
})
