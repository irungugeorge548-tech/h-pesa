import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GREETING, reply, byQuestion } from '../lib/bot'

// Floating help bot on the home screen. Written answers (no AI): it understands greetings, thanks and the app's topics.
export default function ChatBot({ name = '' }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [chips, setChips] = useState([])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef()
  useEffect(() => { if (open && msgs.length === 0) { const r = reply('hi'); setMsgs([{ from: 'bot', text: GREETING(name) }]); setChips(r.chips) } }, [open]) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing, open])
  const ask = (q) => {
    if (q === 'Talk to support') return
    setMsgs(m => [...m, { from: 'me', text: q }]); setChips([]); setTyping(true)
    const t = byQuestion(q); const r = t ? { text: t.a, chips: [] } : reply(q)
    setTimeout(() => { setTyping(false); setMsgs(m => [...m, { from: 'bot', text: r.text }]); setChips(r.chips) }, 700)
  }
  const send = (e) => { e.preventDefault(); if (!text.trim() || typing) return; ask(text.trim()); setText('') }
  return (
    <>
      {!open && <button type="button" onClick={() => setOpen(true)} aria-label="Chat with the Haraka assistant" className="fixed right-4 bottom-24 z-[1500] w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center touch-manipulation">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.800-5A8 8 0 1 1 21 12z" /><path d="M8.500 11.500h.01M12 11.500h.01M15.500 11.500h.01" /></svg>
      </button>}
      {open && (
        <div className="fixed inset-0 z-[3500] bg-black/40 flex items-end" onClick={() => setOpen(false)}>
          <div className="bg-white w-full h-[82vh] rounded-t-3xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-primary text-white px-5 py-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-extrabold">H</span>
              <div className="flex-1"><p className="font-bold leading-tight">Haraka assistant</p><p className="text-xs text-white/80 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-300" />Online</p></div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="w-10 h-10 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
              {msgs.map((m, i) => <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}><p className={`text-sm rounded-2xl px-3.5 py-2.5 max-w-[82%] whitespace-pre-wrap ${m.from === 'me' ? 'bg-primary text-white rounded-br-md' : 'bg-white border rounded-bl-md'}`}>{m.text}</p></div>)}
              {typing && <div className="flex"><p className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 text-gray-400 tracking-widest animate-pulse">•••</p></div>}
              <div ref={end} />
            </div>
            <div className="px-4 pt-2 flex gap-2 overflow-x-auto">
              {chips.map(c => c === 'Talk to support'
                ? <Link key={c} to="/support" onClick={() => setOpen(false)} className="flex-shrink-0 text-xs bg-primary text-white rounded-full px-3 py-2">{c}</Link>
                : <button key={c} onClick={() => ask(c)} className="flex-shrink-0 text-xs border border-primary text-primary rounded-full px-3 py-2">{c}</button>)}
            </div>
            <form onSubmit={send} className="p-3 flex gap-2 border-t mt-2">
              <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message" className="flex-1 px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary" />
              <button className="bg-primary text-white rounded-full px-5 font-semibold" disabled={typing}>Send</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
