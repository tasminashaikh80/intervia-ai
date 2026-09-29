/**
 * Client-side PDF text extraction for resume tailoring.
 * Text stays in memory only — never uploaded or written to localStorage.
 */

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromPdf(file) {
  if (!file) throw new Error('No file provided')
  if (file.type && file.type !== 'application/pdf' && !file.name?.toLowerCase().endsWith('.pdf')) {
    throw new Error('Please upload a PDF resume.')
  }

  // Dynamic import so the app still builds if pdfjs is unavailable during install
  const pdfjs = await import('pdfjs-dist')

  // Use CDN worker to avoid bundler worker path issues in Vite
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  }

  const data = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data })
  const pdf = await loadingTask.promise
  const maxPages = Math.min(pdf.numPages, 8)
  const parts = []

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((item) => ('str' in item ? item.str : '')).filter(Boolean)
    parts.push(strings.join(' '))
  }

  const text = parts.join('\n').replace(/\s+/g, ' ').trim()
  if (!text || text.length < 20) {
    throw new Error('Could not extract readable text from this PDF. You can continue without resume tailoring.')
  }
  return text
}
