'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import UnderlineExt from '@tiptap/extension-underline'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code2,
  AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Highlighter, Type,
  ImagePlus, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, ZoomIn,
  Minus, Mic, MicOff, Sparkles,
} from 'lucide-react'

/* ─── Serialization helpers ─────────────────────────────────────────────── */

export function parseNotes(raw) {
  if (!raw) return { html: '', images: [] }
  try {
    const p = JSON.parse(raw)
    if (p?.v === 2) return { html: p.html || '', images: p.images || [] }
    if (p?.v === 1) {
      const html = p.text
        ? p.text.split('\n').map(l => `<p>${l || '<br>'}</p>`).join('')
        : ''
      return { html, images: p.images || [] }
    }
  } catch {}
  // Plain string — wrap in paragraphs
  const html = raw
    ? raw.split('\n').map(l => `<p>${l || '<br>'}</p>`).join('')
    : ''
  return { html, images: [] }
}

function serialize(html, images) {
  return JSON.stringify({ v: 2, html: html || '', images: images || [] })
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* ─── Toolbar helpers ────────────────────────────────────────────────────── */

function Divider() {
  return <span className="re-divider" aria-hidden />
}

function Btn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`re-btn${active ? ' re-btn--active' : ''}`}
      disabled={disabled}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

const HIGHLIGHT_COLORS = [
  { color: 'rgba(212,175,55,0.38)',  label: 'Gold'   },
  { color: 'rgba(34,197,94,0.32)',   label: 'Green'  },
  { color: 'rgba(239,68,68,0.32)',   label: 'Red'    },
  { color: 'rgba(59,130,246,0.35)',  label: 'Blue'   },
  { color: 'rgba(168,85,247,0.32)',  label: 'Purple' },
  { color: 'rgba(45,212,191,0.32)',  label: 'Teal'   },
]

const TEXT_COLORS = [
  { color: '#F5F5F5', label: 'White'   },
  { color: '#D4AF37', label: 'Gold'    },
  { color: '#22C55E', label: 'Green'   },
  { color: '#EF4444', label: 'Red'     },
  { color: '#3B82F6', label: 'Blue'    },
  { color: '#2DD4BF', label: 'Teal'    },
  { color: '#A855F7', label: 'Purple'  },
  { color: '#908C85', label: 'Muted'   },
]

