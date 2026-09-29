/**
 * Evidence-based interview analysis (frontend heuristic until backend LLM scoring).
 * NOT a real AI evaluation API — scores ONLY from actual transcript evidence.
 * Never invents strengths or high scores without supporting answers.
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function wordCount(text = '') {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function pairQuestionsAndAnswers(messages = []) {
  const pairs = []
  let currentQ = null

  for (const msg of messages) {
    if (msg.sender === 'ai') {
      if (currentQ) pairs.push(currentQ)
      currentQ = { question: msg.text || '', answer: '' }
    } else if (msg.sender === 'user' && currentQ) {
      currentQ.answer = (currentQ.answer ? currentQ.answer + ' ' : '') + (msg.text || '')
    }
  }
  if (currentQ) pairs.push(currentQ)
  return pairs.filter((p) => p.question)
}

function isWeakAnswer(answer = '') {
  const t = answer.trim().toLowerCase()
  if (!t) return true
  if (wordCount(t) < 5) return true
  if (
    /^(i don't know|idk|no idea|not sure|pass|skip|n\/a|nothing|no)\.?$/i.test(t)
  ) {
    return true
  }
  return false
}

function performanceLevel(score) {
  if (score == null) return 'Insufficient evidence'
  if (score < 30) return 'Very poor'
  if (score < 45) return 'Poor'
  if (score < 55) return 'Below average'
  if (score < 65) return 'Average'
  if (score < 75) return 'Good'
  if (score < 85) return 'Very good'
  return 'Excellent'
}

/**
 * @param {{
 *   role: string,
 *   interviewType: string,
 *   difficulty: string,
 *   experienceLevel: string,
 *   duration: number,
 *   messages: Array,
 *   endReason?: string,
 *   actualMinutes?: number
 * }} data
 */
