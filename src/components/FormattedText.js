import { Fragment } from 'react'

const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
// A short standalone line ending in ":" reads as a subheading, e.g. "Entry criteria:".
const HEADING = /^\s*([^.!?]{1,60}):\s*$/

/** **bold** → <strong>. Built as React nodes, never as HTML, so user text can't inject markup. */
export function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
  )
}

/** Plain-text preview (markers stripped) for one-line/two-line clamps. */
export function plainText(text = '') {
  return text
    .split('\n')
    .map((l) => (l.match(BULLET)?.[1] ?? l.match(NUMBERED)?.[1] ?? l).replace(/\*\*/g, '').trim())
    .filter(Boolean)
    .join(' · ')
}

function blocksOf(text) {
  const blocks = []
  let para = []
  const flush = () => { if (para.length) blocks.push({ type: 'p', lines: para }); para = [] }
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const bullet = raw.match(BULLET)
    const numbered = !bullet && raw.match(NUMBERED)
    const heading = !bullet && !numbered && raw.match(HEADING)
    const last = blocks[blocks.length - 1]
    if (!raw.trim()) { flush(); continue }
    if (bullet || numbered) {
      flush()
      const type = bullet ? 'ul' : 'ol'
      const item = (bullet || numbered)[1]
      if (last?.type === type && !last.closed) last.items.push(item)
      else blocks.push({ type, items: [item] })
      continue
    }
    if (heading) { flush(); blocks.push({ type: 'h', text: heading[1] }); continue }
    if (last && (last.type === 'ul' || last.type === 'ol')) last.closed = true
    para.push(raw.trim())
  }
  flush()
  return blocks
}

/** Renders typed text with paragraphs, line breaks, bullet/numbered lists, subheadings and **bold**. */
export default function FormattedText({ text, className = '' }) {
  if (!text?.trim()) return null
  return (
    <div className={`fmt-text ${className}`.trim()}>
      {blocksOf(text).map((b, i) => {
        if (b.type === 'h') return <h4 key={i} className="fmt-heading">{renderInline(b.text)}</h4>
        if (b.type === 'ul' || b.type === 'ol') {
          const List = b.type
          return <List key={i} className={`fmt-list fmt-list--${b.type}`}>{b.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}</List>
        }
        return (
          <p key={i} className="fmt-p">
            {b.lines.map((line, j) => <Fragment key={j}>{j > 0 && <br />}{renderInline(line)}</Fragment>)}
          </p>
        )
      })}
    </div>
  )
}