function ColorPicker({ onSelect, currentColor, type }) {
  const [open, setOpen] = useState(false)
  const palette = type === 'highlight' ? HIGHLIGHT_COLORS : TEXT_COLORS

  return (
    <div className="re-color-wrap">
      <Btn
        onClick={() => setOpen(o => !o)}
        active={open}
        title={type === 'highlight' ? 'Highlight' : 'Text color'}
      >
        {type === 'highlight' ? <Highlighter size={14} /> : <Type size={14} />}
        <span
          className="re-color-swatch"
          style={{ background: currentColor || (type === 'highlight' ? 'rgba(212,175,55,0.38)' : '#F5F5F5') }}
        />
      </Btn>
      {open && (
        <div className="re-color-palette" onMouseLeave={() => setOpen(false)}>
          {palette.map(({ color, label }) => (
            <button
              key={color}
              type="button"
              title={label}
              className="re-color-dot"
              style={{ background: color }}
              onMouseDown={(e) => { e.preventDefault(); onSelect(color); setOpen(false) }}
              aria-label={label}
            />
          ))}
          {type === 'text' && (
            <button
              type="button"
              className="re-color-dot re-color-dot--reset"
              onMouseDown={(e) => { e.preventDefault(); onSelect(null); setOpen(false) }}
              title="Reset color"
              aria-label="Reset color"
            >
              <Minus size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Voice dictation (Web Speech API — Chrome / Edge / Safari) ─────────── */
/* Chromium sends audio to Google for transcription → needs HTTPS/localhost + network. */

const LS_DICTATION_AI = 'notesDictationAiOrganize'

function DictationButton({ editor }) {
  const [supported, setSupported] = useState(false)
  const [supportNote, setSupportNote] = useState('')
  const [listening, setListening] = useState(false)
  const [hint, setHint] = useState('')
  const [livePreview, setLivePreview] = useState('')
  const [aiOrganize, setAiOrganize] = useState(false)
  const [aiConfigured, setAiConfigured] = useState(false)
  const recRef = useRef(null)
  const listeningRef = useRef(false)
  const hintTimerRef = useRef(null)
  const interimRef = useRef('')
  /** One automatic `network` retry per mic press (Chromium → Google). */
  const sessionNetworkRetriedRef = useRef(false)
  /** Raw transcript for the current mic session when AI organize is on. */
  const sessionRawRef = useRef('')
  const aiOrganizeRef = useRef(false)
  const editorRef = useRef(null)
  const organizingRef = useRef(false)
  /** When true, `onend` must not run the AI finalizer (e.g. network retry reconnect). */
  const skipFinalizeOnEndRef = useRef(false)
  const finalizeAfterDictationRef = useRef(async () => {})

  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  useEffect(() => {
    aiOrganizeRef.current = aiOrganize
  }, [aiOrganize])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem(LS_DICTATION_AI) === '1') setAiOrganize(true)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hasApi = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    const secure = window.isSecureContext
    if (!hasApi) {
      setSupported(false)
      setSupportNote('Firefox has no Web Speech API — use Chrome, Edge, or Safari.')
    } else if (!secure) {
      setSupported(false)
      setSupportNote('Voice needs HTTPS or http://localhost — not http://your-lan-ip.')
    } else {
      setSupported(true)
      setSupportNote('')
    }
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      listeningRef.current = false
      interimRef.current = ''
      try {
        recRef.current?.stop?.()
      } catch {
        /* ignore */
      }
    }
  }, [])

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    const load = () => {
      fetch('/api/notes/format-dictation', { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.json() : Promise.resolve({})))
        .then((d) => {
          if (!cancelled) setAiConfigured(Boolean(d.configured))
        })
        .catch(() => {
          if (!cancelled) setAiConfigured(false)
        })
    }
    load()
    const t = window.setTimeout(load, 800)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [supported])

  const showHint = useCallback((msg, ms = 4500) => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    setHint(msg)
    if (ms > 0) hintTimerRef.current = setTimeout(() => setHint(''), ms)
  }, [])

  const flushInterimToBufferOrEditor = useCallback(() => {
    const t = interimRef.current.trim()
    if (!t) {
      interimRef.current = ''
      setLivePreview('')
      return
    }
    const ed = editorRef.current
    if (!ed) {
      interimRef.current = ''
      setLivePreview('')
      return
    }
    if (aiOrganizeRef.current) {
      sessionRawRef.current = sessionRawRef.current ? `${sessionRawRef.current} ${t}` : t
    } else {
      ed.chain().focus().insertContent(`${t} `).run()
    }
    interimRef.current = ''
    setLivePreview('')
  }, [])

  const finalizeAfterDictation = useCallback(async () => {
    if (organizingRef.current) return
    const raw = sessionRawRef.current.trim()
    sessionRawRef.current = ''
    if (!raw || !aiOrganizeRef.current) return
    const ed = editorRef.current
    if (!ed) return

    organizingRef.current = true
    showHint('Organizing your dictation into bullets…', 25000)
    try {
      const res = await fetch('/api/notes/format-dictation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: raw }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Request failed')
      if (!data.html) throw new Error('No HTML returned')
      ed.chain().focus().insertContent(`${data.html}<p></p>`).run()
      showHint('Inserted bullet notes from your dictation.', 5000)
    } catch {
      ed.chain().focus().insertContent(`<p>${escapeHtml(raw)}</p>`).run()
      showHint('AI organizer failed — pasted your raw dictation as plain text.', 8000)
    } finally {
      organizingRef.current = false
    }
  }, [showHint])

  finalizeAfterDictationRef.current = finalizeAfterDictation

  const startRecognition = useCallback(() => {
    if (!editor || !supported) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'

    rec.onresult = (e) => {
      const ed = editorRef.current
      let chunkInterim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const piece = r[0]?.transcript ?? ''
        if (r.isFinal) {
          const t = piece.trim()
          if (t && ed) {
            if (aiOrganizeRef.current) {
              sessionRawRef.current = sessionRawRef.current ? `${sessionRawRef.current} ${t}` : t
            } else {
              ed.chain().focus().insertContent(`${t} `).run()
            }
          }
          interimRef.current = ''
          setLivePreview('')
        } else {
          chunkInterim += piece
        }
      }
      if (chunkInterim) {
        interimRef.current = chunkInterim
        setLivePreview(chunkInterim.trim())
      }
    }

    rec.onerror = (ev) => {
      if (ev.error === 'aborted') return
      if (ev.error === 'network' && !sessionNetworkRetriedRef.current) {
        sessionNetworkRetriedRef.current = true
        listeningRef.current = false
        setListening(false)
        skipFinalizeOnEndRef.current = true
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
        showHint('Retrying voice after a network hiccup…', 2500)
        setTimeout(() => {
          startRecognitionRef.current?.()
        }, 600)
        return
      }
      listeningRef.current = false
      setListening(false)
      recRef.current = null
      interimRef.current = ''
      setLivePreview('')
      if (ev.error === 'not-allowed') {
        showHint('Microphone blocked — allow the mic for this site in the browser lock icon / site settings.', 9000)
      } else if (ev.error === 'no-speech') {
        showHint('No speech detected. Click the mic, wait for “Listening”, then speak clearly.', 5000)
      } else if (ev.error === 'network') {
        showHint(
          'Voice service unreachable (Chromium uses Google online). Try: Wi‑Fi on, VPN/ad‑block off, or another network. Must be HTTPS or localhost.',
          12000
        )
      } else {
        showHint(`Voice stopped: ${ev.error}`, 6000)
      }
    }

    rec.onend = () => {
      flushInterimToBufferOrEditor()
      listeningRef.current = false
      setListening(false)
      recRef.current = null
      interimRef.current = ''
      setLivePreview('')
      const skipFinalize = skipFinalizeOnEndRef.current
      skipFinalizeOnEndRef.current = false
      if (!skipFinalize) {
        void finalizeAfterDictationRef.current()
      }
    }

    recRef.current = rec
    try {
      sessionRawRef.current = ''
      rec.start()
      listeningRef.current = true
      setListening(true)
      if (aiOrganizeRef.current) {
        showHint(
          'Listening… With AI bullets on, nothing is inserted until you stop the mic — then your speech becomes a tidy list.',
          6500
        )
      } else {
        showHint('Listening… speak naturally. Live preview below; text commits when you pause or stop the mic.', 5500)
      }
    } catch {
      listeningRef.current = false
      setListening(false)
      showHint('Could not start the microphone — check permissions and reload.', 6000)
      recRef.current = null
    }
  }, [editor, supported, showHint, flushInterimToBufferOrEditor])

  const startRecognitionRef = useRef(startRecognition)
  startRecognitionRef.current = startRecognition

  const toggleAiOrganize = useCallback(() => {
    if (!supported || listening) return
    setAiOrganize((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LS_DICTATION_AI, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [supported, listening])

  const toggle = useCallback(() => {
    if (!editor || !supported) return

    if (listeningRef.current && recRef.current) {
      flushInterimToBufferOrEditor()
      try {
        recRef.current.stop()
      } catch {
        /* ignore */
      }
      listeningRef.current = false
      recRef.current = null
      setListening(false)
      setLivePreview('')
      sessionNetworkRetriedRef.current = false
      return
    }

    sessionNetworkRetriedRef.current = false
    startRecognition()
  }, [editor, supported, startRecognition, flushInterimToBufferOrEditor])

  if (!editor) return null

  const aiTitle = !supported
    ? supportNote
    : listening
      ? 'Cannot change AI mode while the mic is on.'
      : !aiConfigured
        ? 'Click for help — server needs GEMINI_API_KEY in .env.local, then restart dev and reload.'
        : aiOrganize
          ? 'AI bullet organizer is on — stop the mic to insert a tidy bullet list.'
          : 'Turn on AI bullet organizer — speech is shaped into bullets when you stop the mic.'

  const micTitle = !supported
    ? supportNote || 'Dictation not available in this browser or page context.'
    : listening
      ? aiOrganize
        ? 'Stop dictation — runs the AI organizer and inserts bullets'
        : 'Stop dictation (inserts any words still in preview)'
      : aiOrganize
        ? 'Dictate — text is buffered; bullets are inserted when you stop the mic'
        : 'Dictate — speak to type at the cursor (Chrome/Edge/Safari; needs network in Chromium)'

  return (
    <>
      <span className="re-dictation-cluster">
        <Btn
          onClick={toggleAiOrganize}
          active={aiOrganize}
          disabled={!supported || listening}
          title={aiTitle}
        >
          <Sparkles size={14} />
        </Btn>
        <Btn onClick={toggle} active={listening} disabled={!supported} title={micTitle}>
          {!supported ? <MicOff size={14} /> : <Mic size={14} />}
        </Btn>
      </span>
      {(hint || livePreview) ? (
        <span className="re-dictation-hint" role="status">
          {hint ? <span className="re-dictation-hint-line">{hint}</span> : null}
          {livePreview ? (
            <span className="re-dictation-preview" key="preview">
              Preview: {livePreview}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )
}

/* ─── Main Toolbar ───────────────────────────────────────────────────────── */

function Toolbar({ editor }) {
  if (!editor) return null

  const currentTextColor   = editor.getAttributes('textStyle').color
  const currentHighlight   = editor.getAttributes('highlight').color

  return (
    <div className="re-toolbar" role="toolbar" aria-label="Text formatting">
      {/* Undo / Redo */}
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
        <Undo2 size={14} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
        <Redo2 size={14} />
      </Btn>

      <Divider />

      {/* Inline styles */}
      <Btn onClick={() => editor.chain().focus().toggleBold().run()}          active={editor.isActive('bold')}          title="Bold (Ctrl+B)">         <Bold size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()}        active={editor.isActive('italic')}        title="Italic (Ctrl+I)">       <Italic size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleUnderline().run()}     active={editor.isActive('underline')}     title="Underline (Ctrl+U)">    <Underline size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()}        active={editor.isActive('strike')}        title="Strikethrough">         <Strikethrough size={14} /></Btn>

      <Divider />

      {/* Headings */}
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 size={14} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 size={14} />
      </Btn>
      <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 size={14} />
      </Btn>

      <Divider />

      {/* Lists & blocks */}
      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()}    active={editor.isActive('bulletList')}    title="Bullet list">           <List size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()}   active={editor.isActive('orderedList')}   title="Numbered list">         <ListOrdered size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()}    active={editor.isActive('blockquote')}    title="Block quote">           <Quote size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleCodeBlock().run()}     active={editor.isActive('codeBlock')}     title="Code block">            <Code2 size={14} /></Btn>

      <Divider />

      {/* Alignment */}
      <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()}   active={editor.isActive({ textAlign: 'left' })}   title="Align left">   <AlignLeft size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center"> <AlignCenter size={14} /></Btn>
      <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()}  active={editor.isActive({ textAlign: 'right' })}  title="Align right">  <AlignRight size={14} /></Btn>

      <Divider />

      {/* Color & highlight */}
      <ColorPicker
        type="text"
        currentColor={currentTextColor}
        onSelect={(c) => c
          ? editor.chain().focus().setColor(c).run()
          : editor.chain().focus().unsetColor().run()
        }
      />
      <ColorPicker
        type="highlight"
        currentColor={currentHighlight}
        onSelect={(c) => editor.chain().focus().toggleHighlight({ color: c }).run()}
      />

      <Divider />

      <DictationButton editor={editor} />
    </div>
  )
}

