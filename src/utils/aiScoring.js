/**
 * Client utility for AI interview scoring via the Express backend.
 * Anthropic API key never leaves the server.
 */

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  'http://localhost:3001'

/**
 * @param {{
 *   role: string,
 *   interviewType: string,
 *   difficulty: string,
 *   experienceLevel: string,
 *   messages: Array,
 *   endReason?: string,
 *   actualMinutes?: number,
 *   duration?: number
 * }} data
 * @returns {Promise<object>} Normalized evaluation matching Results page shape
 */
export async function scoreInterviewWithAI(data) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 90000)

  try {
    const response = await fetch(`${API_BASE}/api/score-interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: data.role,
        interviewType: data.interviewType,
        difficulty: data.difficulty,
        experienceLevel: data.experienceLevel,
        messages: data.messages || [],
        endReason: data.endReason,
        actualMinutes: data.actualMinutes,
        duration: data.duration,
      }),
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(payload.error || `Scoring failed (${response.status})`)
    }

    if (typeof payload.overallScore !== 'number') {
      throw new Error('Malformed scoring response')
    }

    return {
      ...payload,
      scoringMethod: 'ai',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
