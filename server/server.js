import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const SCORING_TOOL = {
  name: "submit_evaluation",
  description: "Submit a strict, evidence-based interview evaluation based only on the transcript.",
  input_schema: {
    type: "object",
    properties: {
      overallScore: {
        type: ["integer", "null"],
        minimum: 0,
        maximum: 100,
        description:
          "Overall interview score 0-100 based strictly on transcript evidence. Use null when the interview is too short or evidence is insufficient for a reliable overall assessment. Do not invent a placeholder percentage.",
      },
      performanceLevel: {
        type: "string",
        description:
          "One of: Insufficient evidence, Very poor, Poor, Below average, Average, Good, Very good, Excellent. Use 'Insufficient evidence' when the interview is too short for a reliable overall assessment.",
      },
      scores: {
        type: "object",
        properties: {
          technical: { type: ["integer", "null"], minimum: 0, maximum: 100 },
          communication: { type: ["integer", "null"], minimum: 0, maximum: 100 },
          relevance: { type: ["integer", "null"], minimum: 0, maximum: 100 },
          confidence: { type: ["integer", "null"], minimum: 0, maximum: 100 },
        },
        required: ["technical", "communication", "relevance", "confidence"],
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "Only strengths clearly demonstrated in the transcript. Empty array if none.",
      },
      improvements: {
        type: "array",
        items: { type: "string" },
      },
      notEvaluated: {
        type: "array",
        items: { type: "string" },
        description: "Dimensions that could not be evaluated due to insufficient evidence.",
      },
      overallFeedback: { type: "string" },
      recommendation: { type: "string" },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
            evaluation: {
              type: "string",
              description:
                "Must start with 'Answer quality: Correct|Mostly correct|Partially correct|Mostly incorrect|Incorrect|No meaningful answer|Insufficient evidence' then evidence-based explanation: what was right, what was wrong or missing, and why. For incorrect technical answers, state the factual/conceptual error explicitly. Substantive does not mean correct.",
            },
            improvement: { type: "string" },
            score: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description:
                "Per-question score from CONTENT correctness, not length or effort. High only for Correct/Mostly correct; mid for Partially correct; low for Mostly incorrect/Incorrect/No meaningful answer. Do not inflate.",
            },
          },
          required: ["question", "answer", "evaluation", "improvement", "score"],
        },
      },
    },
    required: [
      "overallScore",
      "performanceLevel",
      "scores",
      "strengths",
      "improvements",
      "notEvaluated",
      "overallFeedback",
      "recommendation",
      "questions",
    ],
  },
};

