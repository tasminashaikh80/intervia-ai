/**
 * Question bank data layer.
 * Static JSON sources — replace getQuestionBank implementation with API later
 * without changing Live Interview consumers.
 */

import juniorWeb from './junior-web-developer.json'
import frontend from './frontend-developer.json'
import backend from './backend-developer.json'
import softwareEngineer from './software-engineer.json'
import dataAnalyst from './data-analyst.json'
import chemistryTeacher from './chemistry-teacher.json'
import generic from './generic.json'

const BANKS = {
  'Junior Web Developer': juniorWeb,
  'Frontend Developer': frontend,
  'Backend Developer': backend,
  'Software Engineer': softwareEngineer,
  'Data Analyst': dataAnalyst,
  'Chemistry Teacher': chemistryTeacher,
}

/**
 * Normalize role key for lookup
 */
function normalizeRole(role = '') {
  const r = String(role).trim()
  if (BANKS[r]) return r
  const lower = r.toLowerCase()
  for (const key of Object.keys(BANKS)) {
    if (key.toLowerCase() === lower) return key
  }
  // Fuzzy matches
  if (/chem/.test(lower)) return 'Chemistry Teacher'
  if (/front/.test(lower)) return 'Frontend Developer'
  if (/back/.test(lower)) return 'Backend Developer'
  if (/data|analyst/.test(lower)) return 'Data Analyst'
  if (/software|engineer/.test(lower)) return 'Software Engineer'
  if (/web|junior/.test(lower)) return 'Junior Web Developer'
  return null
}

/**
 * Filter questions by interview type and difficulty.
 * Mixed includes a balanced mix; others prefer matching category.
 */
function filterQuestions(bank, interviewType = 'Mixed', difficulty = 'Intermediate') {
  const all = bank.questions || []
  const type = String(interviewType || 'Mixed')
  const diff = String(difficulty || 'Intermediate')

  const byDiff = all.filter((q) => {
    if (!q.difficulty || q.difficulty === 'Any') return true
    if (diff === 'Beginner') return q.difficulty === 'Beginner' || q.difficulty === 'Any'
    if (diff === 'Advanced') return q.difficulty === 'Advanced' || q.difficulty === 'Intermediate' || q.difficulty === 'Any'
    return q.difficulty !== 'Advanced' || q.difficulty === 'Any'
  })

  if (type === 'Mixed') {
    // Prefer balanced categories
    return byDiff
  }

  const typeMap = {
    Technical: ['Introduction', 'Technical knowledge', 'Practical scenarios', 'Problem solving', 'Role-specific situations'],
    Behavioral: ['Introduction', 'Behavioral', 'Communication', 'Role-specific situations'],
    HR: ['Introduction', 'Behavioral', 'Communication'],
  }

  const allowed = typeMap[type] || null
  if (!allowed) return byDiff

  const filtered = byDiff.filter((q) => allowed.includes(q.category))
  return filtered.length >= 4 ? filtered : byDiff
}

/**
 * @param {string} role
 * @param {string} interviewType
 * @param {string} [difficulty]
 * @returns {{ role: string, type: string, questions: Array<{id:string, category:string, difficulty:string, text:string}> }}
 */
export function getQuestionBank(role, interviewType = 'Mixed', difficulty = 'Intermediate') {
  const key = normalizeRole(role)
  const bank = key ? BANKS[key] : generic
  const questions = filterQuestions(bank || generic, interviewType, difficulty)

  // Ensure introduction first if present
  const intro = questions.filter((q) => q.category === 'Introduction')
  const rest = questions.filter((q) => q.category !== 'Introduction')
  // Light shuffle of rest for variety (stable per session if we seed later)
  const shuffled = [...rest].sort(() => Math.random() - 0.5)

  return {
    role: (bank && bank.role) || role || 'General',
    type: interviewType,
    difficulty,
    questions: [...intro, ...shuffled],
  }
}

/**
 * Build a compact prompt section listing curated questions for the AI.
 * Only the list — AI should ask them one at a time, not dump them.
 */
export function formatQuestionsForPrompt(bank, maxQuestions = 12) {
  if (!bank?.questions?.length) return ''
  const list = bank.questions.slice(0, maxQuestions)
  const lines = list.map((q, i) => `${i + 1}. [${q.category}] ${q.text}`)
  return `
Curated question bank for this interview (ask these in order, one at a time; you may ask brief relevant follow-ups before moving to the next numbered question; do not skip ahead without listening; do not repeat a question already asked):
${lines.join('\n')}
`.trim()
}

export { BANKS }
