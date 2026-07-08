// Web Speech API wrapper: push-to-talk transcription into a text state.
// Review-before-send is the product rule, so "good enough to edit" is
// the accuracy bar. Typing stays as the universal fallback.
import { useEffect, useRef, useState } from 'react'

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

export const speechSupported = () => Boolean(SR)

export function useSpeech({ lang = 'zh-CN', onFinal }) {
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  useEffect(() => () => recRef.current?.abort?.(), [])

  const stop = () => {
    recRef.current?.stop?.()
    setListening(false)
    setInterim('')
  }

  const start = () => {
    if (!SR || listening) return
    const rec = new SR()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = e => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) onFinalRef.current?.(res[0].transcript)
        else interimText += res[0].transcript
      }
      setInterim(interimText)
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    rec.onerror = () => {
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  return { supported: Boolean(SR), listening, interim, start, stop }
}

/* ---------- ASR pain sensor: transcript edit rate ---------- */
// logAsrSample(rawTranscript, sentText) accumulates a local counter so
// we can decide later whether cloud ASR is worth it (P1.5 trigger).
const ASR_KEY = 'rs-asr-editrate'

function editDistanceRatio(a, b) {
  if (!a || !b) return a === b ? 0 : 1
  const m = a.length
  const n = b.length
  if (Math.max(m, n) > 800) return a === b ? 0 : 0.5 // cap cost on long answers
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return dp[m][n] / Math.max(m, n)
}

export function logAsrSample(rawTranscript, sentText) {
  try {
    const cur = JSON.parse(localStorage.getItem(ASR_KEY) || '{"samples":0,"ratioSum":0}')
    cur.samples += 1
    cur.ratioSum += editDistanceRatio(rawTranscript.trim(), sentText.trim())
    localStorage.setItem(ASR_KEY, JSON.stringify(cur))
  } catch {
    /* telemetry only */
  }
}