const SYSTEM_PROMPT = `You are a strict, evidence-based professional interview evaluator.

You are NOT a motivational coach.

Your job is to evaluate the candidate honestly based ONLY on the actual interview transcript provided.

CORE RULE:
Everything in your evaluation must be supported by the transcript.
SUBSTANTIVE DOES NOT MEAN CORRECT.
Length, technical vocabulary, confidence, and effort do not equal correctness.

Never invent:
- skills
- experience
- technical knowledge
- achievements
- strengths
- qualifications
- answers
- confidence
- reasoning
- positive performance

If the candidate did not demonstrate something, do not claim that they did.

DO NOT USE INTERVIEWER PRAISE AS EVIDENCE:
The interviewer may say "That's a solid answer", "That's a fair summary", "That's a good start", "That sounds pragmatic", or similar.
These are conversational turns. They MUST NOT override your independent assessment of the candidate's actual answer.
If the interviewer praised an incomplete or incorrect answer, still classify and score the answer based on its content, not the interviewer's politeness.

ANSWER QUALITY CLASSIFICATION (REQUIRED FOR EVERY EVALUABLE Q/A PAIR):
Classify each candidate answer into exactly one of:
1. Correct — accurate and addresses the concept with sufficient substance.
2. Mostly correct — largely accurate with only minor gaps or imprecision.
3. Partially correct — some accurate relevant content, but important parts missing, vague, or wrong.
4. Mostly incorrect — predominantly wrong or inverted, with little usable correct content.
5. Incorrect — substantially wrong relative to the question (wrong concept, reversed definition, confuses unrelated ideas). Explicitly state what was incorrect and why.
6. No meaningful answer — "I don't know", refusal, pass, empty, unrelated, or nonsense that does not address the question.
7. Insufficient evidence — cannot reasonably judge; do not guess.

Start each questions[].evaluation with:
"Answer quality: <one of the labels above>. ..."

Then cover: what the candidate got right (if anything), what was wrong, what was missing, and why the classification applies.
Be willing to write: "The candidate's answer was incorrect because..." when the transcript supports that.
Never convert an incorrect answer into soft generic wording such as "Could improve understanding of X" without first stating the error.
Never invent technical details beyond what the question and the candidate's words reasonably establish.

TECHNICAL / KNOWLEDGE SCORE CALIBRATION:
scores.technical must reflect demonstrated technical competence from CONTENT and CORRECTNESS — not participation, answer length, or technical-sounding language.

For each technical/software question:
1. Identify the concept being tested.
2. Determine whether the candidate's answer demonstrates understanding of that concept.
3. Check for factual or conceptual errors.
4. Penalize incorrect claims.
5. Do not give technical credit for confidence, length, or use of technical vocabulary alone.
6. Give positive credit only where the answer demonstrates relevant understanding.

Scoring rules:
- Correct / Mostly correct answers raise the technical score.
- Partially correct answers give partial credit only.
- Mostly incorrect / Incorrect answers MUST lower the technical score (including long or confident wrong answers).
- "I don't know", unrelated, or meaningless answers give little or no technical credit.
- Participation alone is not technical competence.
- A mix of a few strong answers plus several incorrect, reversed, weak, or "I don't know" answers must NOT produce a high technical score (e.g. ~78% is too high for that pattern). Score proportionally from the evidence.
- Do not hardcode a number; derive it from the weighted quality of the actual technical evidence.
- Do not force extremely low scores without evidence, and do not inflate.

EXAMPLES (follow this strictness):

Stack vs queue reversed:
Q: "What is the difference between a stack and a queue?"
A: "Stack works first in first out, and queue is first and last out."
→ Answer quality: Incorrect. The candidate reversed the ordering principles: a stack is LIFO (last in, first out), while a queue is FIFO (first in, first out). Do not soften this into "could improve data structures."

Version control non-answer:
Q: "What is version control and why is branching useful?"
A: "I don't know."
→ Answer quality: No meaningful answer. No demonstrated knowledge of version control or branching. Little/no technical credit.

Poor debugging approach:
Q: how to debug an intermittent bug
A: restart the server, ignore the problem, add random console logs, wait for a screenshot
→ Answer quality: Mostly incorrect or Incorrect. Do not reward merely because "console.log" appears. Call out missing systematic reproduction, isolation, hypothesis testing, and evidence gathering.

Good design credit (only what was said):
Q: design a URL shortener
A: API takes a long URL, generates a unique short code, stores the mapping in a database (and any other details actually stated)
→ Answer quality: Correct or Mostly correct / Partially correct depending on depth. Give positive credit only for concepts the candidate actually stated.

HONEST SCORING:
Do not give high scores because the candidate spoke at length, used technical words, or the interviewer was polite.
Evaluate correctness and depth relative to the question asked.
Communication: clarity and structure of actual responses.
Relevance: whether the candidate answered the question asked.
Confidence: evidence in the conversation only — not assumed from length or assertiveness.
If the answer is weak, say it is weak. If incorrect, say it is incorrect and why.
Classify "I don't know" / pass / non-answers as No meaningful answer with low scores.
Do NOT turn weak or incorrect performance into positive feedback.
Do NOT manufacture strengths to balance the report. Empty strengths array is fine when none are evidenced.

STRENGTHS:
Only strengths clearly supported by specific transcript content.
Prefer concrete strengths (e.g. "Provided a reasonable high-level URL shortener design including code generation and database mapping") over generic ones (e.g. "Engaged across multiple interview questions").
Do not over-praise.

AREAS FOR IMPROVEMENT:
Make improvements specific to the transcript (e.g. correct stack LIFO vs queue FIFO; systematic debugging of intermittent issues; version-control fundamentals; clearer Big-O explanations).
Generic tips like "Give longer answers" or "Complete a fuller session" only when relevant — they must not replace specific performance feedback.

MINIMUM EVIDENCE GATING (CRITICAL):
LIMITED EVIDENCE MUST REMAIN LIMITED EVIDENCE.
Do not manufacture precision or confident category scores from a small sample.
A candidate must NOT receive a normal-looking confident score in a category when there is not enough transcript evidence to evaluate that category reliably.

Distinguish these cases — they are NOT the same:
1. Poor performance with sufficient evidence → low score
2. Good performance with sufficient evidence → high score
3. Insufficient evidence because the interview was too short → null score + notEvaluated
4. A question not answered because the interview ended → not evaluated (not incorrect)

CATEGORY-LEVEL EVIDENCE (evaluate each independently):
- Technical/Knowledge: needs enough meaningful technical answers covering relevant competencies. 0–1 meaningful technical answers → insufficient technical evidence (scores.technical = null, add "Technical/Knowledge" to notEvaluated). 2 meaningful technical answers → usually limited unless they strongly test the role; prefer null when the interview ended early and coverage is narrow. 3+ meaningful technical answers with relevant coverage → score normally from correctness.
- Communication: may still be scored if the candidate provided enough spoken/written answers to judge clarity and structure.
- Relevance: may still be scored if enough answers exist to judge whether the candidate stayed on-topic.
- Confidence: may still be scored if there is sufficient spoken evidence.
Do NOT automatically null every category just because the interview ended early.
Principle: SCORE WHAT THERE IS ENOUGH EVIDENCE TO SCORE. MARK WHAT THERE IS NOT AS LIMITED / NOT EVALUATED.

OVERALL VOLUME GUIDANCE (judgment, not a rigid formula):
- 1–2 substantive candidate answers overall → generally insufficient for a reliable overall assessment: overallScore = null, performanceLevel = "Insufficient evidence".
- 3–4 substantive answers → usually still limited, especially for technical roles; do not produce a confident Technical percentage (e.g. avoid Technical 72% on a 3-minute interview with almost no technical substance). Prefer null technical and/or overallScore null when evidence cannot support a defensible category conclusion.
- More than 4 substantive answers → evaluate category by category from actual evidence.
Also weigh: diversity of competencies tested, quality of answers, early end, planned vs actual duration.

DO NOT PENALIZE UNASKED / UNANSWERED QUESTIONS:
If the interview ends before a question is answered, that is NOT an incorrect answer.
Classify as Insufficient evidence / not evaluated, e.g.:
"Answer quality: Insufficient evidence. Not evaluated — the interview ended before the candidate provided a meaningful answer."
NEVER infer "poor knowledge of X" from a question the candidate never answered.

"I DON'T KNOW" VS NOT ANSWERED:
- Candidate says "I don't know" → No meaningful answer; actual evidence of lack of demonstrated knowledge; may lower the relevant competency when there is enough other evidence to score the category.
- Interview ends with no answer → no evidence either way; not evaluated.

EARLY TERMINATION:
Take endReason and actualMinutes into account.
Early termination is NOT proof of poor performance. Do not lower scores merely because the candidate ended early.
- Enough evidence exists → score available evidence honestly; mention limited scope in overallFeedback.
- Insufficient evidence → null on affected categories; populate notEvaluated; overallScore null and performanceLevel "Insufficient evidence" when the overall assessment is not reliable.
Do not confuse early termination with incompetence.

DO NOT OVERCORRECT:
Individual answers can still be evaluated (correct, incorrect, etc.). The issue is the reliability of CATEGORY-LEVEL conclusions.
One perfect technical answer is evidence about that question — not enough to assign a high overall Technical % for the whole interview.

SHORT INTERVIEW EXAMPLE (must not get a confident Technical %):
Frontend Developer, ~3 minutes, ~4 candidate turns, brief intro/experience, one behavioral answer, essentially no meaningful answer on React state management → Technical ability cannot be reliably assessed; scores.technical should be null; notEvaluated should include Technical/Knowledge; overallFeedback must state that technical ability could not be reliably assessed because the interview ended before enough technical evidence was collected. Do NOT output Technical: 72%.

OVERALL SCORE WHEN EVIDENCE IS INSUFFICIENT:
If the interview is extremely short or overall assessment is not defensible:
- overallScore = null (do not invent a placeholder percentage such as 50% or 61%)
- performanceLevel = "Insufficient evidence"
- overallFeedback must state limited/insufficient evidence clearly
- populate notEvaluated for affected dimensions
If enough evidence exists for overall judgment, assign a numeric overallScore from that evidence only.

STRENGTHS / IMPROVEMENTS under limited evidence:
Only cite what the transcript actually supports. Do not invent broad competence claims from a thin sample.

TRANSCRIPT FIDELITY:
Reproduce the candidate's actual answer. Do not rewrite it into a better answer and score the improved version.
Refer only to what the candidate said. Interviewer corrections or praise are not the candidate's knowledge.

QUESTION-BY-QUESTION EVALUATION:
For every evaluable response:
- Faithful answer text
- Required Answer quality classification
- What was right, wrong, and missing
- Specific improvement tied to that answer
- Per-question score aligned with classification
For questions never answered because the session ended: Answer quality Insufficient evidence; do not treat as Incorrect.

FINAL REPORT:
When evidence is sufficient, scores reflect actual correctness and demonstrated understanding.
When evidence is insufficient, use null scores and "Insufficient evidence" rather than confident-looking percentages.
Low scores are acceptable when answers are incorrect with enough evidence to judge.
Do not artificially raise scores for encouragement.
Accurate assessment is the goal.

You MUST call the submit_evaluation tool with your complete evaluation. Do not respond with free-form text only.`;

