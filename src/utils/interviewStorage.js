/**
 * Single source of truth for completed interview results (localStorage).
 * Replace with API calls when backend is ready.
 */

const STORAGE_KEY = 'intervia_interviews'

export function getAllInterviews() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function getInterviewById(id) {
  if (!id) return null
  return getAllInterviews().find((item) => item.id === id) || null
}

export function saveInterview(interview) {
  const list = getAllInterviews()
  const existing = list.findIndex((item) => item.id === interview.id)
  let next
  if (existing >= 0) {
    next = [...list]
    next[existing] = interview
  } else {
    next = [interview, ...list]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return interview
}

export function deleteInterview(id) {
  const next = getAllInterviews().filter((item) => item.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function getLatestInterview() {
  const list = getAllInterviews()
  return list[0] || null
}

export function computeAggregateStats(interviews = getAllInterviews()) {
  if (!interviews.length) {
    return {
      totalInterviews: 0,
      averageScore: null,
      bestScore: null,
      latestScore: null,
      technical: null,
      communication: null,
      relevance: null,
      confidence: null,
      scoreTrend: [],
    }
  }

  const scores = interviews.map((i) => i.overallScore).filter((s) => typeof s === 'number')
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null

  const avgCat = (key) => {
    const vals = interviews
      .map((i) => i.scores?.[key])
      .filter((s) => typeof s === 'number')
    if (!vals.length) return null
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  // Chronological for trend (oldest → newest)
  const chronological = [...interviews].reverse()

  return {
    totalInterviews: interviews.length,
    averageScore: avg,
    bestScore: scores.length ? Math.max(...scores) : null,
    latestScore: scores[0] ?? null,
    technical: avgCat('technical'),
    communication: avgCat('communication'),
    relevance: avgCat('relevance'),
    confidence: avgCat('confidence'),
    scoreTrend: chronological.map((i, idx) => ({
      index: idx + 1,
      score: i.overallScore,
      role: i.role,
      date: i.date,
      id: i.id,
    })),
  }
}