/* ─── NotesEditor ────────────────────────────────────────────────────────── */

export default function NotesEditor({ value, onChange }) {
  const { html: initHtml, images: initImages } = parseNotes(value)
  const [images, setImages]       = useState(initImages)
  const [activeIdx, setActiveIdx] = useState(0)
  const [dragging, setDragging]   = useState(false)
  const fileRef   = useRef()
  const imagesRef = useRef(initImages)

  const emitHtml = useCallback((html, imgs) => {
    onChange({ target: { value: serialize(html, imgs) } })
  }, [onChange])

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder:
          'Write your journal entry…\n\nPre-trade thesis · execution · review — or use the mic in the toolbar to dictate (sparkles = AI bullet list when you stop).',
      }),
    ],
    content: initHtml,
    immediatelyRender: false,
    onUpdate({ editor }) {
      emitHtml(editor.getHTML(), imagesRef.current)
    },
    editorProps: {
      attributes: { class: 're-editor-content' },
    },
  })

  const readFiles = useCallback((files) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (evt) => {
        setImages((prev) => {
          const next = [...prev, evt.target.result]
          imagesRef.current = next
          setActiveIdx(next.length - 1)
          emitHtml(editor?.getHTML() || '', next)
          return next
        })
      }
      reader.readAsDataURL(file)
    })
  }, [editor, emitHtml])

  const removeImage = (idx) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx)
      imagesRef.current = next
      setActiveIdx((cur) => {
        if (next.length === 0) return 0
        if (cur > idx) return cur - 1
        if (cur === idx) return Math.min(cur, next.length - 1)
        return cur
      })
      emitHtml(editor?.getHTML() || '', next)
      return next
    })
  }

  const moveImageEarlier = useCallback(() => {
    const i = activeIdx
    if (i <= 0) return
    setImages((prev) => {
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      imagesRef.current = next
      emitHtml(editor?.getHTML() || '', next)
      return next
    })
    setActiveIdx(i - 1)
  }, [activeIdx, editor, emitHtml])

  const moveImageLater = useCallback(() => {
    const i = activeIdx
    if (i >= images.length - 1) return
    setImages((prev) => {
      const next = [...prev]
      ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
      imagesRef.current = next
      emitHtml(editor?.getHTML() || '', next)
      return next
    })
    setActiveIdx(i + 1)
  }, [activeIdx, editor, emitHtml, images.length])

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const imgs  = items.filter(it => it.type.startsWith('image/'))
    if (imgs.length === 0) return
    e.preventDefault()
    imgs.forEach(it => { const f = it.getAsFile(); if (f) readFiles([f]) })
  }, [readFiles])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    readFiles(e.dataTransfer.files)
  }

  const prev = () => setActiveIdx(i => Math.max(0, i - 1))
  const next = () => setActiveIdx(i => Math.min(images.length - 1, i + 1))

  return (
    <div
      className={`notes-editor${dragging ? ' notes-editor--dragging' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Toolbar */}
      <Toolbar editor={editor} />

      {/* Chart screenshot zone */}
      <div className="notes-chart-zone">
        {images.length === 0 ? (
          <button
            type="button"
            className="notes-chart-empty"
            onClick={() => fileRef.current?.click()}
            aria-label="Add chart screenshot"
          >
            <div className="notes-chart-empty-icon"><ImagePlus size={26} /></div>
            <span className="notes-chart-empty-title">Add chart screenshot</span>
            <span className="notes-chart-empty-hint">Drag &amp; drop · paste · click to browse</span>
          </button>
        ) : (
          <div className="notes-chart-viewer">
            <img src={images[activeIdx]} alt={`Chart ${activeIdx + 1}`} className="notes-chart-img" />
            {images.length > 1 && (
              <>
                <button type="button" className="notes-chart-nav notes-chart-nav--prev" onClick={prev} disabled={activeIdx === 0}><ChevronLeft size={18} /></button>
                <button type="button" className="notes-chart-nav notes-chart-nav--next" onClick={next} disabled={activeIdx === images.length - 1}><ChevronRight size={18} /></button>
              </>
            )}
            <div className="notes-chart-controls">
              {images.length > 1 && <span className="notes-chart-counter">{activeIdx + 1} / {images.length}</span>}
              {images.length > 1 && (
                <span className="notes-chart-reorder" role="group" aria-label="Reorder charts">
                  <button
                    type="button"
                    className="notes-chart-btn notes-chart-btn--icon"
                    onClick={moveImageEarlier}
                    disabled={activeIdx === 0}
                    title="Move earlier in order"
                    aria-label="Move chart earlier in order"
                  >
                    <ChevronUp size={14} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="notes-chart-btn notes-chart-btn--icon"
                    onClick={moveImageLater}
                    disabled={activeIdx === images.length - 1}
                    title="Move later in order"
                    aria-label="Move chart later in order"
                  >
                    <ChevronDown size={14} aria-hidden />
                  </button>
                </span>
              )}
              <button type="button" className="notes-chart-btn" onClick={() => fileRef.current?.click()}><Plus size={12} /> Add</button>
              <button type="button" className="notes-chart-btn notes-chart-btn--danger" onClick={() => removeImage(activeIdx)}><X size={12} /> Remove</button>
            </div>
            {images.length > 1 && (
              <div className="notes-chart-thumbs">
                {images.map((src, i) => (
                  <button key={i} type="button" className={`notes-chart-thumb${i === activeIdx ? ' notes-chart-thumb--active' : ''}`} onClick={() => setActiveIdx(i)}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rich text area */}
      <EditorContent editor={editor} />

      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { readFiles(e.target.files); e.target.value = '' }} />
    </div>
  )
}

/* ─── NotesDisplay (read-only + lightbox) ────────────────────────────────── */

export function NotesDisplay({ value }) {
  const [lightbox, setLightbox]   = useState(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const { html, images } = parseNotes(value)

  if (!html && images.length === 0) return null

  const prev = () => setActiveIdx(i => Math.max(0, i - 1))
  const next = () => setActiveIdx(i => Math.min(images.length - 1, i + 1))

  return (
    <div className="notes-display">
      {images.length > 0 && (
        <div className="notes-display-chart-zone">
          <div className="notes-display-chart-viewer">
            <img src={images[activeIdx]} alt={`Chart ${activeIdx + 1}`} className="notes-display-chart-img" onClick={() => setLightbox(images[activeIdx])} />
            <button type="button" className="notes-display-zoom-btn" onClick={() => setLightbox(images[activeIdx])} aria-label="View fullscreen"><ZoomIn size={15} /></button>
            {images.length > 1 && (
              <>
                <button type="button" className="notes-chart-nav notes-chart-nav--prev" onClick={prev} disabled={activeIdx === 0}><ChevronLeft size={18} /></button>
                <button type="button" className="notes-chart-nav notes-chart-nav--next" onClick={next} disabled={activeIdx === images.length - 1}><ChevronRight size={18} /></button>
                <div className="notes-chart-controls"><span className="notes-chart-counter">{activeIdx + 1} / {images.length}</span></div>
                <div className="notes-chart-thumbs">
                  {images.map((src, i) => (
                    <button key={i} type="button" className={`notes-chart-thumb${i === activeIdx ? ' notes-chart-thumb--active' : ''}`} onClick={() => setActiveIdx(i)}>
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {html && (
        <div className="notes-display-text re-editor-content" dangerouslySetInnerHTML={{ __html: html }} />
      )}

      {lightbox && (
        <div className="notes-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="notes-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close"><X size={20} /></button>
          <img src={lightbox} alt="Chart fullscreen" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