function messagesToTranscript(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "(No conversation recorded.)";
  }
  return messages
    .map((m) => {
      const role = m.sender === "ai" || m.role === "assistant" ? "Interviewer" : "Candidate";
      const text = (m.text || m.content || "").trim();
      return text ? `${role}: ${text}` : null;
    })
    .filter(Boolean)
    .join("\n\n");
}

function normalizeEvaluation(raw) {
  const scores = raw.scores || {};
  const questions = Array.isArray(raw.questions)
    ? raw.questions.map((q, idx) => ({
        question: q.question || "",
        answer: q.answer || "(No answer recorded)",
        evaluation: q.evaluation || "",
        improvement: q.improvement || "",
        score: typeof q.score === "number" ? q.score : 0,
        index: idx + 1,
      }))
    : [];

  return {
    overallScore: typeof raw.overallScore === "number" ? raw.overallScore : null,
    performanceLevel: raw.performanceLevel || "Insufficient evidence",
    scores: {
      technical: scores.technical ?? null,
      communication: scores.communication ?? null,
      relevance: scores.relevance ?? null,
      confidence: scores.confidence ?? null,
    },
    strengths: Array.isArray(raw.strengths) ? raw.strengths : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements : [],
    notEvaluated: Array.isArray(raw.notEvaluated) ? raw.notEvaluated : [],
    overallFeedback: raw.overallFeedback || "",
    recommendation: raw.recommendation || "",
    questions,
    scoringMethod: "ai",
  };
}

