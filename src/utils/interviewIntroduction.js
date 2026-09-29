/**
 * Natural interviewer persona and dynamic opening for Intervia.
 * Used by voice session (greeting + system prompt) and text mode.
 */

export const INTERVIEWER_NAME = 'Ava'
export const INTERVIEWER_FULL_NAME = 'Ava'

/** Configurable support email — replace when a real address is available. */
export const CONTACT_EMAIL = 'support@intervia.app'

/**
 * Build a natural, role-aware opening greeting + first-question guidance.
 * @param {{
 *   role: string,
 *   interviewType?: string,
 *   difficulty?: string,
 *   resumeContext?: string,
 *   firstQuestion?: string
 * }} opts
 * @returns {{ greeting: string, firstQuestionHint: string, personaPrompt: string }}
 */
export function generateInterviewIntroduction({
  role,
  interviewType = 'Mixed',
  difficulty = 'Intermediate',
  resumeContext = '',
  firstQuestion = '',
} = {}) {
  const roleLabel = (role || 'the position').trim() || 'the position'
  const type = interviewType || 'Mixed'
  const hasResume = !!(resumeContext && resumeContext.trim().length > 40)

  const focusByType = {
    Technical: 'your technical background and how you approach real problems',
    Behavioral: 'your experience, teamwork, and how you handle situations at work',
    HR: 'your background, motivation, and how you work with others',
    Mixed: 'your experience, a bit of substance for the role, and a few practical scenarios',
  }
  const focus = focusByType[type] || focusByType.Mixed

  let difficultyNote = ''
  if (difficulty === 'Beginner') {
    difficultyNote = " We'll keep the pace approachable so you can settle in."
  } else if (difficulty === 'Advanced') {
    difficultyNote = " I'll go a bit deeper as we progress."
  }

  let resumeNote = ''
  if (hasResume) {
    resumeNote =
      " I've reviewed the experience you shared, so I'll ask about some of the work you've done when it fits."
  }

  // Natural opening — no "I am an AI" / instruction dump
  const greeting = `Hi, I'm ${INTERVIEWER_NAME}. Thanks for joining me today. I'll be interviewing you for the ${roleLabel} position. We'll talk about ${focus}.${difficultyNote}${resumeNote} Take your time with your answers — whenever you're ready, let's get started.`

  // Smooth first question — prefer bank question, else role-aware fallback
  let firstQuestionHint = firstQuestion?.trim() || ''
  if (!firstQuestionHint) {
    firstQuestionHint = `To start us off, could you walk me through your experience related to the ${roleLabel} role?`
  } else {
    // Soft lead-in; the spoken greeting already opened — first spoken question can be the bank item
    firstQuestionHint = firstQuestionHint
  }

  const personaPrompt = `
You are ${INTERVIEWER_NAME}, an experienced professional interviewer conducting a live interview for Intervia practice.

Persona:
- Professional, warm, confident, conversational, and concise.
- Sound like a real human interviewer, not a bot reading instructions.
- Never introduce yourself as an AI, chatbot, or automated system.
- Do not list your process ("I will ask one question at a time", "I will listen carefully", etc.).
- Avoid empty praise on every answer ("That's great!", "Excellent!", "Wonderful!") — stay neutral and professional by default.
- For strong answers, a brief natural acknowledgment is fine; for weak answers, stay neutral and move on.
- Ask one question at a time. Listen fully before responding.
- Use the candidate's selected role (${roleLabel}), interview type (${type}), and difficulty (${difficulty}) to stay relevant.
- Prefer the curated question bank provided. Transition into questions naturally (e.g. "To start us off…" / "Let's dig into…") — never say "Now I will ask you the first question."
- Never invent facts about the candidate. If resume context is provided, only reference what is written there.
`.trim()

  return { greeting, firstQuestionHint, personaPrompt }
}