export function analyzeInterview(data) {
  const messages = data.messages || []
  const pairs = pairQuestionsAndAnswers(messages)
  const userAnswers = messages.filter((m) => m.sender === 'user')
  const aiMessages = messages.filter((m) => m.sender === 'ai')
  const totalUserWords = userAnswers.reduce((sum, m) => sum + wordCount(m.text), 0)
  const answeredPairs = pairs.filter((p) => p.answer && !isWeakAnswer(p.answer))
  const weakPairs = pairs.filter((p) => isWeakAnswer(p.answer || ''))
  const earlyEnd =
    data.endReason === 'user_ended' ||
    data.endReason === 'immediate' ||
    (data.actualMinutes != null &&
      data.duration &&
      data.actualMinutes < Math.max(2, data.duration * 0.35))

  const insufficient =
    userAnswers.length === 0 ||
    totalUserWords < 8 ||
    (answeredPairs.length === 0 && pairs.length > 0)

  // --- Honest scoring ---
  let technical = null
  let communication = null
  let relevance = null
  let confidence = null
  let overallScore = null

  if (insufficient) {
    overallScore = Math.min(
      25,
      5 + answeredPairs.length * 3 + Math.min(10, totalUserWords)
    )
    // Leave category scores null → UI shows "Insufficient evidence"
  } else {
    // Technical: based on non-weak answers and length/detail
    let tech = 35
    tech += Math.min(25, answeredPairs.length * 8)
    tech += Math.min(15, totalUserWords / 40)
    if (weakPairs.length > answeredPairs.length) tech -= 15
    if (/\b(because|for example|implemented|designed|experience|project)\b/i.test(
      userAnswers.map((m) => m.text).join(' ')
    )) {
      tech += 8
    }
    technical = clamp(Math.round(tech), 15, 92)

    // Communication
    let comm = 35
    comm += Math.min(20, userAnswers.length * 4)
    comm += Math.min(15, totalUserWords / 35)
    if (totalUserWords < 20) comm -= 10
    communication = clamp(Math.round(comm), 15, 92)

    // Relevance
    let rel = 40
    rel += Math.min(25, answeredPairs.length * 7)
    rel -= Math.min(20, weakPairs.length * 6)
    relevance = clamp(Math.round(rel), 15, 92)

    // Confidence / clarity
    let conf = 35
    conf += Math.min(18, totalUserWords / 30)
    if (userAnswers.some((m) => wordCount(m.text) >= 25)) conf += 10
    if (weakPairs.length >= 2) conf -= 12
    confidence = clamp(Math.round(conf), 15, 92)

    overallScore = Math.round(
      (technical + communication + relevance + confidence) / 4
    )
  }

  const strengths = []
  const improvements = []
  const notEvaluated = []

  if (insufficient) {
    notEvaluated.push('Technical knowledge — insufficient spoken answers to evaluate')
    notEvaluated.push('Communication — too little dialogue to assess')
    notEvaluated.push('Relevance — not enough responses tied to questions')
    notEvaluated.push('Confidence / clarity — insufficient evidence')
    if (userAnswers.length === 0) {
      improvements.push('No candidate answers were recorded during this session')
    } else {
      improvements.push('Provide fuller answers so performance can be evaluated')
    }
    if (earlyEnd || data.endReason === 'user_ended') {
      improvements.push('Interview ended before enough material was gathered')
    }
  } else {
    if (communication != null && communication >= 70) {
      strengths.push('Responses showed reasonable structure and length')
    }
    if (technical != null && technical >= 70) {
      strengths.push('Several answers included usable detail for the role')
    }
    if (relevance != null && relevance >= 70) {
      strengths.push('Answers generally addressed the questions asked')
    }
    if (answeredPairs.length >= 3) {
      strengths.push('Engaged across multiple interview questions')
    }

    if (weakPairs.length > 0) {
      improvements.push('Avoid very short or "I don\'t know" only responses when possible')
    }
    if (technical != null && technical < 60) {
      improvements.push('Strengthen technical depth with concrete examples')
    }
    if (communication != null && communication < 60) {
      improvements.push('Expand answers with clearer structure (context → action → result)')
    }
    if (relevance != null && relevance < 60) {
      improvements.push('Stay closer to what each question is actually asking')
    }
    if (earlyEnd) {
      improvements.push('Complete a fuller session for a more reliable assessment')
    }
    if (strengths.length === 0) {
      // Do not invent strengths
    }
  }

  const questions = pairs.map((p, idx) => {
    const weak = isWeakAnswer(p.answer || '')
    const aScore = weak
      ? clamp(20 + wordCount(p.answer) * 2, 10, 40)
      : clamp(50 + Math.min(30, wordCount(p.answer)), 45, 88)
    return {
      question: p.question,
      answer: p.answer?.trim() || '(No answer recorded)',
      evaluation: weak
        ? 'Little or no usable content in this response.'
        : aScore >= 75
          ? 'Response includes relevant detail supported by the transcript.'
          : 'Partial response — more specifics would strengthen it.',
      improvement: weak
        ? 'Attempt a structured answer even when uncertain.'
        : 'Add examples or reasoning where relevant.',
      score: aScore,
      index: idx + 1,
    }
  })

  let overallFeedback
  if (userAnswers.length === 0) {
    overallFeedback =
      'No candidate speech was recorded. This session cannot support a positive evaluation. Overall performance is treated as insufficient evidence / very limited.'
  } else if (insufficient) {
    overallFeedback = `Only ${userAnswers.length} short response(s) (${totalUserWords} words total) appear in the transcript. There is not enough evidence to claim strong knowledge, communication, or confidence for ${data.role || 'this role'}.`
  } else {
    overallFeedback = `Based strictly on the transcript (${userAnswers.length} candidate turns, ${answeredPairs.length} substantive answers), overall score is ${overallScore}% (${performanceLevel(overallScore)}). Technical ${technical}%, communication ${communication}%, relevance ${relevance}%, confidence ${confidence}%.`
  }

  if (data.endReason === 'time_expired') {
    overallFeedback += ' The session ended because scheduled time expired.'
  } else if (data.endReason === 'user_ended' && earlyEnd) {
    overallFeedback += ' The candidate ended the interview early, limiting evaluation scope.'
  }

  const recommendation = insufficient
    ? 'Retake a full-length practice interview and answer each question with concrete examples before treating scores as meaningful.'
    : overallScore >= 75
      ? 'Continue practicing at this or higher difficulty; focus remaining gaps listed under improvements.'
      : 'Schedule another practice session and prioritize the listed improvements before real interviews.'

  return {
    overallScore: overallScore ?? 20,
    performanceLevel: performanceLevel(overallScore ?? 20),
    scores: {
      technical,
      communication,
      relevance,
      confidence,
    },
    strengths,
    improvements,
    notEvaluated,
    overallFeedback,
    recommendation,
    questions,
    status: 'Completed',
    endReason: data.endReason || 'completed',
    evidence: {
      aiTurns: aiMessages.length,
      userTurns: userAnswers.length,
      substantiveAnswers: answeredPairs.length,
      totalUserWords,
    },
  }
}