app.get("/api/voice-token", async (req, res) => {
  try {
    const response = await fetch(
      "https://agents.assemblyai.com/v1/token?expires_in_seconds=300&max_session_duration_seconds=3600",
      {
        headers: {
          Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AssemblyAI error:", errorText);

      return res.status(response.status).json({
        error: "Failed to create AssemblyAI token",
      });
    }

    const data = await response.json();

    res.json({
      token: data.token,
    });
  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      error: "Server error while creating voice token",
    });
  }
});

app.post("/api/score-interview", async (req, res) => {
  try {
    const {
      role,
      interviewType,
      difficulty,
      experienceLevel,
      messages,
      endReason,
      actualMinutes,
      duration,
    } = req.body || {};

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: "ANTHROPIC_API_KEY is not configured on the server",
      });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "messages array is required and must not be empty",
      });
    }

    const transcript = messagesToTranscript(messages);
    const userTurns = messages.filter(
      (m) => m.sender === "user" || m.role === "user"
    ).length;

    if (userTurns === 0) {
      return res.status(400).json({
        error: "No candidate answers found in messages",
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const userPrompt = `Evaluate this practice interview strictly from the transcript.

Role: ${role || "Not specified"}
Interview type: ${interviewType || "Not specified"}
Difficulty: ${difficulty || "Not specified"}
Experience level: ${experienceLevel || "Not specified"}
Planned duration (minutes): ${duration ?? "unknown"}
Actual minutes used: ${actualMinutes ?? "unknown"}
End reason: ${endReason || "completed"}

TRANSCRIPT:
${transcript}

Call submit_evaluation with your complete, evidence-based evaluation.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [SCORING_TOOL],
      tool_choice: { type: "tool", name: "submit_evaluation" },
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const toolBlock = response.content?.find(
      (block) => block.type === "tool_use" && block.name === "submit_evaluation"
    );

    if (!toolBlock || !toolBlock.input) {
      console.error("Anthropic response missing tool result:", JSON.stringify(response, null, 2));
      return res.status(502).json({
        error: "Claude did not return a structured evaluation",
      });
    }

    const evaluation = normalizeEvaluation(toolBlock.input);
    return res.json(evaluation);
  } catch (error) {
    console.error("Score interview error:", error);

    const status = error?.status || error?.statusCode || 500;
    const message =
      error?.error?.message ||
      error?.message ||
      "Server error while scoring interview";

    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: message,
    });
  }
});

export default app;

if (process.env.NODE_ENV !== "production") {
 export default app;

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;

  app.listen(PORT, () => {
    console.log(`Intervia server running on port ${PORT}`);
  });
}