import { useRef, useState, useCallback } from 'react'
import { getQuestionBank, formatQuestionsForPrompt } from './questionBanks'
import { generateInterviewIntroduction, INTERVIEWER_NAME } from './utils/interviewIntroduction'

/**
 * AssemblyAI Voice Agent hook.
 * session.update format matches current Voice Agent API.
 * Includes client-side WebSocket reconnect / session recovery.
 * @see https://www.assemblyai.com/docs/voice-agents/speech-to-speech
 */
export function useVoiceAgent() {
  const socketRef = useRef(null)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const workletNodeRef = useRef(null)
  const sourceRef = useRef(null)
  const silentGainRef = useRef(null)
  const pausedRef = useRef(false)
  const intentionalStopRef = useRef(false)
  const interviewActiveRef = useRef(false)
  const reconnectAttemptRef = useRef(0)
  const reconnectTimerRef = useRef(null)
  const reconnectInProgressRef = useRef(false)
  const reconnectGenerationRef = useRef(0)
  const startOptionsRef = useRef(null)
  const conversationContextRef = useRef([]) // {role:'user'|'assistant', text}
  const usedQuestionIdsRef = useRef(new Set())

  const nextPlayTimeRef = useRef(0)
  const playbackSourcesRef = useRef(new Set())

  const [connected, setConnected] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [agentText, setAgentText] = useState('')
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('idle') // idle|connected|lost|reconnecting|restored|failed|ended

  const MAX_RECONNECT = 5
  const BASE_DELAY_MS = 1200

  const stopPlayback = useCallback(() => {
    playbackSourcesRef.current.forEach((source) => {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
      try {
        source.disconnect()
      } catch {
        /* already disconnected */
      }
    })
    playbackSourcesRef.current.clear()
    if (audioContextRef.current) {
      nextPlayTimeRef.current = audioContextRef.current.currentTime
    } else {
      nextPlayTimeRef.current = 0
    }
  }, [])

  const cleanupSocketOnly = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (socketRef.current) {
      const s = socketRef.current
      socketRef.current = null
      try {
        s.onopen = null
        s.onmessage = null
        s.onerror = null
        s.onclose = null
        if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
          s.close()
        }
      } catch {
        /* ignore */
      }
    }
  }, [])

  const cleanupMicAndAudio = useCallback(() => {
    stopPlayback()
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect()
      } catch {
        /* ignore */
      }
      workletNodeRef.current = null
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect()
      } catch {
        /* ignore */
      }
      sourceRef.current = null
    }
    if (silentGainRef.current) {
      try {
        silentGainRef.current.disconnect()
      } catch {
        /* ignore */
      }
      silentGainRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [stopPlayback])

  const playAudio = async (base64Audio) => {
    try {
      if (pausedRef.current) return
      if (!audioContextRef.current) return

      const audioContext = audioContextRef.current
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      if (bytes.length < 2) return

      const pcm16 = new Int16Array(
        bytes.buffer,
        bytes.byteOffset,
        Math.floor(bytes.byteLength / 2)
      )

      const audioBuffer = audioContext.createBuffer(1, pcm16.length, 24000)
      const channelData = audioBuffer.getChannelData(0)
      for (let i = 0; i < pcm16.length; i++) {
        channelData[i] = pcm16[i] / 32768
      }

      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      playbackSourcesRef.current.add(source)
      source.onended = () => {
        playbackSourcesRef.current.delete(source)
      }

      const now = audioContext.currentTime
      if (nextPlayTimeRef.current < now) {
        nextPlayTimeRef.current = now
      }
      source.start(nextPlayTimeRef.current)
      nextPlayTimeRef.current += audioBuffer.duration
    } catch (err) {
      console.error('[Intervia Voice] Audio playback error:', err)
    }
  }

  const startMicrophone = async (socket) => {
    try {
      // Reuse existing stream if tracks still live
      let stream = streamRef.current
      if (!stream || stream.getTracks().every((t) => t.readyState === 'ended')) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        streamRef.current = stream
      } else {
        stream.getTracks().forEach((t) => {
          t.enabled = !pausedRef.current
        })
      }

      let audioContext = audioContextRef.current
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContext({ sampleRate: 24000 })
        audioContextRef.current = audioContext
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Disconnect previous worklet graph if any
      if (workletNodeRef.current) {
        try {
          workletNodeRef.current.disconnect()
        } catch {
          /* ignore */
        }
        workletNodeRef.current = null
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect()
        } catch {
          /* ignore */
        }
        sourceRef.current = null
      }

      const workletCode = `
        class PCMProcessor extends AudioWorkletProcessor {
          process(inputs) {
            const input = inputs[0]
            if (input && input[0]) {
              const channel = input[0]
              const pcm16 = new Int16Array(channel.length)
              for (let i = 0; i < channel.length; i++) {
                const sample = Math.max(-1, Math.min(1, channel[i]))
                pcm16[i] = sample < 0 ? sample * 32768 : sample * 32767
              }
              this.port.postMessage(pcm16.buffer, [pcm16.buffer])
            }
            return true
          }
        }
        registerProcessor('pcm-processor', PCMProcessor)
      `

      const blob = new Blob([workletCode], { type: 'application/javascript' })
      const workletUrl = URL.createObjectURL(blob)
      await audioContext.audioWorklet.addModule(workletUrl)
      URL.revokeObjectURL(workletUrl)

      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor')
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (event) => {
        if (pausedRef.current) return
        if (!interviewActiveRef.current) return
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

        const pcm16 = new Int16Array(event.data)
        const bytes = new Uint8Array(pcm16.buffer)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const base64Audio = btoa(binary)

        try {
          socketRef.current.send(
            JSON.stringify({
              type: 'input.audio',
              audio: base64Audio,
            })
          )
        } catch {
          /* socket may have closed */
        }
      }

      source.connect(workletNode)

      const silentGain = audioContext.createGain()
      silentGain.gain.value = 0
      silentGainRef.current = silentGain
      workletNode.connect(silentGain)
      silentGain.connect(audioContext.destination)

      console.log('[Intervia Voice] Microphone started')
    } catch (err) {
      console.error('[Intervia Voice] Microphone error:', err)
      setError(
        'Microphone access is required for the voice interview. Please allow microphone access and try again.'
      )
    }
  }

  const buildSystemPrompt = (role, options = {}, isReconnect = false) => {
    const durationMin = options.duration || 20
    const interviewType = options.interviewType || 'Mixed'
    const difficulty = options.difficulty || 'Intermediate'
    const resumeText = options.resumeText || ''
    const bank = getQuestionBank(role, interviewType, difficulty)
    const questionsBlock = formatQuestionsForPrompt(bank, 12)
    const firstQ = bank.questions?.[0]?.text || ''
    const { personaPrompt } = generateInterviewIntroduction({
      role,
      interviewType,
      difficulty,
      resumeContext: resumeText,
      firstQuestion: firstQ,
    })

    let resumeBlock = ''
    if (resumeText && resumeText.trim().length > 40) {
      const clipped = resumeText.trim().slice(0, 3500)
      resumeBlock = `
Candidate resume excerpt (use only what is written here; never invent experience; if something is unclear, ask about it):
---
${clipped}
---
Ask relevant questions about projects, skills, education, technologies, and responsibilities mentioned above when appropriate.
`.trim()
    }

    let recoveryBlock = ''
    if (isReconnect) {
      const ctx = conversationContextRef.current.slice(-12)
      const summary =
        ctx.length > 0
          ? ctx.map((c) => `${c.role === 'user' ? 'Candidate' : 'Interviewer'}: ${c.text}`).join('\n')
          : '(no prior turns captured)'
      recoveryBlock = `
SESSION RECOVERY: The connection was briefly lost and has been restored.
Continue the SAME interview from where you left off as ${INTERVIEWER_NAME}.
Do NOT repeat the introduction or greeting.
Do NOT restart the interview.
Do NOT ask questions already covered.
Brief conversation context so far:
${summary}
Resume naturally with the next appropriate question or acknowledgment.
`.trim()
    }

    return `
${personaPrompt}

Interview configuration:
- Role: ${role}
- Type: ${interviewType}
- Difficulty: ${difficulty}
- Scheduled duration: about ${durationMin} minutes

Interview flow rules:
1. After your opening (delivered as the session greeting), move into the first curated question with a natural transition — never announce "I will now ask the first question."
2. Wait for the candidate to fully finish speaking before responding. Candidates often pause to think — do not treat short pauses as the end of their answer.
3. Ask brief relevant follow-ups when useful, then continue with the next curated question.
4. Stay focused on the ${role} interview. If the candidate goes clearly off-topic, redirect politely in one short sentence.
5. Do not give away correct answers during the interview.
6. Match difficulty: ${difficulty}. Beginner = accessible; Advanced = deeper.
7. Near the end of time, briefly note that you have one last question.
8. When time is up, thank them briefly and note that the scheduled time has ended.
9. Never invent facts about the candidate. Never claim they performed well during the conversation.
10. Keep spoken responses concise and natural.
11. Prefer the curated question bank below. Ask one at a time; do not repeat questions already asked.

${questionsBlock}

${resumeBlock}

${recoveryBlock}
`.trim()
  }

  const buildGreeting = (role, options = {}) => {
    const interviewType = options.interviewType || 'Mixed'
    const difficulty = options.difficulty || 'Intermediate'
    const resumeText = options.resumeText || ''
    const bank = getQuestionBank(role, interviewType, difficulty)
    const firstQ = bank.questions?.[0]?.text || ''
    const { greeting, firstQuestionHint } = generateInterviewIntroduction({
      role,
      interviewType,
      difficulty,
      resumeContext: resumeText,
      firstQuestion: firstQ,
    })
    // Greeting includes natural intro; append first question so the session opens and starts the interview
    if (firstQuestionHint && !greeting.includes(firstQuestionHint.slice(0, 40))) {
      return `${greeting} ${firstQuestionHint}`
    }
    return greeting
  }

  const releaseReconnectLock = () => {
    reconnectInProgressRef.current = false
  }

  const attachSocketHandlers = (socket, role, options, isReconnect) => {
    socket.onopen = () => {
      console.log(
        '[Intervia Voice] Connected to AssemblyAI Voice Agent',
        isReconnect ? '(reconnect)' : '(fresh)'
      )

      // Stale socket guard: interview may have ended while token/socket was in flight
      if (intentionalStopRef.current || !interviewActiveRef.current) {
        try {
          socket.close()
        } catch {
          /* ignore */
        }
        return
      }

      const systemPrompt = buildSystemPrompt(role, options, isReconnect)
      // On reconnect, omit greeting so the AI does not repeat the introduction
      const greeting = isReconnect ? '' : buildGreeting(role, options)

      const sessionUpdate = {
        type: 'session.update',
        session: {
          system_prompt: systemPrompt,
          ...(greeting ? { greeting } : {}),
          input: {
            format: { encoding: 'audio/pcm' },
            turn_detection: {
              vad_threshold: 0.5,
              // Interview candidates pause to think; 700ms was too aggressive and
              // split single answers into multiple finalized user turns.
              min_silence: 1100,
              max_silence: 3200,
              interrupt_response: true,
            },
          },
          output: {
            voice: 'anna',
            format: { encoding: 'audio/pcm' },
          },
        },
      }

      console.log('[Intervia Voice] Sending session.update', isReconnect ? '(recovery)' : '')
      try {
        socket.send(JSON.stringify(sessionUpdate))
      } catch (err) {
        console.error('[Intervia Voice] Failed to send session.update', err)
      }
    }

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('[Intervia Voice] AssemblyAI:', message.type)

        if (message.type === 'session.ready') {
          // Abort if user ended interview while this recovery socket was coming up
          if (intentionalStopRef.current || !interviewActiveRef.current) {
            try {
              socket.close()
            } catch {
              /* ignore */
            }
            releaseReconnectLock()
            return
          }
          setConnected(true)
          setConnectionStatus(isReconnect ? 'restored' : 'connected')
          reconnectAttemptRef.current = 0
          releaseReconnectLock()
          await startMicrophone(socket)
        }

        if (message.type === 'session.updated') {
          console.log('[Intervia Voice] Session configured')
        }

        if (message.type === 'transcript.user') {
          // Finalized user turn (not a streaming draft). Log full payload once
          // so we can inspect turn/sequence ids if AssemblyAI provides them.
          console.log('[Intervia Voice] transcript.user payload:', message)
          if (!pausedRef.current) {
            const text = message.text || ''
            setTranscript(text)
            // Append consecutive user turns — do not overwrite. Pauses mid-answer
            // produce separate finalized turns; overwriting discarded the first half.
            if (text.trim().length > 2) {
              const last = conversationContextRef.current[conversationContextRef.current.length - 1]
              if (last && last.role === 'user') {
                const merged = `${last.text} ${text}`.trim()
                if (merged !== last.text) last.text = merged
              } else {
                conversationContextRef.current.push({ role: 'user', text })
              }
            }
          }
        }

        if (message.type === 'transcript.agent') {
          const text = message.text || ''
          setAgentText(text)
          if (text.trim().length > 2) {
            const last = conversationContextRef.current[conversationContextRef.current.length - 1]
            if (last && last.role === 'assistant') {
              last.text = text
            } else {
              conversationContextRef.current.push({ role: 'assistant', text })
            }
          }
        }

        if (message.type === 'reply.audio') {
          if (message.data && !pausedRef.current) {
            await playAudio(message.data)
          }
        }

        if (message.type === 'reply.done') {
          if (message.status === 'interrupted') {
            stopPlayback()
          }
        }

        if (message.type === 'session.error') {
          console.error('[Intervia Voice] session.error FULL:', message)
          // During recovery, clean up this failed socket and let retry continue
          if (isReconnect && interviewActiveRef.current && !intentionalStopRef.current) {
            try {
              if (socketRef.current === socket) {
                socketRef.current = null
              }
              socket.onopen = null
              socket.onmessage = null
              socket.onerror = null
              socket.onclose = null
              if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close()
              }
            } catch {
              /* ignore */
            }
            releaseReconnectLock()
            // Allow the scheduled retry path to continue (do not permanently fail yet)
            scheduleReconnect(role, options)
            return
          }
          setError(
            message.message ||
              message.error ||
              'AssemblyAI session error. Check session.update format and API key.'
          )
        }
      } catch (err) {
        console.error('[Intervia Voice] Message processing error:', err)
      }
    }

    socket.onerror = () => {
      if (!intentionalStopRef.current) {
        setError('Could not connect to AssemblyAI. Check your network and API key.')
      }
    }

    socket.onclose = () => {
      console.log('[Intervia Voice] AssemblyAI connection closed')
      setConnected(false)

      // Intentional end — do not reconnect
      if (intentionalStopRef.current || !interviewActiveRef.current) {
        setConnectionStatus((prev) => (prev === 'ended' ? prev : 'ended'))
        releaseReconnectLock()
        return
      }

      // Socket died (including a failed recovery socket before session.ready).
      // Release lock so the next attempt can run; never leave reconnect stuck.
      releaseReconnectLock()
      setConnectionStatus('lost')
      scheduleReconnect(role, options)
    }
  }

  const scheduleReconnect = (role, options) => {
    if (intentionalStopRef.current || !interviewActiveRef.current) return
    // Single-flight: do not start another reconnect while one is in progress
    if (reconnectInProgressRef.current) return
    // Already waiting on a timer — do not stack another attempt
    if (reconnectTimerRef.current) return
    if (reconnectAttemptRef.current >= MAX_RECONNECT) {
      setConnectionStatus('failed')
      setError(
        'Unable to reconnect. Your transcript so far has been preserved. You can try again or end the interview and view results.'
      )
      releaseReconnectLock()
      return
    }

    const attempt = reconnectAttemptRef.current + 1
    reconnectAttemptRef.current = attempt
    // ~1.2s, 2s, 3.2s, 5s, 8s
    const delay = Math.min(10000, Math.round(BASE_DELAY_MS * Math.pow(1.6, attempt - 1)))
    setConnectionStatus('reconnecting')
    console.log(`[Intervia Voice] Reconnect attempt ${attempt}/${MAX_RECONNECT} in ${delay}ms`)

    const generation = reconnectGenerationRef.current
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null
      if (intentionalStopRef.current || !interviewActiveRef.current) return
      if (generation !== reconnectGenerationRef.current) return
      attemptReconnect(role, options, generation)
    }, delay)
  }

  const attemptReconnect = async (role, options, generation) => {
    if (intentionalStopRef.current || !interviewActiveRef.current) return
    if (generation != null && generation !== reconnectGenerationRef.current) return
    // Single active reconnect process
    if (reconnectInProgressRef.current) return
    reconnectInProgressRef.current = true

    cleanupSocketOnly()

    try {
      let response
      try {
        response = await fetch('http://localhost:3001/api/voice-token')
      } catch {
        releaseReconnectLock()
        if (intentionalStopRef.current || !interviewActiveRef.current) return
        if (generation != null && generation !== reconnectGenerationRef.current) return
        scheduleReconnect(role, options)
        return
      }

      // Re-check after async token request (user may have clicked End Interview)
      if (intentionalStopRef.current || !interviewActiveRef.current) {
        releaseReconnectLock()
        return
      }
      if (generation != null && generation !== reconnectGenerationRef.current) {
        releaseReconnectLock()
        return
      }

      if (!response.ok) {
        releaseReconnectLock()
        scheduleReconnect(role, options)
        return
      }
      const { token } = await response.json()

      // Final guard before creating socket
      if (intentionalStopRef.current || !interviewActiveRef.current) {
        releaseReconnectLock()
        return
      }
      if (generation != null && generation !== reconnectGenerationRef.current) {
        releaseReconnectLock()
        return
      }

      const socket = new WebSocket(`wss://agents.assemblyai.com/v1/ws?token=${token}`)
      socketRef.current = socket
      attachSocketHandlers(socket, role, options, true)
      // Lock stays held until session.ready or failure paths release it
    } catch (err) {
      console.error('[Intervia Voice] Reconnect error:', err)
      releaseReconnectLock()
      if (intentionalStopRef.current || !interviewActiveRef.current) return
      if (generation != null && generation !== reconnectGenerationRef.current) return
      scheduleReconnect(role, options)
    }
  }

  const start = async (role, options = {}) => {
    try {
      intentionalStopRef.current = false
      interviewActiveRef.current = true
      reconnectAttemptRef.current = 0
      reconnectInProgressRef.current = false
      reconnectGenerationRef.current += 1
      startOptionsRef.current = { role, options }
      conversationContextRef.current = []
      usedQuestionIdsRef.current = new Set()

      setError('')
      setTranscript('')
      setAgentText('')
      setPaused(false)
      pausedRef.current = false
      setConnectionStatus('idle')

      cleanupSocketOnly()
      // Keep audio context if possible; reset mic graph on fresh start
      cleanupMicAndAudio()

      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 })
      }
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      nextPlayTimeRef.current = audioContextRef.current.currentTime

      let response
      try {
        response = await fetch('http://localhost:3001/api/voice-token')
      } catch {
        throw new Error(
          'Cannot reach the Intervia voice server on port 3001. Start the backend (server/) and try again.'
        )
      }

      if (!response.ok) {
        throw new Error(
          'Could not get AssemblyAI token from the voice server. Check ASSEMBLYAI_API_KEY and server logs.'
        )
      }

      // Guard: stop may have been called while token was in flight
      if (intentionalStopRef.current || !interviewActiveRef.current) {
        return
      }

      const { token } = await response.json()

      if (intentionalStopRef.current || !interviewActiveRef.current) {
        return
      }

      const socket = new WebSocket(
        `wss://agents.assemblyai.com/v1/ws?token=${token}`
      )
      socketRef.current = socket
      attachSocketHandlers(socket, role, options, false)
    } catch (err) {
      console.error('[Intervia Voice] start error:', err)
      interviewActiveRef.current = false
      releaseReconnectLock()
      setError(err.message || 'Something went wrong starting the interview')
      setConnectionStatus('failed')
    }
  }

  /** Pause: stop sending mic audio + stop AI playback; keep WebSocket open */
  const pause = useCallback(() => {
    pausedRef.current = true
    setPaused(true)
    stopPlayback()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.enabled = false
      })
    }
    console.log('[Intervia Voice] Paused')
  }, [stopPlayback])

  /** Resume: re-enable mic tracks; keep same session */
  const resume = useCallback(() => {
    pausedRef.current = false
    setPaused(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.enabled = true
      })
    }
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume()
    }
    console.log('[Intervia Voice] Resumed')
  }, [])

  const stop = useCallback(() => {
    console.log('[Intervia Voice] Stopping interview...')
    intentionalStopRef.current = true
    interviewActiveRef.current = false
    pausedRef.current = false
    setPaused(false)
    setConnectionStatus('ended')

    // Invalidate any in-flight reconnect generation so pending timers/fetches abort
    reconnectGenerationRef.current += 1
    reconnectInProgressRef.current = false

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    stopPlayback()
    cleanupMicAndAudio()

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    if (socketRef.current) {
      try {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: 'session.end' }))
        }
      } catch {
        /* ignore */
      }
      cleanupSocketOnly()
    }
    setConnected(false)
  }, [stopPlayback, cleanupMicAndAudio, cleanupSocketOnly])

  /** Manual retry after failed reconnect — recovery mode, keep transcript/context */
  const retryReconnect = useCallback(() => {
    const saved = startOptionsRef.current
    if (!saved || intentionalStopRef.current) return

    // Cancel any pending automatic retry
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    // Invalidate previous generation and clear lock so a single new attempt runs
    reconnectGenerationRef.current += 1
    reconnectInProgressRef.current = false
    interviewActiveRef.current = true
    reconnectAttemptRef.current = 0
    setError('')
    setConnectionStatus('reconnecting')

    const generation = reconnectGenerationRef.current
    attemptReconnect(saved.role, saved.options, generation)
  }, [])

  return {
    start,
    stop,
    pause,
    resume,
    retryReconnect,
    connected,
    paused,
    transcript,
    agentText,
    error,
    connectionStatus,
  }
}
