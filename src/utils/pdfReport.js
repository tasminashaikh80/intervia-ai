/**
 * Client-side PDF report generation from existing interview result data.
 * Uses the same result object as the Results page — no separate evaluation.
 */

/**
 * @param {object} result - interview result from interviewStorage
 * @returns {Promise<void>}
 */
export async function downloadInterviewPdf(result) {
  if (!result) throw new Error('No interview result to export')

  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 48
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const ensureSpace = (needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage()
      y = margin
    }
  }

  const addTitle = (text, size = 16) => {
    ensureSpace(size + 12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size)
    doc.setTextColor(15, 23, 42)
    doc.text(text, margin, y)
    y += size + 8
  }

  const addBody = (text, size = 10) => {
    if (!text) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(51, 65, 85)
    const lines = doc.splitTextToSize(String(text), maxWidth)
    for (const line of lines) {
      ensureSpace(14)
      doc.text(line, margin, y)
      y += 13
    }
    y += 4
  }

  const addKeyValue = (key, value) => {
    ensureSpace(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105)
    doc.text(`${key}:`, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(String(value ?? '—'), margin + 110, y)
    y += 14
  }

  // Header
  doc.setFillColor(6, 182, 212)
  doc.rect(0, 0, pageWidth, 8, 'F')
  y = margin + 8
  addTitle('Intervia', 20)
  addTitle('Interview Performance Report', 14)
  y += 4

  const dateStr = result.date
    ? new Date(result.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : '—'

  addKeyValue('Role', result.role)
  addKeyValue('Interview type', result.interviewType || 'Mixed')
  addKeyValue('Difficulty', result.difficulty || '—')
  addKeyValue('Date', dateStr)
  addKeyValue('Duration (planned)', `${result.duration || '—'} min`)
  addKeyValue('Actual duration', `${result.actualMinutes ?? '—'} min`)
  addKeyValue(
    'Completion',
    result.endReason === 'immediate'
      ? 'Ended before sufficient evidence'
      : result.endReason === 'user_ended'
        ? 'Ended by candidate'
        : result.endReason === 'time_expired'
          ? 'Time expired'
          : result.status || 'Completed'
  )

  y += 8
  addTitle('Overall Performance', 13)
  addKeyValue('Overall score', result.overallScore != null ? `${result.overallScore}%` : 'Insufficient evidence')
  addKeyValue('Performance level', result.performanceLevel || '—')
  if (result.overallFeedback) {
    y += 4
    addBody(result.overallFeedback)
  }

  y += 6
  addTitle('Evaluation', 13)
  const scores = result.scores || {}
  addKeyValue('Knowledge', scores.technical != null ? `${scores.technical}%` : 'Insufficient evidence')
  addKeyValue('Communication', scores.communication != null ? `${scores.communication}%` : 'Insufficient evidence')
  addKeyValue('Relevance', scores.relevance != null ? `${scores.relevance}%` : 'Insufficient evidence')
  addKeyValue('Confidence / clarity', scores.confidence != null ? `${scores.confidence}%` : 'Insufficient evidence')

  y += 6
  addTitle('Strengths', 13)
  const strengths = result.strengths || []
  if (strengths.length === 0) {
    addBody('No strengths recorded from this transcript.')
  } else {
    strengths.forEach((s) => addBody(`• ${s}`))
  }

  y += 4
  addTitle('Areas to improve', 13)
  const improvements = result.improvements || []
  if (improvements.length === 0) {
    addBody('None listed.')
  } else {
    improvements.forEach((s) => addBody(`• ${s}`))
  }

  if ((result.notEvaluated || []).length > 0) {
    y += 4
    addTitle('Areas not evaluated', 13)
    result.notEvaluated.forEach((s) => addBody(`• ${s}`))
  }

  if (result.recommendation) {
    y += 4
    addTitle('Recommendation', 13)
    addBody(result.recommendation)
  }

  // Transcript
  y += 8
  addTitle('Transcript', 13)
  const transcript = result.transcript || []
  if (transcript.length === 0) {
    addBody('No transcript available.')
  } else {
    for (const msg of transcript) {
      const who = msg.sender === 'ai' ? 'AI Interviewer' : 'Candidate'
      ensureSpace(28)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(15, 23, 42)
      doc.text(`${who}:`, margin, y)
      y += 12
      addBody(msg.text || '')
      y += 2
    }
  }

  // Page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Intervia · Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 24, {
      align: 'center',
    })
  }

  const safeRole = String(result.role || 'interview').replace(/[^\w\-]+/g, '_').slice(0, 40)
  doc.save(`intervia-${safeRole}-report.pdf`)
}
