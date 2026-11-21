import { useEffect, useState } from 'react'
import { Screen } from '../components/ui'
import { Cheetah } from '../components/extras'
import { TOPICS, answer } from '../lib/bot'
import { get, post, errMsg } from '../lib/api'
const field = 'w-full px-4 py-3 border rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-primary'

export default function Support() {
  const [chat, setChat] = useState([{ from: 'bot', text: 'Habari! I am the Haraka guide. Pick a topic or type your question. I am not an AI: I give written answers. For anything else, message our team below.' }])
  const [text, setText] = useState('')
  const [sub, setSub] = useState(''); const [msg, setMsg] = useState(''); const [info, setInfo] = useState(''); const [err, setErr] = useState('')
  const [mine, setMine] = useState([])
  const load = () => get('/api/support').then(setMine).catch(() => {})
  useEffect(() => { load() }, [])
  const ask = (q, a) => setChat(c => [...c, { from: 'me', text: q }, { from: 'bot', text: a }])
  const send = (e) => { e.preventDefault(); if (!text.trim()) return; const t = answer(text); ask(text, t ? t.a : 'I do not have a written answer for that yet. Please send a message to our team below and we will reply.'); setText('') }
  const contact = async (e) => {
    e.preventDefault(); setErr(''); setInfo('')
    try { const r = await post('/api/support', { subject: sub, message: msg }); setInfo(r.message); setSub(''); setMsg(''); load() } catch (x) { setErr(errMsg(x)) }
  }
  return (
    <Screen title="Help & Support">
      <div className="bg-white rounded-3xl border shadow-sm p-4">
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {chat.map((m, i) => <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'gap-2'}`}>
            {m.from === 'bot' && <Cheetah size={40} />}
            <p className={`text-sm rounded-2xl px-3 py-2 max-w-[80%] ${m.from === 'me' ? 'bg-primary text-white' : 'bg-gray-100'}`}>{m.text}</p></div>)}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">{TOPICS.map(t => <button key={t.id} onClick={() => ask(t.q, t.a)} className="text-xs border border-primary/40 text-primary rounded-full px-3 py-1.5">{t.q}</button>)}</div>
        <form onSubmit={send} className="flex gap-2 mt-3"><input className={field} placeholder="Type your question" value={text} onChange={e => setText(e.target.value)} /><button className="bg-primary text-white rounded-2xl px-4 font-semibold">Ask</button></form>
      </div>
      <form onSubmit={contact} className="bg-white rounded-3xl border shadow-sm p-4 mt-4 space-y-3">
        <p className="font-bold">Message our team</p>
        {info && <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm">{info}</div>}
        {err && <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">{err}</div>}
        <input className={field} placeholder="Subject" value={sub} onChange={e => setSub(e.target.value)} required />
        <textarea className={field} rows={4} placeholder="Tell us what happened. Never include your PIN or password." value={msg} onChange={e => setMsg(e.target.value)} required />
        <button className="w-full bg-primary text-white py-3 rounded-2xl font-semibold">Send</button>
        {mine.length > 0 && <p className="text-xs text-gray-500">You have sent {mine.length} message(s).</p>}
      </form>
    </Screen>
  )
}
