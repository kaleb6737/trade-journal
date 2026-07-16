import { describe, it, expect } from 'vitest'
import { sanitizeDictationHtml } from './formatDictationGemini'

describe('sanitizeDictationHtml', () => {
  it('extracts li text and escapes HTML', () => {
    const html = '<ul><li>Hello <b>world</b></li><li>Second & item</li></ul>'
    expect(sanitizeDictationHtml(html, '')).toBe(
      '<ul><li>Hello world</li><li>Second &amp; item</li></ul>'
    )
  })

  it('falls back to single escaped bullet from raw', () => {
    expect(sanitizeDictationHtml('not a list', 'x < y')).toBe('<ul><li>x &lt; y</li></ul>')
  })
})
