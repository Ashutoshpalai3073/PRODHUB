import "./lib/error-capture";
import 'dotenv/config';
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { getContextualKnowledge } from './lib/knowledge';

interface Env {
  GROQ_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FRONTEND_URL?: string;
  RESEND_API_KEY?: string;
}

// ─── Groq models ──────────────────────────────────────────────────────────────
// Groq retires models without notice — `llama-3.3-70b-versatile` was previously
// hard-coded in three places and started returning 404 model_not_found, which
// silently broke both FitScore and the chatbot. Keep the ids here so a future
// retirement is a one-line fix. Check availability with:
//   curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models
const GROQ_MODEL_ANALYSIS = 'openai/gpt-oss-20b'; // FitScore — free-tier friendly, strict JSON
const GROQ_MODEL_CHAT     = 'openai/gpt-oss-20b'; // Chatbot — lower latency

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return false; }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;
  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// ─── FitScore Phase 1 — AI startup analysis ──────────────────────────────────
async function handleFitScorePhase1(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      name: string; founder: string; industry: string;
      tagline: string; fundingGoal: number; description: string;
    };

    const { name, founder, industry, tagline, fundingGoal, description } = body;

    if (!name || !description) {
      return new Response(
        JSON.stringify({ error: 'Company name and description are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

    const fundingCrore = (fundingGoal / 1e7).toFixed(1);

    const prompt = `
You are a partner-level analyst at a top Indian VC firm (think Sequoia Capital India, Peak XV, Lightspeed India, Matrix Partners India). You have evaluated 500+ early-stage startups. You are brutally honest — most startups score between 35–65. Only truly exceptional ones score above 80. Be skeptical, rigorous, and grounded in real-world Indian startup ecosystem data.

STARTUP SUBMISSION:
- Company: ${name}
- Founder: ${founder}
- Industry: ${industry}
- Tagline: "${tagline}"
- Funding Ask: ₹${fundingCrore} Cr
- Description: "${description}"

SCORING FRAMEWORK — 5 dimensions, 0–20 each (max 100):

1. PROBLEM-MARKET FIT (0–20)
   - Is the problem experienced by a large enough segment in India (or globally)?
   - Is it a hair-on-fire problem (urgent) or a vitamin (nice-to-have)?
   - Is there evidence the problem is real and unsolved? (0–5: vague, 6–10: plausible, 11–15: clear with context, 16–20: sharply defined with real pain evidence)

2. MARKET SIZE & TIMING (0–20)
   - India context: Is the market large enough? (₹1000 Cr+ SAM for seed, ₹10,000 Cr+ for Series A)
   - Is timing right? (regulatory tailwinds, India Stack, UPI ecosystem, smartphone penetration, ONDC, etc.)
   - Are there comparable global companies validating this market? (0–5: unproven, 6–10: nascent, 11–15: growing with comps, 16–20: clear large market with perfect timing)

3. SOLUTION & MOAT (0–20)
   - Is the solution 10x better than existing alternatives (not just marginally better)?
   - Is there a defensible moat: network effects, proprietary data, switching costs, regulatory license, deep tech IP?
   - How easily can a well-funded competitor replicate this? (0–5: easily copied, 6–10: some differentiation, 11–15: clear advantage, 16–20: strong defensible moat)

4. BUSINESS MODEL VIABILITY (0–20)
   - Is the revenue model clearly articulated and realistic?
   - Are unit economics plausible? (CAC vs LTV, gross margins appropriate for industry)
   - SaaS: 70%+ gross margins expected. Marketplace: 15–30%. B2B: recurring revenue preferred.
   - Is the funding ask proportional to the stage and use of funds? (0–5: unclear, 6–10: basic model, 11–15: solid model with realistic economics, 16–20: compelling model with strong unit economics)

5. FOUNDER-MARKET FIT & EXECUTION SIGNAL (0–20)
   - Does the founder's background (as described) suggest deep domain expertise?
   - Is there a signal of prior execution: past startup, domain experience, relevant education (IIT/IIM/top global), industry tenure?
   - First-time founders with no domain signal score low. Serial founders or deep domain experts score high. (0–5: no signal, 6–10: some relevance, 11–15: strong background, 16–20: exceptional domain + execution pedigree)

INDUSTRY-SPECIFIC ADJUSTMENTS (apply these to be realistic):
- FinTech: Deduct up to 3 points if RBI/SEBI regulatory pathway is not mentioned. Add up to 3 if mentions specific license or partnership.
- HealthTech: Deduct up to 4 points if no mention of clinical validation or CDSCO compliance pathway.
- EdTech: Be conservative — Indian EdTech is overcrowded post-BYJU's collapse. Differentiation must be exceptional.
- AgriTech: Add up to 3 points if rural distribution model is clearly articulated.
- DeepTech/AI: Add up to 3 points if there is mention of proprietary model, dataset, or patent. Deduct if it's just "ChatGPT wrapper."
- SaaS/B2B: Add up to 3 points if target customer and ACV (Annual Contract Value) is mentioned.
- D2C/Consumer: Be conservative — high CAC environment in India. Deduct if no clear retention/repeat purchase signal.

REALISTIC SCORE CALIBRATION (follow this strictly):
- 0–30: Idea is too vague, no clear problem-solution, not fundable
- 31–45: Concept exists but lacks validation, market clarity, or founder fit
- 46–60: Promising idea but significant gaps — needs more work before raising
- 61–72: Solid foundation, ready for angel/pre-seed conversations with caveats
- 73–82: Strong startup, seed-ready, competitive but fundable by serious angels/seed funds
- 83–90: Exceptional — Series A candidate, clear market leader potential
- 91–100: Extremely rare — reserve for truly transformative, defensible, perfectly timed startups with exceptional teams

BAND LABELS (assign based on total):
- 83–100: "Series A Contender"
- 73–82: "Seed Ready"
- 61–72: "Angel Stage"
- 46–60: "Pre-seed Potential"
- 31–45: "Needs Validation"
- 0–30: "Concept Phase"

Respond ONLY with a valid JSON object, no markdown, no explanation, no commentary:
{
  "scores": {
    "problemMarketFit": <0-20>,
    "marketSizeTiming": <0-20>,
    "solutionMoat": <0-20>,
    "businessModelViability": <0-20>,
    "founderMarketFit": <0-20>
  },
  "total": <integer sum of all 5 scores, 0-100>,
  "band": "<Series A Contender | Seed Ready | Angel Stage | Pre-seed Potential | Needs Validation | Concept Phase>",
  "remark": "<2–3 sentence honest VC-style assessment. Be direct, specific to this startup, mention the biggest strength and biggest gap>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "redFlags": ["<critical gap or risk 1>", "<critical gap or risk 2>"],
  "improvements": ["<specific actionable improvement 1>", "<specific actionable improvement 2>", "<specific actionable improvement 3>"],
  "vcQuestions": ["<question a VC would ask in a meeting 1>", "<question a VC would ask 2>", "<question a VC would ask 3>"],
  "comparables": ["<real comparable company or startup in this space>", "<another comparable>"],
  "keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
  "investorMessage": "<1 honest sentence about what needs to happen before this is truly fundable, or if already fundable, what makes it compelling>"
}`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL_ANALYSIS,
      // The response carries scores + remark + 3 strengths + 2 red flags +
      // 3 improvements + 3 VC questions + comparables + keywords. At 1200 the
      // JSON was cut off mid-string and every call fell through to the generic
      // fallback score of 52. Reasoning models also spend tokens before the
      // answer, so keep plenty of headroom.
      max_tokens: 4096,
      temperature: 0.2,
      // Guarantees syntactically valid JSON rather than relying on fence-stripping.
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0].message.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    const total = Math.min(100, Math.max(0, result.total ?? 0));

    // Derive band from total server-side to ensure consistency
    const band =
      total >= 83 ? 'Series A Contender' :
      total >= 73 ? 'Seed Ready' :
      total >= 61 ? 'Angel Stage' :
      total >= 46 ? 'Pre-seed Potential' :
      total >= 31 ? 'Needs Validation' : 'Concept Phase';

    return new Response(
      JSON.stringify({ ...result, total, band, phase: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[incuscore-p1]', err);
    return new Response(
      JSON.stringify({
        total: 52, phase: 1, band: 'Pre-seed Potential',
        remark: 'Initial analysis could not be completed. Provide a detailed description covering your problem, target market, and business model for an accurate FitScore.',
        strengths: ['Startup registered on Sanyog', 'Funding goal articulated', 'Ready to be evaluated'],
        redFlags: ['Description too brief for meaningful analysis', 'Market size not validated yet'],
        improvements: ['Write a detailed description (200+ words) covering the problem, solution, and target customer', 'Mention your revenue model explicitly', 'Add founder background and relevant experience'],
        vcQuestions: ['Who exactly is your target customer and what do they pay today?', 'Why are you the right team to solve this?', 'What is your go-to-market strategy for the first 100 customers?'],
        comparables: ['Unable to determine without more details'],
        keywords: ['startup', 'early-stage', 'india', 'building', 'founder'],
        investorMessage: 'Enrich your startup profile with a detailed description and upload a pitch deck to unlock your full FitScore.',
        scores: { problemMarketFit: 11, marketSizeTiming: 10, solutionMoat: 10, businessModelViability: 11, founderMarketFit: 10 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Document text extractors (pure JS, no native modules — works in Workers) ─

/** Extract readable text from a PDF buffer using BT..ET stream parsing */
function extractPdfText(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    const latin1 = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    const parts: string[] = [];

    // Extract compressed content streams and plain BT..ET blocks
    const streamRx = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;
    while ((m = streamRx.exec(latin1)) !== null) {
      const chunk = m[1];
      // Tj single string: (Hello World) Tj
      const tjRx = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
      let t: RegExpExecArray | null;
      while ((t = tjRx.exec(chunk)) !== null) {
        parts.push(t[1].replace(/\\n/g, ' ').replace(/\\r/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\'));
      }
      // TJ array: [(Hello) 20 (World)] TJ
      const tjArrRx = /\[([^\]]+)\]\s*TJ/g;
      while ((t = tjArrRx.exec(chunk)) !== null) {
        const inner = t[1];
        const strRx = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
        let s: RegExpExecArray | null;
        while ((s = strRx.exec(inner)) !== null) {
          parts.push(s[1].replace(/\\n/g, ' ').replace(/\\\(/g, '(').replace(/\\\)/g, ')'));
        }
      }
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
  } catch {
    return '';
  }
}

/** Minimal pure-JS ZIP reader using DecompressionStream (available in Workers & modern browsers) */
async function readZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;
  const len = bytes.length;

  while (offset < len - 4) {
    const sig = view.getUint32(offset, true);
    if (sig !== 0x04034b50) { offset++; continue; }
    if (offset + 30 > len) break;

    const compression = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const fileNameLen = view.getUint16(offset + 26, true);
    const extraLen = view.getUint16(offset + 28, true);
    const fileNameBytes = bytes.slice(offset + 30, offset + 30 + fileNameLen);
    const fileName = new TextDecoder().decode(fileNameBytes);
    const dataStart = offset + 30 + fileNameLen + extraLen;
    const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

    try {
      if (compression === 0) {
        // Stored (no compression)
        entries.set(fileName, compressedData);
      } else if (compression === 8) {
        // Deflate
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        writer.write(compressedData);
        writer.close();
        const chunks: Uint8Array[] = [];
        let done = false;
        while (!done) {
          const { value, done: d } = await reader.read();
          if (value) chunks.push(value);
          done = d;
        }
        const total = chunks.reduce((a, c) => a + c.length, 0);
        const out = new Uint8Array(total);
        let pos = 0;
        for (const c of chunks) { out.set(c, pos); pos += c.length; }
        entries.set(fileName, out);
      }
    } catch { /* skip unreadable entry */ }

    offset = dataStart + compressedSize;
  }
  return entries;
}

/** Strip XML tags and decode entities */
function xmlToText(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ').trim();
}

/** Extract text from DOCX (word/document.xml) */
async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const entries = await readZipEntries(buffer);
    const docXml = entries.get('word/document.xml');
    if (!docXml) return '';
    return xmlToText(new TextDecoder().decode(docXml)).slice(0, 12000);
  } catch { return ''; }
}

/** Extract text from PPTX (ppt/slides/slide*.xml) */
async function extractPptxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const entries = await readZipEntries(buffer);
    const parts: string[] = [];
    for (const [name, data] of entries) {
      if (name.startsWith('ppt/slides/slide') && name.endsWith('.xml')) {
        parts.push(xmlToText(new TextDecoder().decode(data)));
      }
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
  } catch { return ''; }
}

/** Extract text from XLSX (xl/sharedStrings.xml + xl/worksheets) */
async function extractXlsxText(buffer: ArrayBuffer): Promise<string> {
  try {
    const entries = await readZipEntries(buffer);
    const parts: string[] = [];
    const sharedStrings = entries.get('xl/sharedStrings.xml');
    if (sharedStrings) parts.push(xmlToText(new TextDecoder().decode(sharedStrings)));
    for (const [name, data] of entries) {
      if (name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml')) {
        parts.push(xmlToText(new TextDecoder().decode(data)));
      }
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
  } catch { return ''; }
}

/** Master extractor — fetches file URL and extracts text based on extension */
async function extractDocumentContent(fileUrl: string, ext: string): Promise<string> {
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return '';
    const buffer = await res.arrayBuffer();
    switch (ext.toLowerCase()) {
      case 'pdf': return extractPdfText(buffer);
      case 'docx': return await extractDocxText(buffer);
      case 'pptx': return await extractPptxText(buffer);
      case 'xlsx': return await extractXlsxText(buffer);
      case 'ppt': case 'doc': case 'xls':
        // Legacy binary formats — return empty, signal to AI it's a legacy format
        return '[Legacy binary format — content not extractable]';
      case 'csv': case 'txt':
        return new TextDecoder().decode(await res.clone().arrayBuffer()).slice(0, 12000);
      default: return '';
    }
  } catch {
    return '';
  }
}

// ─── FitScore Phase 2 — Document-weighted rescore ───────────────────────────
async function handleFitScorePhase2(request: Request): Promise<Response> {
  let bodyParsed: {
    previousScore: number; startupName: string; documentName: string;
    documentType: string; documentStatus: string; industry: string;
    description: string; fileUrl?: string; fileExt?: string;
  } | null = null;

  try {
    bodyParsed = await request.json();
    const {
      previousScore, startupName, documentName,
      documentType, documentStatus, industry, description,
      fileUrl, fileExt,
    } = bodyParsed!;

    // ── Extract actual document content ──────────────────────────────────────
    let documentContent = '';
    let contentExtracted = false;
    if (fileUrl && fileExt) {
      documentContent = await extractDocumentContent(fileUrl, fileExt);
      contentExtracted = documentContent.length > 50 && documentContent !== '[Legacy binary format — content not extractable]';
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

    // Map document type to what it actually signals
    const docTypeLabel: Record<string, string> = {
      Deck: 'Pitch Deck (slides for investors — highest signal)',
      Doc: 'Executive Summary / Business Plan (written narrative)',
      Sheet: 'Financial Model / Projections (numbers-driven)',
      Bundle: 'Full Pitch Bundle (deck + financials + executive summary — strongest signal)',
      Video: 'Product Demo Video (supplementary signal)',
    };
    const docStatusLabel: Record<string, string> = {
      Final: 'Final / Investor-ready (polished, reviewed)',
      Review: 'Under Review (near-final, shows seriousness)',
      Draft: 'Draft (work-in-progress, incomplete)',
    };

    const contentSection = contentExtracted
      ? `\nEXTRACTED DOCUMENT CONTENT (first 4000 chars):\n"""\n${documentContent.slice(0, 4000)}\n"""\nIMPORTANT: You have the actual document text above. Base your entire assessment on what you can READ in this content, not on the file type or name alone.\n`
      : `\nDOCUMENT CONTENT: Could not be extracted (${fileExt ?? 'unknown'} format). Assess based on type, status, and name only.\n`;

    const prompt = `
You are a partner-level VC analyst at Sequoia India / Peak XV. A startup has submitted a document to their investor vault. Read the content carefully and assess how much it improves their investment readiness.

STARTUP CONTEXT:
- Company: ${startupName}
- Industry: ${industry}
- Startup Description: "${description}"
- Current FitScore: ${previousScore}/100

DOCUMENT METADATA:
- Name: "${documentName}"
- Type declared by founder: ${docTypeLabel[documentType] ?? documentType}
- Status: ${docStatusLabel[documentStatus] ?? documentStatus}
${contentSection}
SCORING — 4 dimensions, 0–25 each:

DIMENSION 1 — PITCH NARRATIVE COMPLETENESS (0–25):
IF content is available: Score based on whether the document actually contains a coherent pitch narrative — problem statement, solution, market opportunity, competitive positioning, team story. A deck with just bullet points scores lower than one with clear narrative flow.
IF no content: Score based on document type and status as proxy.
- Penalise heavily (cap at 10) if content reads as personal document, generic template, or completely unrelated to the startup.
- Score 20–25 only if you can see a clear investor-grade pitch narrative in the content.

DIMENSION 2 — FINANCIAL CREDIBILITY (0–25):
IF content is available: Is there actual financial data? Revenue projections, unit economics (CAC, LTV, gross margin), funding ask breakdown, runway calculation, MRR/ARR data, cap table? Score based on depth and realism of financial content.
IF no content: Use document type as proxy (Sheet highest, Bundle high, Deck medium, Doc low).
- Placeholder numbers or generic "₹X crore" without context score 5–10.
- Real, specific, internally consistent financial data scores 18–25.

DIMENSION 3 — MARKET VALIDATION READINESS (0–25):
IF content is available: Is there evidence of market research? Specific TAM/SAM/SOM figures with sources, competitor analysis, customer persona, India market context, references to real data points? Generic market claims score 6–12. Cited, specific market data scores 18–25.
IF no content: Deck/Bundle > Doc > Sheet > Video as proxy.

DIMENSION 4 — FOUNDER EXECUTION SIGNAL (0–25):
IF content is available: Does the content read as the work of a serious, prepared founder? Look for: professional formatting (evidenced by structure), specificity (not vague claims), awareness of investor concerns, clear ask and use of funds. Vague, generic content scores 5–10. Specific, well-reasoned, investor-aware content scores 18–25.
IF no content: Document status (Final > Review > Draft) as proxy.

FINAL SCORE FORMULA:
finalScore = round((previousScore × 0.35) + (documentSignalTotal × 0.65))

DELTA ENFORCEMENT (strictly apply):
- Content-based assessment (content extracted): delta range is wider — can go +3 to +22 depending on actual quality
- No-content assessment (metadata only): cap delta at +12
- If content is clearly NOT startup material but passed the pre-flight (edge case): set delta = 0, irrelevantDocument = true
- If previousScore >= 78: cap delta at 7
- If previousScore >= 85: cap delta at 4
- delta is ALWAYS at least +1 for any legitimate startup document
- Review documents: 55–70% of Final equivalent
- Draft documents: 25–40% of Final equivalent
- Video (Final): +3 to +7
- HARD CAP: delta cannot exceed 20 in one submission
- HARD FLOOR: delta is always >= 1 (any legitimate startup doc adds some signal)
- Diminishing returns: if previousScore >= 78, cap delta at 6; if >= 85, cap at 3

BAND THRESHOLDS:
- 83–100: "Series A Contender"
- 73–82: "Seed Ready"
- 61–72: "Angel Stage"
- 46–60: "Pre-seed Potential"
- 31–45: "Needs Validation"
- 0–30: "Concept Phase"

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "documentScores": {
    "pitchNarrative": <0-25>,
    "financialCredibility": <0-25>,
    "marketValidation": <0-25>,
    "founderExecution": <0-25>
  },
  "documentTotal": <sum of all 4 scores>,
  "finalScore": <integer using formula above>,
  "delta": <finalScore minus previousScore>,
  "band": "<band label>",
  "remark": "<2 honest sentences: what this document signals to a VC, and the single biggest gap remaining>",
  "documentInsights": [
    "<what this document type signals about investor readiness>",
    "<what is still missing that would most improve the score>",
    "<honest assessment of this document status and what it tells investors>"
  ],
  "nextSteps": ["<highest-impact next upload>", "<second action>"],
  "keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
  "finalMessage": "<1–2 sentences in VC voice: direct, honest, specific to this startup and document>",
  "readyForVCs": <true only if finalScore >= 73>
}`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL_ANALYSIS,
      max_tokens: 4096, // see the note on Phase 1 — 1400 truncated the JSON
      temperature: 0.15,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0].message.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);

    // AI flagged doc as irrelevant despite passing pre-flight
    if (result.irrelevantDocument) {
      const band =
        previousScore >= 83 ? 'Series A Contender' :
        previousScore >= 73 ? 'Seed Ready' :
        previousScore >= 61 ? 'Angel Stage' :
        previousScore >= 46 ? 'Pre-seed Potential' :
        previousScore >= 31 ? 'Needs Validation' : 'Concept Phase';
      return new Response(
        JSON.stringify({ ...result, finalScore: previousScore, delta: 0, band, readyForVCs: previousScore >= 73, phase: 2 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Server-side score enforcement
    const maxDelta = contentExtracted
      ? (previousScore >= 85 ? 4 : previousScore >= 78 ? 7 : 22)
      : 12;
    const rawFinal = result.finalScore ?? (previousScore + 3);
    const clampedFinal = Math.min(previousScore + maxDelta, Math.max(previousScore + 1, Math.round(rawFinal)));
    const finalScore = Math.min(100, clampedFinal);
    const delta = finalScore - previousScore;

    const band =
      finalScore >= 83 ? 'Series A Contender' :
      finalScore >= 73 ? 'Seed Ready' :
      finalScore >= 61 ? 'Angel Stage' :
      finalScore >= 46 ? 'Pre-seed Potential' :
      finalScore >= 31 ? 'Needs Validation' : 'Concept Phase';

    return new Response(
      JSON.stringify({ ...result, finalScore, delta, band, readyForVCs: finalScore >= 73, phase: 2, contentExtracted }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[incuscore-p2]', err);
    const prev = bodyParsed?.previousScore ?? 55;
    const docType = bodyParsed?.documentType ?? 'Doc';
    const docStatus = bodyParsed?.documentStatus ?? 'Draft';
    // Realistic fallback delta based on document type and status
    const baseDeltas: Record<string, number> = { Bundle: 14, Deck: 10, Sheet: 8, Doc: 6 };
    const statusMultiplier: Record<string, number> = { Final: 1, Review: 0.65, Draft: 0.4 };
    const delta = Math.round((baseDeltas[docType] ?? 6) * (statusMultiplier[docStatus] ?? 0.5));
    const finalScore = Math.min(100, prev + delta);
    const band =
      finalScore >= 83 ? 'Series A Contender' :
      finalScore >= 73 ? 'Seed Ready' :
      finalScore >= 61 ? 'Angel Stage' :
      finalScore >= 46 ? 'Pre-seed Potential' :
      finalScore >= 31 ? 'Needs Validation' : 'Concept Phase';
    return new Response(
      JSON.stringify({
        finalScore, delta, phase: 2, band,
        remark: 'Document received and factored into your FitScore. A detailed pitch deck or financial model will yield the highest score improvement.',
        documentInsights: [
          `${docType} submission (${docStatus}) adds meaningful signal to your investor profile`,
          'Upload a Final-status Pitch Deck or full Bundle for maximum score impact',
          'Investors expect to see financial projections alongside any narrative document',
        ],
        nextSteps: ['Upload a Final pitch deck with financial slide for the biggest score jump', 'Add a financial model (Sheet) to signal unit economics awareness'],
        keywords: ['pitch', 'investor-ready', 'vault', 'document', 'startup'],
        finalMessage: 'Keep building your pitch vault — a complete Final bundle is the strongest signal you can send to investors at this stage.',
        readyForVCs: finalScore >= 73,
        documentScores: { pitchNarrative: 14, financialCredibility: 12, marketValidation: 13, founderExecution: 13 },
        documentTotal: 52,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


// ─── Startup Insert ───────────────────────────────────────────────────────────
// ─── Document Delete ──────────────────────────────────────────────────────────
async function handleDocumentDelete(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { name, file_path } = await request.json() as { name: string; file_path?: string };
    if (!name) {
      return new Response(JSON.stringify({ error: 'Document name required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Identity + ownership: only the owning founder (or admin) may delete a doc.
    const authed = await getAuthedUser(request);
    if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
    // Fetch the doc once — used for both the ownership check and the activity log.
    const { data: doc } = await admin.from('documents').select('id, deck_type, startup_name').eq('name', name).maybeSingle();
    if (authed.role !== 'admin') {
      let owners: string[] = [];
      if (doc?.startup_name) {
        const { data: st } = await admin.from('startups').select('created_by_email, owner_email').eq('name', doc.startup_name).maybeSingle();
        if (st) owners = [st.created_by_email, st.owner_email].filter(Boolean).map((x: string) => x.toLowerCase());
      }
      if (!owners.includes(authed.email.toLowerCase())) return jsonRes({ error: 'You can only delete documents for your own startup.' }, 403);
    }
    // Delete file from storage if it exists
    if (file_path) {
      await admin.storage.from('pitch-vault').remove([file_path]);
    }
    // Delete record from database
    const { error } = await admin.from('documents').delete().eq('name', name);
    if (error) {
      console.error('[documents/delete]', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    // Record the removal so the activity feed keeps the timeline (added → removed)
    // instead of the upload entry silently disappearing.
    await logActivity({
      type: 'doc_removed',
      actor_email: authed.email,
      title: name,
      detail: (doc?.deck_type === 'investor' ? 'Private investor / pitch deck' : 'Public brand deck')
        + (doc?.startup_name ? ` · ${doc.startup_name}` : ''),
      meta: { doc_id: doc?.id, startup_name: doc?.startup_name, deck_type: doc?.deck_type },
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[documents/delete] unexpected:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete document.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


async function handleStartupInsert(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json() as {
      id: string; name: string; tagline: string; description: string;
      founder: string; industry: string; stage: string;
      fundingGoal: number; raised: number; pitchScore: number; members: number;
      created_by_email?: string; owner_email?: string; owner_password?: string;
      __dryRun?: boolean;
    };
    // ── Identity ───────────────────────────────────────────────────────────
    // Must be logged in. Ownership is taken from the VERIFIED token, never from
    // the client body — so nobody can register/edit a startup as someone else.
    const authed = await getAuthedUser(request);
    if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
    const { data: existingStartup } = await admin
      .from('startups').select('id, created_by_email, owner_email').eq('id', body.id).maybeSingle();
    // Editing an existing startup requires being its owner (or admin).
    if (existingStartup && !(await canManageStartup(admin, body.id, authed))) {
      return jsonRes({ error: 'You can only modify your own startup.' }, 403);
    }
    // ── Duplicate password guard ──────────────────────────────────────────
    // Each startup must have a unique password. If the submitted password
    // matches ANY existing startup's hash, reject it immediately.
    if (body.owner_password) {
      const { data: existingHashes } = await admin
        .from('startups')
        .select('id, owner_password_hash')
        .not('owner_password_hash', 'is', null);
      if (existingHashes) {
        for (const row of existingHashes) {
          // Skip the current startup if it's an update (same id)
          if (row.id === body.id) continue;
          if (row.owner_password_hash && await verifyPassword(body.owner_password, row.owner_password_hash)) {
            return new Response(
              JSON.stringify({ error: 'PASSWORD_TAKEN', message: 'This password is already in use by another startup. Please choose a stronger, unique password.' }),
              { status: 409, headers: { 'Content-Type': 'application/json' } },
            );
          }
        }
      }
    }

    // If this was just a dry-run password uniqueness check, stop here.
    if (body.__dryRun) return jsonRes({ ok: true });

    const passwordHash = body.owner_password ? await hashPassword(body.owner_password) : null;
    const upsertPayload: Record<string, any> = {
      id: body.id, name: body.name, tagline: body.tagline,
      description: body.description, founder: body.founder,
      industry: body.industry, stage: body.stage,
      funding_goal: body.fundingGoal, raised: body.raised,
      pitch_score: body.pitchScore, members: body.members,
      // Creator is fixed to whoever first made it; owner defaults to the
      // verified caller. Both come from the token, not the request body.
      created_by_email: existingStartup?.created_by_email ?? authed.email,
      owner_email: body.owner_email ?? existingStartup?.owner_email ?? authed.email,
      owner_password_hash: passwordHash,
    };
    // New registrations go into the pending queue; edits keep the existing status.
    if (!existingStartup) upsertPayload.status = 'pending';
    const { data, error } = await admin
      .from('startups')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    // Record the registration in the append-only activity log (new regs only, not edits).
    if (!existingStartup) {
      await logActivity({
        type: 'startup_registered',
        actor_email: authed.email,
        title: body.name,
        detail: [body.industry, body.stage].filter(Boolean).join(' · ') || null,
        meta: { startup_id: body.id },
      });
    }
    // Promote the verified caller to 'founder' when they register a new startup
    if (!existingStartup && authed.email !== PERMANENT_ADMIN_EMAIL) {
      const { data: currentUser } = await admin.from('users').select('role').eq('email', authed.email).maybeSingle();
      if (currentUser && currentUser.role === 'visitor') {
        await admin.from('users').update({ role: 'founder' }).eq('email', authed.email);
      }
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to save startup.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Startup Delete ───────────────────────────────────────────────────────────
async function handleStartupDelete(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { id, startupName, reason } = await request.json() as { id: string; startupName: string; reason?: string };
    // Identity + ownership: only the verified owner (or admin) may delete a startup.
    const authed = await getAuthedUser(request);
    if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
    if (!(await canManageStartup(admin, id, authed))) return jsonRes({ error: 'You can only delete your own startup.' }, 403);
    // Audit the reason the founder gave for removal (re-adding later requires fresh admin approval).
    console.log(`[startups/delete] "${startupName}" (${id}) removed by ${(authed as any)?.email ?? 'unknown'} — reason: ${reason?.trim() || '(none given)'}`);
    // Delete linked documents first using startup_name
    if (startupName) {
      await admin.from('documents').delete().eq('startup_name', startupName);
    }
    // Then delete the startup
    await admin.from('startups').delete().eq('id', id);
    // Log the removal with the founder's stated reason for the admin activity feed.
    await logActivity({
      type: 'startup_removed',
      actor_email: (authed as any)?.email ?? null,
      title: startupName || id,
      detail: reason?.trim() || 'No reason given',
      meta: { startup_id: id },
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[startups/delete]', err);
    return new Response(JSON.stringify({ error: 'Failed to delete startup.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Startup Update (stage/raised) ───────────────────────────────────────────
async function handleStartupUpdate(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json() as { id: string; [key: string]: unknown };
    const { id, ...fields } = body;
    // Identity + ownership: only the verified owner (or admin) may edit a startup.
    const authed = await getAuthedUser(request);
    if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
    if (!(await canManageStartup(admin, id, authed))) return jsonRes({ error: 'You can only modify your own startup.' }, 403);
    const mapped: Record<string, unknown> = {};
    if (fields.stage !== undefined) mapped.stage = fields.stage;
    if (fields.raised !== undefined) mapped.raised = fields.raised;
    if (fields.pitchScore !== undefined) mapped.pitch_score = fields.pitchScore;
    if (fields.fundingGoal !== undefined) mapped.funding_goal = fields.fundingGoal;
    if (fields.name !== undefined) mapped.name = fields.name;
    if (fields.tagline !== undefined) mapped.tagline = fields.tagline;
    if (fields.description !== undefined) mapped.description = fields.description;
    if (fields.founder !== undefined) mapped.founder = fields.founder;
    if (fields.industry !== undefined) mapped.industry = fields.industry;
    const { data, error } = await admin.from('startups').update(mapped).eq('id', id).select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to update startup.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Document Insert ──────────────────────────────────────────────────────────
async function handleDocumentInsert(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[documents] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    return new Response(
      JSON.stringify({ error: 'Server not configured with Supabase credentials.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const name   = ((formData.get('name')   as string) || '').trim();
    const type   =  (formData.get('type')   as string) || 'Doc';
    const status =  (formData.get('status') as string) || 'Draft';
    const file   =   formData.get('file')   as File | null;
    // 'brand' = public deck, 'investor' = restricted corporate pitch deck (visible in Scout Hub diligence room)
    const deckTypeRaw = (formData.get('deck_type') as string) || 'brand';
    const deck_type = deckTypeRaw === 'investor' ? 'investor' : 'brand';

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Document name is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Identity + ownership BEFORE any storage write, so a rejected upload can't
    // leave an orphaned file. Uploads must target a startup you own (or admin).
    const authed = await getAuthedUser(request);
    if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
    const ownerStartupName = (formData.get('startup_name') as string) || '';
    if (authed.role !== 'admin' && ownerStartupName) {
      const { data: st } = await admin.from('startups').select('created_by_email, owner_email').eq('name', ownerStartupName).maybeSingle();
      const owners = st ? [st.created_by_email, st.owner_email].filter(Boolean).map((x: string) => x.toLowerCase()) : [];
      if (!owners.includes(authed.email.toLowerCase())) return jsonRes({ error: 'You can only upload documents for your own startup.' }, 403);
    }

    let file_url = '', file_path = '';

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${Date.now()}-${name.replace(/\s+/g, '-')}.${ext}`;
      const buffer = await file.arrayBuffer();

      const { data: storageData, error: storageErr } = await admin.storage
        .from('pitch-vault')
        .upload(filePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (storageErr) { console.error('[documents] Storage error:', storageErr); throw new Error(storageErr.message); }

      file_path = storageData.path;
      const { data: urlData } = admin.storage.from('pitch-vault').getPublicUrl(file_path);
      file_url = urlData.publicUrl;
    }

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date();

    const startupName = (formData.get('startup_name') as string) || '';
    const replacingId = (formData.get('replacing_id') as string) || '';

    // ── One-doc-per-category enforcement ─────────────────────────────────────
    // If replacing_id is supplied → delete the old document first (storage + DB row)
    if (replacingId) {
      const { data: oldDoc } = await admin.from('documents').select('file_path').eq('id', replacingId).single();
      if (oldDoc?.file_path) {
        await admin.storage.from('pitch-vault').remove([oldDoc.file_path]);
      }
      await admin.from('documents').delete().eq('id', replacingId);
    } else if (startupName) {
      // Catch-all: delete any existing doc for this startup+deck_type even without explicit id
      const { data: existingDocs } = await admin.from('documents')
        .select('id, file_path')
        .eq('startup_name', startupName)
        .eq('deck_type', deck_type);
      if (existingDocs && existingDocs.length > 0) {
        const paths = existingDocs.map((d: any) => d.file_path).filter(Boolean);
        if (paths.length) await admin.storage.from('pitch-vault').remove(paths);
        await admin.from('documents').delete().in('id', existingDocs.map((d: any) => d.id));
      }
    }

    const newDoc = {
      name,
      type,
      status,
      date:  `${months[today.getMonth()]} ${today.getDate()}`,
      views: 0,
      score: 50, // placeholder — real score set by FitScore Phase 2 after analysis
      file_url,
      file_path,
      startup_name: startupName,
      deck_type,
    };

    const { data, error } = await admin
      .from('documents')
      .insert(newDoc)
      .select()
      .single();

    if (error) {
      console.error('[documents] DB insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Record the upload in the append-only activity log (survives startup deletion).
    await logActivity({
      type: 'doc_uploaded',
      actor_email: authed.email,
      title: name,
      detail: deck_type === 'investor'
        ? `Private investor / pitch deck${startupName ? ` · ${startupName}` : ''}`
        : `Public brand deck${startupName ? ` · ${startupName}` : ''}`,
      meta: { doc_id: data.id, startup_name: startupName, deck_type, doc_type: type },
    });

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[documents] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Failed to insert document.';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
async function handleChatRequest(request: Request, _env: unknown): Promise<Response> {
  try {
    const { messages, context } = await request.json() as { messages: ChatCompletionMessageParam[]; context?: { pathname?: string; tab?: string; section?: string } };
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
    const knowledge = getContextualKnowledge(context);
    const SYSTEM_PROMPT = `You are a helpful assistant for Sanyog, an innovation procurement platform connecting government departments with startups — from challenge statement, through a sandbox pilot, to compliant scale-up. It is NOT an investment or fundraising platform.
  Use ONLY the platform knowledge below to answer user questions. If a page/tab context is provided, tailor your reply to that context in addition to the global knowledge, but do not refuse to answer general questions when the user is not on a specific tab.
  Answer strictly from the public product information provided. Never disclose internal systems, source code, infrastructure, databases, security/authentication, admin operations, API details, or any specific user's data — decline politely and redirect if asked. Do not invent facts that are not in the knowledge below.
  Never invent legal citations, rule numbers, scheme names, monetary thresholds or eligibility figures. If asked for a precise legal provision or threshold that is not in the knowledge below, say it should be confirmed with the department or the Sanyog team.
  Be friendly, concise, and helpful. If you cannot answer, say: "For more details, please reach out to the Sanyog team."\n\n${knowledge}`;
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL_CHAT,
      max_tokens: 500,
      messages: [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages],
    });
    return new Response(
      JSON.stringify({ reply: response.choices[0].message.content }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Auth utilities ───────────────────────────────────────────────────────────
const enc = (s: string) => new TextEncoder().encode(s);
const b64url = (s: string) =>
  btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64urlBuf = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function createJWT(payload: object, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc(data));
  return `${data}.${b64urlBuf(sig)}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const key = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  let sigBytes: ArrayBuffer;
  try {
    const arr = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    sigBytes = arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
  } catch { return null; }
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc(`${h}.${p}`));
  if (!ok) return null;
  try {
    const pl = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    if (pl.exp && pl.exp < Math.floor(Date.now() / 1000)) return null;
    return pl;
  } catch { return null; }
}

function parseCookies(request: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

function setJWTCookie(token: string): string {
  return `jwt=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`;
}
function clearJWTCookie(): string {
  return `jwt=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function jsonRes(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

// ─── Password hashing via WebCrypto (PBKDF2-SHA256) ──────────────────────────
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [, saltHex, hashHex] = stored.split(':');
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const newHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    return newHex === hashHex;
  } catch { return false; }
}

// ─── Startup Auth: set ownership password ────────────────────────────────────
async function handleStartupAuthSet(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json() as { startup_id: string; owner_email: string; password: string };
    if (!body.startup_id || !body.owner_email || !body.password) return jsonRes({ error: 'Missing fields.' }, 400);
    if (body.password.length < 6) return jsonRes({ error: 'Password too short.' }, 400);
    // Only the verified owner (or admin) may (re)set a startup's ownership creds —
    // otherwise anyone could claim ownership of any startup.
    const authed = await getAuthedUser(request);
    if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
    if (!(await canManageStartup(admin, body.startup_id, authed))) return jsonRes({ error: 'You can only set credentials for your own startup.' }, 403);
    const hash = await hashPassword(body.password);
    const { error } = await admin.from('startups').update({ owner_email: body.owner_email, owner_password_hash: hash }).eq('id', body.startup_id);
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── Events: create / submit ─────────────────────────────────────────────────
async function handleEventCreate(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  try {
    const body = await request.json() as Record<string, unknown>;
    const {
      title, type, date, time, location, locationMode,
      description, maxCapacity, prize, applicationRequired, registrationDeadline,
      organiserName, organiserEmail, organiserOrg, submittedBy,
    } = body as {
      title: string; type: string; date: string; time: string;
      location: string; locationMode: string; description: string;
      maxCapacity?: string; prize?: string; applicationRequired?: boolean;
      registrationDeadline?: string; organiserName: string;
      organiserEmail: string; organiserOrg: string; submittedBy?: string;
    };
    if (!title || !type || !date || !time || !location || !description || !organiserName || !organiserEmail || !organiserOrg) {
      return jsonRes({ error: 'Missing required fields.' }, 400);
    }
    const { error } = await db.from('events').insert({
      title: title.trim(),
      type,
      event_date: date,
      event_time: time,
      location_mode: locationMode ?? 'physical',
      location: location.trim(),
      description: description.trim(),
      max_capacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
      prize: prize?.trim() || null,
      application_required: applicationRequired ?? false,
      registration_deadline: registrationDeadline || null,
      organiser_name: organiserName.trim(),
      organiser_email: organiserEmail.trim().toLowerCase(),
      organiser_org: organiserOrg.trim(),
      submitted_by: submittedBy ?? null,
      status: 'pending',
    });
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── Events: list pending (admin only) ───────────────────────────────────────
async function handleEventsPending(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  // Guard: must be admin
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const { data, error } = await db.from('events').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes(data ?? []);
}

// ─── Events: approve or reject (admin only) ───────────────────────────────────
async function handleEventsReview(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  // Guard: must be admin
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const { id, action } = await request.json() as { id: string; action: 'approve' | 'reject' };
  if (!id || !['approve', 'reject'].includes(action)) return jsonRes({ error: 'Invalid request.' }, 400);
  const { error } = await db.from('events').update({ status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', id);
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes({ ok: true });
}

// ─── Events: RSVP from Scout Hub ─────────────────────────────────────────────
async function handleEventRsvp(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  try {
    const body = await request.json() as Record<string, string>;
    const { event_id, event_title, event_date, name, firm, role, email, phone, note, source } = body;
    if (!event_id || !name || !email) return jsonRes({ error: 'Missing required fields.' }, 400);
    const { error } = await db.from('event_rsvps').insert({
      event_id, event_title, event_date,
      attendee_name: name, attendee_firm: firm, attendee_role: role,
      attendee_email: email.toLowerCase(), attendee_phone: phone || null,
      note: note || null, source: source || 'unknown',
    });
    if (error) {
      // Table may not exist yet — still return success so UI doesn't break
      console.warn('[events/rsvp] insert error (run migration 006?):', error.message);
    }
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── Startup Advance: submit request ─────────────────────────────────────────
async function handleAdvanceRequest(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  try {
    const formData = await request.formData();
    const startup_id   = formData.get('startup_id') as string;
    const startup_name = formData.get('startup_name') as string;
    const current_stage = formData.get('current_stage') as string;
    const target_stage  = formData.get('target_stage') as string;
    const justification = formData.get('justification') as string;
    const submitted_by  = formData.get('submitted_by') as string;
    const proofFile = formData.get('proof') as File | null;
    if (!startup_id || !target_stage || !justification) return jsonRes({ error: 'Missing required fields.' }, 400);
    let proof_url: string | null = null;
    if (proofFile && proofFile.size > 0) {
      const ext = proofFile.name.split('.').pop() ?? 'bin';
      const path = `advance-proofs/${startup_id}/${Date.now()}.${ext}`;
      const buf = await proofFile.arrayBuffer();
      const { data: uploadData } = await db.storage.from('documents').upload(path, buf, { contentType: proofFile.type, upsert: true });
      if (uploadData) {
        const { data: urlData } = db.storage.from('documents').getPublicUrl(path);
        proof_url = urlData?.publicUrl ?? null;
      }
    }
    const { error } = await db.from('startup_advance_requests').insert({
      startup_id, startup_name, current_stage, target_stage,
      justification, submitted_by, proof_url, status: 'pending',
    });
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── Startup Advance: list pending (admin only) ───────────────────────────────
async function handleAdvancePending(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const { data, error } = await db.from('startup_advance_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes(data ?? []);
}

// ─── Startup Advance: approve or reject (admin only) ─────────────────────────
async function handleAdvanceReview(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(supabaseUrl, supabaseKey);
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const { id, action, startup_id, target_stage } = await request.json() as { id: string; action: 'approve' | 'reject'; startup_id?: string; target_stage?: string };
  if (!id || !['approve', 'reject'].includes(action)) return jsonRes({ error: 'Invalid request.' }, 400);
  await db.from('startup_advance_requests').update({ status: action === 'approve' ? 'approved' : 'rejected' }).eq('id', id);
  if (action === 'approve' && startup_id && target_stage) {
    const newRaised = target_stage === 'Scaled' ? undefined : undefined; // let client handle raised
    await db.from('startups').update({ stage: target_stage }).eq('id', startup_id);
  }
  return jsonRes({ ok: true });
}

// ─── Startup Auth: verify ownership password ─────────────────────────────────
async function handleStartupAuthVerify(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json() as { startup_id: string; password: string };
    if (!body.startup_id || !body.password) return jsonRes({ error: 'Missing fields.' }, 400);
    const { data: startup } = await admin.from('startups').select('owner_password_hash').eq('id', body.startup_id).maybeSingle();
    if (!startup?.owner_password_hash) return jsonRes({ error: 'No ownership credentials set for this startup.' }, 404);
    const ok = await verifyPassword(body.password, startup.owner_password_hash);
    if (!ok) return jsonRes({ error: 'Incorrect password.' }, 401);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── Permanent admin email — hardcoded, never overrideable ───────────────────
const PERMANENT_ADMIN_EMAIL = 'ashutoshforcorporate@gmail.com';
function resolveRole(email: string, dbRole?: string): string {
  if (email.toLowerCase() === PERMANENT_ADMIN_EMAIL) return 'admin';
  return dbRole ?? 'visitor';
}

function generateOTP(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(100000 + (n % 900000));
}

function generateRandomString(len: number): string {
  const bytes = new Uint8Array(Math.ceil(len * 3 / 4));
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    .slice(0, len);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc(verifier));
  return b64urlBuf(hash);
}

function getAuthAdmin(env: Env) {
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sendOTPEmail(to: string, otp: string, apiKey: string): Promise<void> {
  if (!apiKey) {
    console.log(`[DEV — no RESEND_API_KEY] OTP for ${to}: ${otp}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sanyog <otp@drusti.online>',
      to: [to],
      subject: 'Sanyog Verification',
      text: `Your Sanyog verification code is: ${otp}\n\nEnter this code to continue. It expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a14;font-family:Inter,Arial,sans-serif"><div style="max-width:480px;margin:40px auto;background:#0d0d1f;border-radius:16px;padding:40px 32px;text-align:center"><div style="width:48px;height:48px;background:#7c3aed;border-radius:12px;margin:0 auto 20px;display:flex;align-items:center;justify-content:center"><svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><h2 style="color:#ffffff;font-size:20px;font-weight:700;margin:0 0 8px">Sanyog Verification</h2><p style="color:#9ca3af;font-size:14px;margin:0 0 28px">Enter this code to continue. It expires in <strong style="color:#ffffff">10 minutes</strong>.</p><div style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;padding:24px;margin-bottom:24px"><p style="color:#ffffff;font-size:36px;font-weight:800;letter-spacing:14px;margin:0">${otp}</p></div><p style="color:#6b7280;font-size:12px;margin:0">If you didn't request this, ignore this email.</p></div></body></html>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('[resend] OTP email failed:', err);
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

// ─── Auth: Sign Up ────────────────────────────────────────────────────────────
async function handleSignUp(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; name?: string };
  try { body = await request.json() as { email?: string; name?: string }; }
  catch { return jsonRes({ message: 'Invalid request body.' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const name  = (body.name  || '').trim();
  console.log('[signup] body received:', { email, name });
  if (!email || !name) return jsonRes({ message: 'Email and name are required.' }, 400);

  try {
    const _dbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const _dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
    console.log('[signup] SUPABASE_URL (first 10):', _dbUrl.slice(0, 10) || '(not set)');
    console.log('[signup] SUPABASE_SERVICE_ROLE_KEY (first 10):', _dbKey.slice(0, 10) || '(not set)');
    const admin = getAuthAdmin(env);

    const { data: emailUser, error: emailErr } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    console.log('[signup] email lookup result — data:', emailUser, '| error:', JSON.stringify(emailErr));
    if (emailErr) { console.error('[signup] users lookup error:', emailErr); return jsonRes({ message: 'Database error. Please try again.' }, 500); }

    if (emailUser) {
      if (emailUser.auth_method === 'google') {
        return jsonRes({ case: 'google_conflict', message: 'This email is already registered with Google login. Please use Google to log in.' }, 409);
      }
      if (emailUser.name === name) {
        return jsonRes({ case: 'already_registered', message: "You're already registered. Log in to continue." }, 409);
      }
      return jsonRes({ case: 'email_taken', message: 'This email is already registered under a different name.' }, 409);
    }

    const { data: nameUser, error: nameErr } = await admin.from('users').select('id').eq('name', name).maybeSingle();
    console.log('[signup] name lookup result — data:', nameUser, '| error:', JSON.stringify(nameErr));
    if (nameErr) { console.error('[signup] name lookup error:', nameErr); return jsonRes({ message: 'Database error. Please try again.' }, 500); }
    if (nameUser) {
      return jsonRes({ case: 'name_taken', message: 'This name is already taken by another account.' }, 409);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: otpErr } = await admin.from('otps').insert({ email, code: otp, expires_at: expiresAt, used: 0 });
    console.log('[signup] OTP insert error:', JSON.stringify(otpErr));
    if (otpErr) { console.error('[signup] OTP insert error (full):', otpErr); return jsonRes({ message: 'Failed to create OTP. Please try again.' }, 500); }

    const resendKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
    try {
      await sendOTPEmail(email, otp, resendKey);
    } catch (emailErr) {
      console.error('[signup] Email send failed:', emailErr);
      return jsonRes({ message: 'Failed to send OTP email. Please verify your email address and try again.' }, 500);
    }

    console.log('[signup] OTP sent successfully to:', email);
    return jsonRes({ ok: true, message: 'OTP sent. Check your email.' });
  } catch (err) {
    console.error('[signup] unexpected error:', err);
    return jsonRes({ message: 'An error occurred. Please try again.' }, 500);
  }
}

// ─── Auth: Verify OTP ────────────────────────────────────────────────────────
async function handleVerifyOTP(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; code?: string; type?: 'signup' | 'login'; name?: string };
  try { body = await request.json() as typeof body; }
  catch { return jsonRes({ message: 'Invalid request body.' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const code  = (body.code  || '').trim();
  const type  = body.type || 'login';
  const name  = (body.name  || '').trim();

  if (!email || !code) return jsonRes({ message: 'Email and code are required.' }, 400);

  const admin  = getAuthAdmin(env);
  const secret = env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';

  const { data: otpRow } = await admin
    .from('otps')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('used', 0)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) {
    const { data: anyOtp } = await admin.from('otps').select('used,expires_at').eq('email', email).eq('code', code).maybeSingle();
    if (anyOtp?.used) return jsonRes({ message: 'Invalid OTP. Please try again.' }, 400);
    if (anyOtp && new Date(anyOtp.expires_at) < new Date()) return jsonRes({ message: 'OTP has expired. Please request a new one.' }, 400);
    return jsonRes({ message: 'Invalid OTP. Please try again.' }, 400);
  }

  await admin.from('otps').update({ used: 1 }).eq('id', otpRow.id);

  let user: Record<string, unknown>;

  if (type === 'signup') {
    if (!name) return jsonRes({ message: 'Name is required for sign up.' }, 400);
    // Try with role column; fall back without it if migration 003 not yet run
    let insertResult = await admin.from('users')
      .insert({ email, name, auth_method: 'otp', role: resolveRole(email, 'visitor') })
      .select().single();
    if (insertResult.error && (insertResult.error.message?.includes('role') || insertResult.error.code === '42703')) {
      console.warn('[verify-otp] role column missing — retrying without it. Run migration 003 to fix permanently.');
      insertResult = await admin.from('users')
        .insert({ email, name, auth_method: 'otp' })
        .select().single();
    }
    if (insertResult.error) return jsonRes({ message: 'Failed to create account. Please try again.' }, 500);
    user = insertResult.data;
  } else {
    const { data: existing } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    if (!existing) return jsonRes({ message: 'User not found. Please sign up first.' }, 404);
    user = existing;
  }

  const jwtPayload = {
    email: user.email,
    name: user.name,
    google_id: user.google_id ?? null,
    auth_method: user.auth_method,
    avatar_url: user.avatar_url ?? null,
    role: resolveRole(user.email as string, user.role as string | undefined),
  };

  const token = await createJWT(jwtPayload, secret);

  return new Response(JSON.stringify({ ok: true, user: jwtPayload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': setJWTCookie(token) },
  });
}

// ─── Auth: Log In ─────────────────────────────────────────────────────────────
async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { email?: string };
  try { body = await request.json() as { email?: string }; }
  catch { return jsonRes({ message: 'Invalid request body.' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) return jsonRes({ message: 'Email is required.' }, 400);

  try {
    const admin = getAuthAdmin(env);
    const { data: user, error: userErr } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    if (userErr) { console.error('[login] users lookup error:', userErr); return jsonRes({ message: 'Database error. Please try again.' }, 500); }

    if (!user) return jsonRes({ message: 'User not found. Please sign up first.' }, 404);
    if (user.auth_method === 'google') {
      return jsonRes({ case: 'google_conflict', message: 'This email is registered with Google login. Please use the Continue with Google button to log in.' }, 409);
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: otpErr } = await admin.from('otps').insert({ email, code: otp, expires_at: expiresAt, used: 0 });
    if (otpErr) { console.error('[login] OTP insert error:', otpErr); return jsonRes({ message: 'Failed to create OTP. Please try again.' }, 500); }

    const resendKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY || '';
    try {
      await sendOTPEmail(email, otp, resendKey);
    } catch (emailErr) {
      console.error('[login] Email send failed:', emailErr);
      return jsonRes({ message: 'Failed to send OTP email. Please try again.' }, 500);
    }

    return jsonRes({ ok: true, message: 'OTP sent. Check your email.' });
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return jsonRes({ message: 'An error occurred. Please try again.' }, 500);
  }
}

// ─── Auth: Log Out ────────────────────────────────────────────────────────────
async function handleLogout(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearJWTCookie() },
  });
}

// ─── Auth: Me ─────────────────────────────────────────────────────────────────
async function handleMe(request: Request, env: Env): Promise<Response> {
  const secret  = env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const cookies = parseCookies(request);
  const token   = cookies['jwt'];
  if (!token) return jsonRes({ message: 'Not authenticated.' }, 401);
  const payload = await verifyJWT(token, secret);
  if (!payload) return jsonRes({ message: 'Invalid or expired session.' }, 401);
  // Always fetch fresh role from DB so admin changes propagate immediately
  const adminClient = getAuthAdmin(env);
  const { data: dbUser } = await adminClient.from('users').select('role').eq('email', payload.email as string).maybeSingle();
  return jsonRes({
    email: payload.email,
    name: payload.name,
    google_id: payload.google_id ?? null,
    auth_method: payload.auth_method,
    avatar_url: payload.avatar_url ?? null,
    role: resolveRole(payload.email as string, dbUser?.role as string | undefined),
  });
}

// ─── Auth: Delete Account ─────────────────────────────────────────────────────
async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const secret  = env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const cookies = parseCookies(request);
  const token   = cookies['jwt'];
  if (!token) return jsonRes({ message: 'Not authenticated.' }, 401);
  const payload = await verifyJWT(token, secret);
  if (!payload) return jsonRes({ message: 'Invalid or expired session.' }, 401);

  const admin = getAuthAdmin(env);
  const email = payload.email as string;
  await admin.from('otps').delete().eq('email', email);
  const { error } = await admin.from('users').delete().eq('email', email);
  if (error) return jsonRes({ message: 'Failed to delete account.' }, 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearJWTCookie() },
  });
}

// ─── Auth: Google Init ────────────────────────────────────────────────────────
async function handleGoogleInit(request: Request, env: Env): Promise<Response> {
  try {
    const clientId    = env.GOOGLE_CLIENT_ID    || process.env.GOOGLE_CLIENT_ID    || '';
    const frontendUrl = env.FRONTEND_URL        || process.env.FRONTEND_URL        || 'http://localhost:3000';

    console.log('[google-init] clientId present:', !!clientId, '| frontendUrl:', frontendUrl);
    if (!clientId) return jsonRes({ message: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID to your environment.' }, 500);

    const state        = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const redirectUri  = `${frontendUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'online',
    });

    const cookieOpts = 'HttpOnly; SameSite=Lax; Path=/; Max-Age=600';
    // login = only sign in an existing account; signup = create one if missing.
    const mode = new URL(request.url).searchParams.get('mode') === 'signup' ? 'signup' : 'login';
    const headers = new Headers({
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    });
    headers.append('Set-Cookie', `oauth_state=${state}; ${cookieOpts}`);
    headers.append('Set-Cookie', `oauth_code_verifier=${codeVerifier}; ${cookieOpts}`);
    headers.append('Set-Cookie', `oauth_mode=${mode}; ${cookieOpts}`);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('[google-init] unexpected error:', err);
    return jsonRes({ message: 'Google OAuth initialisation failed.' }, 500);
  }
}

// ─── Auth: Google Callback ────────────────────────────────────────────────────
async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url         = new URL(request.url);
  const code        = url.searchParams.get('code');
  const stateParam  = url.searchParams.get('state');
  const errorParam  = url.searchParams.get('error');

  const clientId     = env.GOOGLE_CLIENT_ID        || process.env.GOOGLE_CLIENT_ID        || '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET     || process.env.GOOGLE_CLIENT_SECRET     || '';
  const frontendUrl  = env.FRONTEND_URL             || process.env.FRONTEND_URL             || 'http://localhost:3000';
  const jwtSecret    = env.JWT_SECRET               || process.env.JWT_SECRET               || 'dev-secret-change-in-production';

  console.log('[google-callback] GOOGLE_CLIENT_ID (first 10):', clientId.slice(0, 10) || '(not set)');
  console.log('[google-callback] GOOGLE_CLIENT_SECRET (first 10):', clientSecret.slice(0, 10) || '(not set)');

  const redirect = (reason: string) => new Response(null, { status: 302, headers: { Location: `${frontendUrl}/auth-error?reason=${reason}` } });

  if (errorParam) return redirect('cancelled');
  if (!code || !stateParam) return redirect('invalid_state');

  const cookies      = parseCookies(request);
  const savedState   = cookies['oauth_state'];
  const codeVerifier = cookies['oauth_code_verifier'];
  const mode         = cookies['oauth_mode'] === 'signup' ? 'signup' : 'login';

  const clearCookies = [
    'oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    'oauth_code_verifier=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    'oauth_mode=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
  ];

  if (!savedState || savedState !== stateParam || !codeVerifier) return redirect('invalid_state');

  const redirectUri = `${frontendUrl}/api/auth/google/callback`;

  console.log('[google-callback] code received (first 10):', code.slice(0, 10));
  console.log('[google-callback] redirect_uri:', redirectUri);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: codeVerifier }),
  });

  console.log('[google-callback] token exchange HTTP status:', tokenRes.status);
  if (!tokenRes.ok) {
    const tokenErrBody = await tokenRes.text().catch(() => '');
    console.error('[google-callback] token exchange error body:', tokenErrBody);
    return redirect('token_failed');
  }
  const tokens = await tokenRes.json() as { access_token: string };
  console.log('[google-callback] token exchange OK, access_token present:', !!tokens.access_token);

  const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  console.log('[google-callback] userinfo HTTP status:', userInfoRes.status);
  if (!userInfoRes.ok) return redirect('userinfo_failed');

  const googleUser = await userInfoRes.json() as { sub: string; email: string; name: string; picture?: string };

  const admin = getAuthAdmin(env);
  const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL || '(not set)';
  console.log('[google-callback] googleUser:', { email: googleUser.email, name: googleUser.name, sub: googleUser.sub });
  console.log('[google-callback] using Supabase URL:', supabaseUrl);

  const { data: emailUser, error: emailLookupErr } = await admin.from('users').select('*').eq('email', googleUser.email).maybeSingle();
  if (emailLookupErr) {
    console.error('[google-callback] users table lookup failed:', JSON.stringify(emailLookupErr));
    console.error('[google-callback] → Have you run src/migrations/sanyog/01_core.sql in your Supabase dashboard?');
    return redirect('db_error');
  }

  if (emailUser && emailUser.auth_method === 'otp') {
    const h = new Headers({ Location: `${frontendUrl}/auth-error?reason=otp_conflict` });
    clearCookies.forEach(c => h.append('Set-Cookie', c));
    return new Response(null, { status: 302, headers: h });
  }

  let user: Record<string, unknown>;

  if (emailUser) {
    user = emailUser;
  } else {
    const { data: byGoogleId, error: googleIdLookupErr } = await admin.from('users').select('*').eq('google_id', googleUser.sub).maybeSingle();
    if (googleIdLookupErr) {
      console.error('[google-callback] google_id lookup failed:', JSON.stringify(googleIdLookupErr));
      return redirect('db_error');
    }
    if (byGoogleId) {
      user = byGoogleId;
    } else {
      // No account exists for this Google email. In LOGIN mode we must NOT
      // silently create one (this is the path a deleted user would hit) — bounce
      // them to sign up instead, mirroring the OTP "User not found" behaviour.
      // Only SIGNUP mode is allowed to create a fresh account.
      if (mode === 'login') {
        const h = new Headers({ Location: `${frontendUrl}/auth-error?reason=no_account` });
        clearCookies.forEach(c => h.append('Set-Cookie', c));
        return new Response(null, { status: 302, headers: h });
      }
      // Try inserting with role column first; fall back without it if migration 003 not yet run
      let insertResult = await admin.from('users')
        .insert({ email: googleUser.email, name: googleUser.name, google_id: googleUser.sub, avatar_url: googleUser.picture || null, auth_method: 'google', role: resolveRole(googleUser.email, 'visitor') })
        .select().single();
      if (insertResult.error && (insertResult.error.message?.includes('role') || insertResult.error.code === '42703')) {
        console.warn('[google-callback] role column missing — retrying without it. Run migration 003 to fix permanently.');
        insertResult = await admin.from('users')
          .insert({ email: googleUser.email, name: googleUser.name, google_id: googleUser.sub, avatar_url: googleUser.picture || null, auth_method: 'google' })
          .select().single();
      }
      if (insertResult.error) {
        console.error('[google-callback] user insert failed:', JSON.stringify(insertResult.error));
        console.error('[google-callback] → Have you run src/migrations/sanyog/01_core.sql in your Supabase dashboard?');
        return redirect('db_error');
      }
      if (!insertResult.data) {
        console.error('[google-callback] user insert returned null — likely blocked by RLS policy on users table. Disable RLS or add a service-role policy.');
        return redirect('db_error');
      }
      user = insertResult.data;
    }
  }

  if (!user!) {
    console.error('[google-callback] user is null after all branches — unexpected state.');
    return redirect('db_error');
  }

  const jwtPayload = {
    email: user.email,
    name: user.name,
    google_id: user.google_id ?? null,
    auth_method: user.auth_method,
    avatar_url: user.avatar_url ?? null,
    role: resolveRole(user.email as string, user.role as string | undefined),
  };

  const token = await createJWT(jwtPayload, jwtSecret);

  const h = new Headers({ Location: `${frontendUrl}/?token=${token}` });
  h.append('Set-Cookie', setJWTCookie(token));
  clearCookies.forEach(c => h.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers: h });
}

// ─── VC: helpers ─────────────────────────────────────────────────────────────
function getVCAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── Activity feed — append-only log surfaced in the admin panel ──────────────
// Fire-and-forget: a logging failure (e.g. the table isn't created yet) must
// never break the primary action, so everything is wrapped and swallowed.
type ActivityType =
  | 'startup_registered' | 'startup_approved' | 'startup_rejected'
  | 'doc_uploaded' | 'doc_removed' | 'startup_removed' | 'investor_removed'
  // Procurement pathway (stages 1–8)
  | 'challenge_published' | 'application_submitted' | 'panel_scored'
  | 'milestone_verified' | 'milestone_released' | 'kpi_validated'
  | 'endorsement_recorded' | 'scaled_up';
async function logActivity(ev: {
  type: ActivityType;
  actor_email?: string | null;
  title: string;
  detail?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    const db = getVCAdmin();
    const { error } = await db.from('activity_events').insert({
      type: ev.type,
      actor_email: ev.actor_email ?? null,
      title: ev.title,
      detail: ev.detail ?? null,
      meta: ev.meta ?? null,
    });
    if (error) console.error('[activity] insert error:', error.code, error.message, '(run migration 017 if permission denied)');
  } catch (err) {
    console.error('[activity] failed to log:', err);
  }
}

// ─── Admin: platform activity feed ────────────────────────────────────────────
// The append-only activity_events log is the source of truth, so a startup's full
// history (registered → approved → deck added → removed) survives even after the
// startup and its documents are deleted. We ALSO backfill from the live
// startups/documents tables for anything registered/uploaded before logging
// existed — deduplicated by natural key so nothing is counted twice.
async function handleAdminActivity(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const db = getVCAdmin();

  // 1. Authoritative append-only log (persists through deletion).
  let logged: any[] = [];
  try {
    const { data, error } = await db
      .from('activity_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    // Surface (don't swallow) real problems like a missing GRANT (42501) or a
    // missing table (42P01) — these leave the feed empty and are easy to miss.
    if (error) console.error('[activity] read error:', error.code, error.message, '(run migration 017 if this is a permission/relation error)');
    logged = data ?? [];
  } catch (err) { console.error('[activity] read threw:', err); logged = []; }

  // Track which entities the log already covers, so backfill doesn't duplicate them.
  const seen = new Set<string>();
  for (const e of logged) {
    const sid = e?.meta?.startup_id;
    const did = e?.meta?.doc_id;
    if (sid && e.type === 'startup_registered') seen.add(`reg:${sid}`);
    if (sid && (e.type === 'startup_approved' || e.type === 'startup_rejected')) seen.add(`rev:${sid}`);
    if (did && e.type === 'doc_uploaded') seen.add(`doc:${did}`);
  }

  const events: any[] = [...logged];

  // 2. Backfill from still-existing rows not yet represented in the log.
  const { data: startups } = await db
    .from('startups')
    .select('id, name, industry, stage, status, reviewed_at, created_at, created_by_email, owner_email')
    .order('created_at', { ascending: false })
    .limit(300);
  for (const s of startups ?? []) {
    if (!seen.has(`reg:${s.id}`)) {
      events.push({
        id: `reg-${s.id}`, type: 'startup_registered',
        actor_email: s.created_by_email || s.owner_email || null,
        title: s.name,
        detail: [s.industry, s.stage].filter(Boolean).join(' · ') || null,
        created_at: s.created_at,
      });
    }
    if (s.reviewed_at && (s.status === 'approved' || s.status === 'rejected') && !seen.has(`rev:${s.id}`)) {
      events.push({
        id: `rev-${s.id}`,
        type: s.status === 'approved' ? 'startup_approved' : 'startup_rejected',
        actor_email: null, title: s.name,
        detail: `Founder: ${s.created_by_email || s.owner_email || '—'}`,
        created_at: s.reviewed_at,
      });
    }
  }

  const { data: docs } = await db
    .from('documents')
    .select('id, name, type, deck_type, startup_name, created_at')
    .order('created_at', { ascending: false })
    .limit(300);
  for (const d of docs ?? []) {
    if (!seen.has(`doc:${d.id}`)) {
      events.push({
        id: `doc-${d.id}`, type: 'doc_uploaded', actor_email: null, title: d.name,
        detail: (d.deck_type === 'investor' ? 'Private investor / pitch deck' : 'Public brand deck')
          + (d.startup_name ? ` · ${d.startup_name}` : ''),
        created_at: d.created_at,
      });
    }
  }

  events.sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  return jsonRes({ events: events.slice(0, 200) });
}
// ─── Verified identity — the ONLY trustworthy way to know who is calling ───────
// Reads the jwt cookie and cryptographically verifies its HMAC signature with
// JWT_SECRET. Anything that decodes the token WITHOUT this is forgeable, so every
// protected endpoint must go through getAuthedUser / extractVCEmail / requireAdmin.
async function getAuthedUser(request: Request): Promise<{ email: string; role: string } | null> {
  const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET || 'dev-secret-change-in-production';
  const cookies = parseCookies(request);
  const token = cookies['jwt'];
  if (!token) return null;
  const payload = await verifyJWT(token, secret);          // ← signature checked here
  if (!payload?.email) return null;
  const email = String(payload.email).toLowerCase();
  return { email, role: resolveRole(email, payload.role as string | undefined) };
}

async function extractVCEmail(request: Request): Promise<string | null> {
  const u = await getAuthedUser(request);
  return u?.email ?? null;
}

// Admin guard — returns an error Response if the caller is not a verified admin,
// or null if they are. Usage: `const g = await requireAdmin(request); if (g) return g;`
async function requireAdmin(request: Request): Promise<Response | null> {
  const u = await getAuthedUser(request);
  if (!u) return jsonRes({ error: 'Unauthorized.' }, 401);
  if (u.role !== 'admin') return jsonRes({ error: 'Admin only.' }, 403);
  return null;
}

// Ownership check — true if the verified caller created/owns the startup, or is admin.
async function canManageStartup(admin: any, startupId: string, authed: { email: string; role: string }): Promise<boolean> {
  if (authed.role === 'admin') return true;
  const { data } = await admin.from('startups').select('created_by_email, owner_email').eq('id', startupId).maybeSingle();
  if (!data) return false;
  const owners = [data.created_by_email, data.owner_email].filter(Boolean).map((x: string) => x.toLowerCase());
  return owners.includes(authed.email.toLowerCase());
}

// ─── VC: Save/Update mandate ──────────────────────────────────────────────────
async function handleVCMandate(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const body = await request.json() as {
      firm_name: string; partner_name: string; investment_thesis?: string;
      sectors?: string; stage_pref?: string; check_min?: number; check_max?: number;
      password?: string;
    };
    if (!body.firm_name || !body.partner_name) return jsonRes({ error: 'Firm name and partner name are required.' }, 400);

    // Build upsert payload
    const payload: Record<string, unknown> = {
      email,
      firm_name: body.firm_name,
      partner_name: body.partner_name,
      investment_thesis: body.investment_thesis ?? null,
      sectors: body.sectors ?? null,
      stage_pref: body.stage_pref ?? null,
      check_min: body.check_min ?? null,
      check_max: body.check_max ?? null,
      updated_at: new Date().toISOString(),
    };

    // Hash new password if provided
    if (body.password && body.password.trim().length > 0) {
      payload.password_hash = await hashPassword(body.password);
    }

    const { error } = await db.from('vc_profiles')
      .upsert(payload, { onConflict: 'email' });
    if (error) {
      console.error('[vc/mandate] upsert error:', error.message);
      return jsonRes({ error: error.message }, 500);
    }
    return jsonRes({ ok: true });
  } catch (e) {
    console.error('[vc/mandate] unexpected error:', e);
    return jsonRes({ error: e instanceof Error ? e.message : 'Server error.' }, 500);
  }
}

// ─── VC: Get my mandate ───────────────────────────────────────────────────────
async function handleVCGetMandate(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  const { data } = await db.from('vc_profiles')
    .select('firm_name,partner_name,investment_thesis,sectors,stage_pref,check_min,check_max,status')
    .eq('email', email).maybeSingle();
  return jsonRes({ profile: data ?? null });
}

// ─── VC: Public directory — list verified VCs (visible to everyone) ──────────
async function handleVCList(_request: Request): Promise<Response> {
  const db = getVCAdmin();
  const { data, error } = await db.from('vc_profiles')
    .select('email,firm_name,partner_name,investment_thesis,sectors,stage_pref,check_min,check_max,status,created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes({ vcs: data ?? [] });
}

// ─── VC: Confirm password ─────────────────────────────────────────────────────
async function handleVCConfirmPassword(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const { password } = await request.json() as { password: string };
    if (!password) return jsonRes({ error: 'Password required.' }, 400);
    const { data } = await db.from('vc_profiles').select('password_hash').eq('email', email).maybeSingle();
    if (!data?.password_hash) return jsonRes({ error: 'No VC credentials set. Please set up your mandate first.' }, 404);
    const ok = await verifyPassword(password, data.password_hash);
    if (!ok) return jsonRes({ error: 'Incorrect password.' }, 401);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── VC: Submit deal interest ─────────────────────────────────────────────────
async function handleVCDealInterest(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const body = await request.json() as { startup_id: string; startup_name: string; note?: string; vc_firm?: string };
    if (!body.startup_id || !body.startup_name) return jsonRes({ error: 'Missing startup info.' }, 400);
    const { error } = await db.from('deal_interests').insert({
      vc_email: email,
      vc_firm: body.vc_firm ?? null,
      startup_id: body.startup_id,
      startup_name: body.startup_name,
      note: body.note ?? null,
    });
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── VC: Request diligence doc access ────────────────────────────────────────
async function handleVCDiligenceRequest(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const body = await request.json() as { doc_id: string; doc_name: string; startup: string; reason?: string; vc_firm?: string };
    if (!body.doc_id || !body.doc_name || !body.startup) return jsonRes({ error: 'Missing doc info.' }, 400);
    const { error } = await db.from('diligence_requests').insert({
      vc_email: email,
      vc_firm: body.vc_firm ?? null,
      doc_id: body.doc_id,
      doc_name: body.doc_name,
      startup: body.startup,
      reason: body.reason ?? null,
    });
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── VC: Shortlist / revoke a startup → notify admin ─────────────────────────
async function handleVCShortlist(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const body = await request.json() as { action: string; startup_id: string; startup_name: string; reason?: string; vc_firm?: string };
    if (!['shortlisted', 'revoked'].includes(body.action) || !body.startup_id || !body.startup_name) {
      return jsonRes({ error: 'Invalid shortlist event.' }, 400);
    }
    // A revoke must carry a reason (the VC states why at the portal)
    if (body.action === 'revoked' && !(body.reason || '').trim()) {
      return jsonRes({ error: 'A reason is required to revoke a shortlist.' }, 400);
    }
    const { error } = await db.from('shortlist_events').insert({
      vc_email: email,
      vc_firm: body.vc_firm ?? null,
      action: body.action,
      startup_id: body.startup_id,
      startup_name: body.startup_name,
      reason: body.reason ?? null,
    });
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── VC: Remove a fund from the Investor Network ──────────────────────────────
// An investor may remove their own listing; an admin may remove anyone's — both
// must state a reason, mirroring the founder-side startup removal flow.
async function handleVCDelete(request: Request): Promise<Response> {
  const authed = await getAuthedUser(request);
  if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
  try {
    const { email: requestedEmail, firm_name, reason } = await request.json() as { email?: string; firm_name?: string; reason?: string };
    if (!(reason || '').trim()) return jsonRes({ error: 'A reason is required to remove an investor.' }, 400);
    // Server is authoritative: a non-admin can only ever remove THEIR OWN listing,
    // so we ignore whatever email the client sent and key off the verified session.
    // An admin may target any investor by the supplied email.
    const isAdmin = authed.role === 'admin';
    const targetEmail = isAdmin ? (requestedEmail || '').trim().toLowerCase() : authed.email.toLowerCase();
    if (!targetEmail) return jsonRes({ error: 'Missing investor email.' }, 400);
    const db = getVCAdmin();
    const { error } = await db.from('vc_profiles').delete().eq('email', targetEmail);
    if (error) return jsonRes({ error: error.message }, 500);
    await logActivity({
      type: 'investor_removed',
      actor_email: authed.email,
      title: firm_name || targetEmail,
      detail: reason!.trim(),
      meta: { vc_email: targetEmail },
    });
    return jsonRes({ ok: true });
  } catch (e) {
    console.error('[vc/delete] unexpected error:', e);
    return jsonRes({ error: 'Server error.' }, 500);
  }
}

// ─── VC → Founder: send a message to the founder's registered email ──────────
async function sendFounderMessageEmail(opts: {
  to: string; founderName: string; startup: string;
  vcName: string; vcFirm: string; vcEmail: string; message: string; apiKey: string;
}): Promise<void> {
  const { to, founderName, startup, vcName, vcFirm, vcEmail, message, apiKey } = opts;
  const from = vcFirm ? `${vcName} (${vcFirm})` : vcName;
  if (!apiKey) {
    console.log(`[DEV — no RESEND_API_KEY] Message to ${to} from ${vcEmail} re ${startup}:\n${message}`);
    return;
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const htmlMsg = esc(message).replace(/\n/g, '<br>');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sanyog <notify@drusti.online>',
      to: [to],
      reply_to: vcEmail,
      subject: `${from} messaged you on Sanyog`,
      text: `${from} reached out to you about ${startup} via Sanyog Scout Hub:\n\n"${message}"\n\nReply to this email to respond directly to ${vcEmail}.`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#0a0a14;font-family:Inter,Arial,sans-serif"><div style="max-width:520px;margin:32px auto;background:#0d0d1f;border-radius:16px;overflow:hidden;border:1px solid rgba(139,92,246,.2)"><div style="padding:22px 28px;border-bottom:1px solid rgba(255,255,255,.07)"><div style="display:inline-flex;align-items:center;gap:8px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22d3ee"></span><span style="color:#9ca3af;font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Sanyog · Scout Hub</span></div></div><div style="padding:28px"><p style="color:#fff;font-size:16px;font-weight:700;margin:0 0 4px">Hi ${esc(founderName)},</p><p style="color:#9ca3af;font-size:14px;margin:0 0 20px;line-height:1.6"><strong style="color:#c4b5fd">${esc(from)}</strong> sent you a message about <strong style="color:#fff">${esc(startup)}</strong> on Sanyog.</p><div style="background:rgba(6,182,212,.07);border:1px solid rgba(6,182,212,.22);border-left:3px solid #22d3ee;border-radius:10px;padding:16px 18px;margin-bottom:22px"><p style="color:#e5e7eb;font-size:14px;line-height:1.65;margin:0;font-style:italic">${htmlMsg}</p></div><a href="mailto:${esc(vcEmail)}" style="display:inline-block;background:linear-gradient(90deg,#0e7490,#06b6d4);color:#fff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 24px;border-radius:999px">Reply to ${esc(vcName)}</a><p style="color:#6b7280;font-size:12px;margin:22px 0 0">Or just reply to this email — it goes straight to ${esc(vcEmail)}.</p></div></div></body></html>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('[vc/message] Resend error:', err);
    throw new Error('Failed to deliver the message email.');
  }
}

async function handleVCMessage(request: Request): Promise<Response> {
  const authed = await getAuthedUser(request);
  if (!authed) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const body = await request.json() as {
      startup?: string; recipient_name?: string; message?: string; vc_firm?: string; vc_name?: string;
    };
    const message = (body.message || '').trim();
    const startup = (body.startup || '').trim();
    if (!message) return jsonRes({ error: 'Message cannot be empty.' }, 400);
    if (!startup) return jsonRes({ error: 'Missing startup.' }, 400);

    // The founder's registered email lives on their startup row (looked up by name).
    const { data: st } = await db
      .from('startups')
      .select('created_by_email, owner_email, founder')
      .ilike('name', startup)
      .maybeSingle();
    const founderEmail = (st?.owner_email || st?.created_by_email || '').trim();

    // No registered email (e.g. a demo/sample founder) — acknowledged in-app but
    // there's nowhere to deliver it.
    if (!founderEmail) return jsonRes({ ok: true, delivered: false, reason: 'no_email' });

    await sendFounderMessageEmail({
      to: founderEmail,
      founderName: body.recipient_name || st?.founder || 'Founder',
      startup,
      vcName: body.vc_name || 'A verified investor',
      vcFirm: body.vc_firm || '',
      vcEmail: authed.email,
      message,
      apiKey: process.env.RESEND_API_KEY || '',
    });
    return jsonRes({ ok: true, delivered: true });
  } catch (e) {
    console.error('[vc/message] error:', e);
    return jsonRes({ error: e instanceof Error ? e.message : 'Failed to send message.' }, 500);
  }
}

// ─── VC: Diligence audit log — record a live action ──────────────────────────
async function handleVCAuditLog(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  try {
    const body = await request.json() as { action: string; doc_id?: string; doc_name: string; startup?: string; actor?: string };
    const allowed = ['Viewed', 'Requested', 'Downloaded'];
    if (!body.doc_name || !allowed.includes(body.action)) return jsonRes({ error: 'Invalid audit event.' }, 400);
    const { data, error } = await db.from('diligence_audit').insert({
      vc_email: email,
      actor: body.actor ?? null,
      action: body.action,
      doc_id: body.doc_id ?? null,
      doc_name: body.doc_name,
      startup: body.startup ?? null,
    }).select().single();
    if (error) return jsonRes({ error: error.message }, 500);
    return jsonRes({ ok: true, event: data });
  } catch (e) { return jsonRes({ error: 'Server error.' }, 500); }
}

// ─── VC: Diligence audit log — list recent events for the signed-in fund ──────
async function handleVCAuditList(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (!email) return jsonRes({ error: 'Not authenticated.' }, 401);
  const db = getVCAdmin();
  const { data, error } = await db.from('diligence_audit')
    .select('*')
    .eq('vc_email', email)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes({ events: data ?? [] });
}

// ─── VC: Admin — get all pending VC activity ─────────────────────────────────
async function handleVCAdminPending(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const db = getVCAdmin();
  const [profiles, interests, diligence, shortlists] = await Promise.all([
    db.from('vc_profiles').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    db.from('deal_interests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    db.from('diligence_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
    db.from('shortlist_events').select('*').order('created_at', { ascending: false }).limit(40),
  ]);
  return jsonRes({ profiles: profiles.data ?? [], interests: interests.data ?? [], diligence: diligence.data ?? [], shortlists: shortlists.data ?? [] });
}

// ─── VC: Admin — review (approve/reject) ─────────────────────────────────────
async function handleVCAdminReview(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const db = getVCAdmin();
  const { table, id, action } = await request.json() as { table: string; id: string; action: 'approve' | 'reject' };
  if (!['vc_profiles', 'deal_interests', 'diligence_requests'].includes(table)) return jsonRes({ error: 'Invalid table.' }, 400);
  if (!id || !['approve', 'reject'].includes(action)) return jsonRes({ error: 'Invalid params.' }, 400);
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  await db.from(table as 'vc_profiles').update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq('id', id);
  return jsonRes({ ok: true });
}

// ─── Startup: Admin — get pending registrations ───────────────────────────────
async function handleStartupAdminPending(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const db = getVCAdmin();
  const { data } = await db.from('startups').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  return jsonRes({ startups: data ?? [] });
}

// ─── Startup: Admin — approve / reject registration ───────────────────────────
async function handleStartupAdminReview(request: Request): Promise<Response> {
  const guard = await requireAdmin(request);
  if (guard) return guard;
  const db = getVCAdmin();
  const { id, action } = await request.json() as { id: string; action: 'approve' | 'reject' };
  if (!id || !['approve', 'reject'].includes(action)) return jsonRes({ error: 'Invalid params.' }, 400);
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const { data: st } = await db.from('startups').select('name, created_by_email, owner_email').eq('id', id).maybeSingle();
  await db.from('startups').update({ status: newStatus, reviewed_at: new Date().toISOString() }).eq('id', id);
  await logActivity({
    type: action === 'approve' ? 'startup_approved' : 'startup_rejected',
    actor_email: await extractVCEmail(request),
    title: st?.name || id,
    detail: st ? `Founder: ${st.created_by_email || st.owner_email || '—'}` : null,
    meta: { startup_id: id },
  });
  return jsonRes({ ok: true });
}

// ─── Contact: submit message ──────────────────────────────────────────────────
async function handleContactSubmit(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { name?: string; email?: string; message?: string };
    const { name, email, message } = body;
    if (!name?.trim() || !email?.trim() || !message?.trim())
      return jsonRes({ error: 'Name, email and message are required.' }, 400);

    // Use anon key for public insert — service role key has schema grant issues on new tables
    const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://kntoyozitskrblvxmbpp.supabase.co';
    const supaKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtudG95b3ppdHNrcmJsdnhtYnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Njg1ODMiLCJleHAiOjIwOTU0NDQ1ODN9.o1nTOoJ4BPKrr95WAuqYa3FfDwIhjj10R5Ra7eBVGok';

    const db = createClient(supaUrl, supaKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await db.from('contact_messages').insert({ name: name.trim(), email: email.trim(), message: message.trim() });
    if (error) {
      console.error('[contact] supabase error:', error.message, error.details, error.hint);
      return jsonRes({ error: error.message || 'Failed to save message.' }, 500);
    }
    return jsonRes({ ok: true });
  } catch (err) {
    console.error('[contact] unexpected error:', err);
    return jsonRes({ error: 'Server error. Please try again.' }, 500);
  }
}

// ─── Contact: admin list ──────────────────────────────────────────────────────
async function handleContactAdminList(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (email !== 'ashutoshforcorporate@gmail.com') return jsonRes({ error: 'Forbidden.' }, 403);

  const db = getVCAdmin();
  const { data, error } = await db
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes(data ?? []);
}

// ─── Contact: admin mark read ─────────────────────────────────────────────────
async function handleContactMarkRead(request: Request): Promise<Response> {
  const email = await extractVCEmail(request);
  if (email !== 'ashutoshforcorporate@gmail.com') return jsonRes({ error: 'Forbidden.' }, 403);

  const { id, read } = await request.json() as { id?: string; read?: boolean };
  if (!id) return jsonRes({ error: 'id required.' }, 400);

  const db = getVCAdmin();
  const { error } = await db.from('contact_messages').update({ read: read ?? true }).eq('id', id);
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes({ ok: true });
}

// ═════════════════════════════════════════════════════════════════════════════
// PROCUREMENT PATHWAY — the eight stages of PS 26136 as API
//
//   Stage 1  POST /api/challenges/create      GET /api/challenges
//   Stage 2  POST /api/challenges/apply       (eligibility screening inline)
//   Stage 3  POST /api/applications/score     (dual-axis panel rubric)
//   St 4/5   carried by sandbox_agreements    (read via /api/pathway)
//   Stage 6  POST /api/milestones/verify      POST /api/milestones/release
//   Stage 7  POST /api/kpis/record            (verdict computed server-side)
//   Stage 8  POST /api/endorsements           (3-department gate, auto-scale)
//   View     GET  /api/pathway?startup_id=…   GET /api/pathway/solutions
//   Fix      GET  /api/documents/confidential (dept-gated, replaces the anon
//                                              browser query in scout.tsx)
//
// Reads are public but limited to published/approved rows; every write goes
// through getAuthedUser. "Department" means an APPROVED vc_profiles row (or the
// permanent admin, so the whole flow can be demonstrated from one account).
// ═════════════════════════════════════════════════════════════════════════════

/** Resolve whether the caller may act as a department; returns its display name. */
async function getActingDepartment(request: Request): Promise<{ email: string; role: string; deptName: string } | null> {
  const authed = await getAuthedUser(request);
  if (!authed) return null;
  const db = getVCAdmin();
  const { data } = await db.from('vc_profiles')
    .select('firm_name, status').eq('email', authed.email).maybeSingle();
  if (data?.status === 'approved') return { ...authed, deptName: data.firm_name };
  if (authed.role === 'admin') return { ...authed, deptName: 'Maharashtra State Innovation Society' };
  return null;
}

const isUniqueViolation = (err: { code?: string } | null) => err?.code === '23505';

// ─── Stage 1: list challenges (public — drafts and withdrawn stay hidden) ────
async function handlePathwayChallenges(): Promise<Response> {
  const db = getVCAdmin();
  const { data, error } = await db.from('challenges')
    .select('id, reference_no, department_name, nodal_officer, title, problem_statement, outcome_sought, domain, baseline_metric, baseline_value, target_value, metric_unit, metric_direction, target_window_days, operational_constraints, data_available, pilot_budget_inr, pilot_duration_days, dpiit_required, turnover_relaxed, experience_relaxed, emd_exempt, opens_on, closes_on, evaluation_days, deemed_approval, status, published_at')
    .in('status', ['published', 'evaluating', 'awarded', 'closed'])
    .order('published_at', { ascending: false });
  if (error) return jsonRes({ error: error.message }, 500);

  // Attach application counts so the board can show live demand.
  const ids = (data ?? []).map(c => c.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: apps } = await db.from('challenge_applications').select('challenge_id').in('challenge_id', ids);
    for (const a of apps ?? []) counts[a.challenge_id] = (counts[a.challenge_id] ?? 0) + 1;
  }
  return jsonRes((data ?? []).map(c => ({ ...c, application_count: counts[c.id] ?? 0 })));
}

// ─── Stage 1: create a challenge from the Problem Statement Template ─────────
async function handleChallengeCreate(request: Request): Promise<Response> {
  const dept = await getActingDepartment(request);
  if (!dept) return jsonRes({ error: 'Only a verified department (or the admin) can publish a challenge.' }, 403);
  try {
    const b = await request.json() as Record<string, unknown>;
    const required = ['title', 'problem_statement', 'outcome_sought', 'domain', 'baseline_metric', 'baseline_value', 'target_value', 'metric_unit', 'pilot_budget_inr'];
    const missing = required.filter(k => b[k] === undefined || b[k] === null || b[k] === '');
    if (missing.length) return jsonRes({ error: `The template is incomplete — missing: ${missing.join(', ')}. A challenge without a baseline and target can never be validated.` }, 400);

    const baseline = Number(b.baseline_value), target = Number(b.target_value), budget = Number(b.pilot_budget_inr);
    if (!Number.isFinite(baseline) || !Number.isFinite(target)) return jsonRes({ error: 'Baseline and target must be numbers.' }, 400);
    if (target === baseline) return jsonRes({ error: 'Target must differ from the baseline — otherwise there is nothing to measure.' }, 400);
    if (!Number.isFinite(budget) || budget <= 0) return jsonRes({ error: 'Pilot budget must be a positive amount in rupees.' }, 400);

    const db = getVCAdmin();
    // Human-readable reference: SNY/<DOMAIN>/<year>/<seq>
    const year = new Date().getFullYear();
    const dom = String(b.domain).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'GN';
    const { count } = await db.from('challenges').select('id', { count: 'exact', head: true });
    const reference_no = `SNY/${dom}/${year}/${String((count ?? 0) + 1).padStart(3, '0')}`;

    // challenges.department_email has an FK to users(email). A caller authorised
    // through vc_profiles (or the hardcoded admin) may not have a users row yet —
    // create the minimal one instead of failing the publish on the constraint.
    await db.from('users').upsert(
      { email: dept.email, name: dept.deptName, role: dept.role === 'admin' ? 'admin' : 'vc' },
      { onConflict: 'email', ignoreDuplicates: true },
    );

    const { data, error } = await db.from('challenges').insert({
      reference_no,
      department_email: dept.email,
      department_name: dept.deptName,
      nodal_officer: (b.nodal_officer as string) || null,
      title: b.title, problem_statement: b.problem_statement, outcome_sought: b.outcome_sought,
      domain: b.domain,
      baseline_metric: b.baseline_metric, baseline_value: baseline, target_value: target,
      metric_unit: b.metric_unit,
      metric_direction: b.metric_direction === 'increase' ? 'increase' : 'decrease',
      target_window_days: b.target_window_days ? Number(b.target_window_days) : null,
      operational_constraints: (b.operational_constraints as string) || null,
      data_available: (b.data_available as string) || null,
      pilot_budget_inr: budget,
      pilot_duration_days: b.pilot_duration_days ? Number(b.pilot_duration_days) : 180,
      dpiit_required: b.dpiit_required !== false,
      turnover_relaxed: b.turnover_relaxed !== false,
      experience_relaxed: b.experience_relaxed !== false,
      emd_exempt: b.emd_exempt !== false,
      opens_on: (b.opens_on as string) || new Date().toISOString().slice(0, 10),
      closes_on: (b.closes_on as string) || null,
      status: 'published',
      published_at: new Date().toISOString(),
    }).select().single();
    if (error) return jsonRes({ error: error.message }, 500);

    await logActivity({ type: 'challenge_published', actor_email: dept.email, title: String(b.title), detail: `${dept.deptName} · budget ₹${(budget / 1e5).toFixed(1)}L · ${b.baseline_metric}: ${baseline} → ${target} ${b.metric_unit}`, meta: { challenge_id: data.id, reference_no } });
    return jsonRes(data);
  } catch {
    return jsonRes({ error: 'Failed to create the challenge.' }, 500);
  }
}

// ─── Stage 2: apply + eligibility screening ──────────────────────────────────
// Screening is mechanical and recorded: DPIIT recognition is checked, and the
// GFR 2017 relaxations (Rule 173(i) turnover/experience, Rule 170(i) EMD) are
// applied AS THE DEFAULT rather than left to officer discretion — that reversal
// of the default is the platform's core policy contribution.
async function handleChallengeApply(request: Request): Promise<Response> {
  const authed = await getAuthedUser(request);
  if (!authed) return jsonRes({ error: 'Sign in to apply to a challenge.' }, 401);
  try {
    const b = await request.json() as { challenge_id?: string; startup_id?: string; proposal_summary?: string; proposed_budget_inr?: number; proposed_days?: number };
    if (!b.challenge_id || !b.startup_id) return jsonRes({ error: 'challenge_id and startup_id are required.' }, 400);
    if (!b.proposal_summary || b.proposal_summary.trim().length < 30)
      return jsonRes({ error: 'A proposal summary of at least 30 characters is required — the panel scores what you write here.' }, 400);

    const db = getVCAdmin();
    const { data: ch } = await db.from('challenges').select('id, title, status, closes_on, pilot_budget_inr, dpiit_required, turnover_relaxed, experience_relaxed, emd_exempt').eq('id', b.challenge_id).maybeSingle();
    if (!ch) return jsonRes({ error: 'Challenge not found.' }, 404);
    if (ch.status !== 'published' && ch.status !== 'evaluating') return jsonRes({ error: `This challenge is ${ch.status} and no longer accepting applications.` }, 409);
    if (ch.closes_on && new Date(ch.closes_on) < new Date(new Date().toISOString().slice(0, 10))) return jsonRes({ error: 'The application window for this challenge has closed.' }, 409);

    const { data: st } = await db.from('startups').select('id, name, status, dpiit_recognition_no, dpiit_verified, owner_email, created_by_email').eq('id', b.startup_id).maybeSingle();
    if (!st) return jsonRes({ error: 'Startup not found — register your solution first.' }, 404);
    if (st.status !== 'approved') return jsonRes({ error: 'Your solution registration is still under review. You can apply as soon as it is approved.' }, 409);
    const owners = [st.owner_email, st.created_by_email].filter(Boolean).map((x: string) => x.toLowerCase());
    if (authed.role !== 'admin' && !owners.includes(authed.email)) return jsonRes({ error: 'You can only apply on behalf of your own solution.' }, 403);

    // Eligibility screen. Recognition satisfies DPIIT where required; the
    // legacy barriers are recorded as waived per the challenge's own posture.
    const dpiitOk = !ch.dpiit_required || !!(st.dpiit_verified || st.dpiit_recognition_no);
    const eligibility_status = dpiitOk ? 'eligible' : 'ineligible';
    const ineligible_reason = dpiitOk ? null : 'DPIIT/Startup India recognition is required for this challenge and is not on record for this solution. Add your recognition number to your profile and re-apply.';

    const { data, error } = await db.from('challenge_applications').insert({
      challenge_id: ch.id, startup_id: st.id, startup_name: st.name, applicant_email: authed.email,
      proposal_summary: b.proposal_summary.trim(),
      proposed_budget_inr: b.proposed_budget_inr ? Number(b.proposed_budget_inr) : null,
      proposed_days: b.proposed_days ? Number(b.proposed_days) : null,
      eligibility_status, ineligible_reason, dpiit_checked: true,
      screened_at: new Date().toISOString(),
      status: dpiitOk ? 'screened' : 'rejected',
    }).select().single();
    if (isUniqueViolation(error)) return jsonRes({ error: `${st.name} has already applied to this challenge — one application per solution.` }, 409);
    if (error) return jsonRes({ error: error.message }, 500);

    await logActivity({ type: 'application_submitted', actor_email: authed.email, title: st.name, detail: `Applied to ${ch.title} · ${eligibility_status}${dpiitOk ? ' · turnover/experience/EMD conditions waived' : ''}`, meta: { challenge_id: ch.id, application_id: data.id } });
    return jsonRes({
      ...data,
      screening: {
        dpiit: dpiitOk ? 'verified' : 'not_on_record',
        turnover_waived: !!ch.turnover_relaxed,       // GFR 2017 Rule 173(i)
        experience_waived: !!ch.experience_relaxed,   // GFR 2017 Rule 173(i)
        emd_exempt: !!ch.emd_exempt,                  // GFR 2017 Rule 170(i)
      },
    });
  } catch {
    return jsonRes({ error: 'Failed to submit the application.' }, 500);
  }
}

// ─── Stage 3: attributable panel scoring ─────────────────────────────────────
async function handleApplicationScore(request: Request): Promise<Response> {
  const authed = await getAuthedUser(request);
  if (!authed) return jsonRes({ error: 'Sign in to score an application.' }, 401);
  const dept = await getActingDepartment(request);
  if (!dept && authed.role !== 'admin' && authed.role !== 'evaluator')
    return jsonRes({ error: 'Scoring is limited to panel evaluators, verified departments and the admin.' }, 403);
  try {
    const b = await request.json() as { application_id?: string; technical_viability?: number; innovation_quotient?: number; rationale?: string; conflict_declared?: boolean; evaluator_name?: string; evaluator_org?: string };
    const tech = Number(b.technical_viability), innov = Number(b.innovation_quotient);
    if (!b.application_id) return jsonRes({ error: 'application_id required.' }, 400);
    if (!Number.isInteger(tech) || tech < 0 || tech > 50 || !Number.isInteger(innov) || innov < 0 || innov > 50)
      return jsonRes({ error: 'Both axes are scored 0–50: technical viability and innovation quotient.' }, 400);
    if (!b.rationale || b.rationale.trim().length < 20)
      return jsonRes({ error: 'A written rationale (min 20 chars) is mandatory — a bare number cannot be defended on audit.' }, 400);

    const db = getVCAdmin();
    const { data: app } = await db.from('challenge_applications').select('id, startup_name, eligibility_status, status').eq('id', b.application_id).maybeSingle();
    if (!app) return jsonRes({ error: 'Application not found.' }, 404);
    if (app.eligibility_status === 'ineligible') return jsonRes({ error: 'This application failed eligibility screening and cannot be scored.' }, 409);

    const row = {
      application_id: b.application_id, evaluator_email: authed.email,
      evaluator_name: b.evaluator_name || dept?.deptName || authed.email,
      evaluator_org: b.evaluator_org || dept?.deptName || null,
      technical_viability: tech, innovation_quotient: innov,
      rationale: b.rationale.trim(), conflict_declared: !!b.conflict_declared,
      submitted_at: new Date().toISOString(),
    };
    // One score per evaluator; re-submitting revises their own score.
    const { data, error } = await db.from('evaluation_scores')
      .upsert(row, { onConflict: 'application_id,evaluator_email' }).select().single();
    if (error) return jsonRes({ error: error.message }, 500);

    await db.from('challenge_applications').update({ status: 'evaluated' }).eq('id', b.application_id).eq('status', 'screened');
    await logActivity({ type: 'panel_scored', actor_email: authed.email, title: app.startup_name, detail: `Scored ${tech}+${innov}=${tech + innov}/100${b.conflict_declared ? ' · conflict declared' : ''}`, meta: { application_id: b.application_id } });
    return jsonRes(data);
  } catch {
    return jsonRes({ error: 'Failed to record the score.' }, 500);
  }
}

// ─── Stage 6: verify then release a milestone ────────────────────────────────
async function handleMilestoneVerify(request: Request): Promise<Response> {
  const dept = await getActingDepartment(request);
  if (!dept) return jsonRes({ error: 'Only a verified department (or the admin) can verify a milestone.' }, 403);
  try {
    const { milestone_id, note } = await request.json() as { milestone_id?: string; note?: string };
    if (!milestone_id) return jsonRes({ error: 'milestone_id required.' }, 400);
    const db = getVCAdmin();
    const { data: m } = await db.from('pilot_milestones').select('*').eq('id', milestone_id).maybeSingle();
    if (!m) return jsonRes({ error: 'Milestone not found.' }, 404);
    if (m.status === 'released') return jsonRes({ error: 'This tranche is already released.' }, 409);
    if (m.status === 'verified') return jsonRes({ error: 'Already verified — release it when payment is made.' }, 409);

    const { data, error } = await db.from('pilot_milestones').update({
      status: 'verified', verified_by: dept.deptName, verified_at: new Date().toISOString(),
      note: note?.trim() || m.note,
    }).eq('id', milestone_id).select().single();
    if (error) return jsonRes({ error: error.message }, 500);
    await logActivity({ type: 'milestone_verified', actor_email: dept.email, title: m.startup_name, detail: `Tranche ${m.seq} (${m.pct}%) verified — ${m.label}`, meta: { milestone_id } });
    return jsonRes(data);
  } catch {
    return jsonRes({ error: 'Failed to verify the milestone.' }, 500);
  }
}

async function handleMilestoneRelease(request: Request): Promise<Response> {
  const dept = await getActingDepartment(request);
  if (!dept) return jsonRes({ error: 'Only a verified department (or the admin) can release a payment.' }, 403);
  try {
    const { milestone_id } = await request.json() as { milestone_id?: string };
    if (!milestone_id) return jsonRes({ error: 'milestone_id required.' }, 400);
    const db = getVCAdmin();
    const { data: m } = await db.from('pilot_milestones').select('*').eq('id', milestone_id).maybeSingle();
    if (!m) return jsonRes({ error: 'Milestone not found.' }, 404);
    if (m.status === 'released') return jsonRes({ error: 'Already released.' }, 409);
    // The database constraint enforces this too; failing early gives a message
    // instead of a constraint violation.
    if (!m.verified_at) return jsonRes({ error: 'No payment without a recorded verification — verify the milestone first.' }, 409);

    const { data, error } = await db.from('pilot_milestones').update({
      status: 'released', released_at: new Date().toISOString(),
    }).eq('id', milestone_id).select().single();
    if (error) return jsonRes({ error: error.message }, 500);

    // Reflect the released tranche in the solution's running total.
    if (m.amount_inr) {
      const { data: st } = await db.from('startups').select('raised').eq('id', m.startup_id).maybeSingle();
      if (st) await db.from('startups').update({ raised: (Number(st.raised) || 0) + Number(m.amount_inr) }).eq('id', m.startup_id);
    }
    await logActivity({ type: 'milestone_released', actor_email: dept.email, title: m.startup_name, detail: `Tranche ${m.seq} (${m.pct}%) released — ₹${((m.amount_inr ?? 0) / 1e5).toFixed(1)}L`, meta: { milestone_id } });
    return jsonRes(data);
  } catch {
    return jsonRes({ error: 'Failed to release the milestone.' }, 500);
  }
}

// ─── Stage 7: record an independent measurement ──────────────────────────────
// The verdict is COMPUTED here, from the locked target and threshold — the
// validator supplies the measurement, never the conclusion.
async function handleKpiRecord(request: Request): Promise<Response> {
  const dept = await getActingDepartment(request);
  const authed = dept ?? await getAuthedUser(request);
  if (!authed || (!dept && (authed as { role: string }).role !== 'validator' && (authed as { role: string }).role !== 'admin'))
    return jsonRes({ error: 'Recording a measurement is limited to the validator, verified departments and the admin.' }, 403);
  try {
    const b = await request.json() as { kpi_id?: string; measured_value?: number; validator_org?: string; validator_type?: string; validation_note?: string; report_url?: string };
    if (!b.kpi_id) return jsonRes({ error: 'kpi_id required.' }, 400);
    const measured = Number(b.measured_value);
    if (!Number.isFinite(measured)) return jsonRes({ error: 'measured_value must be a number.' }, 400);
    if (!b.validator_org || !b.validator_org.trim()) return jsonRes({ error: 'validator_org is required — an unattributed measurement is not independent validation.' }, 400);

    const db = getVCAdmin();
    const { data: k } = await db.from('pilot_kpis').select('*').eq('id', b.kpi_id).maybeSingle();
    if (!k) return jsonRes({ error: 'KPI not found.' }, 404);

    // Verdict against the pre-registered target (locked_at) and threshold.
    const inc = k.direction === 'increase';
    const metTarget = inc ? measured >= Number(k.target_value) : measured <= Number(k.target_value);
    const insideGate = k.go_no_go_threshold == null ? metTarget
      : (inc ? measured >= Number(k.go_no_go_threshold) : measured <= Number(k.go_no_go_threshold));
    const verdict = metTarget ? 'met' : insideGate ? 'partially_met' : 'not_met';

    const allowedTypes = ['academic', 'stqc_or_setl', 'nabl_lab', 'dmeo_empanelled', 'department_internal', 'other'];
    const { data, error } = await db.from('pilot_kpis').update({
      measured_value: measured,
      validator_org: b.validator_org.trim(),
      validator_type: allowedTypes.includes(String(b.validator_type)) ? b.validator_type : 'other',
      validated_at: new Date().toISOString(),
      validation_verdict: verdict,
      validation_note: b.validation_note?.trim() || null,
      report_url: b.report_url?.trim() || null,
    }).eq('id', b.kpi_id).select().single();
    if (error) return jsonRes({ error: error.message }, 500);

    await logActivity({ type: 'kpi_validated', actor_email: (authed as { email: string }).email, title: k.startup_name, detail: `${k.kpi_description}: ${k.baseline_value} → ${measured} ${k.unit ?? ''} · ${verdict.replace('_', ' ')}`, meta: { kpi_id: b.kpi_id } });
    return jsonRes(data);
  } catch {
    return jsonRes({ error: 'Failed to record the measurement.' }, 500);
  }
}

// ─── Stage 8: departmental endorsement + the 3-department gate ───────────────
async function handleEndorsementCreate(request: Request): Promise<Response> {
  const dept = await getActingDepartment(request);
  if (!dept) return jsonRes({ error: 'Only a verified department (or the admin) can endorse a pilot.' }, 403);
  try {
    const b = await request.json() as { startup_id?: string; verdict?: string; pilot_ref?: string; note?: string; department_name?: string };
    if (!b.startup_id) return jsonRes({ error: 'startup_id required.' }, 400);
    if (b.verdict !== 'satisfactory' && b.verdict !== 'unsatisfactory') return jsonRes({ error: "verdict must be 'satisfactory' or 'unsatisfactory'." }, 400);
    if (b.verdict === 'unsatisfactory' && (!b.note || !b.note.trim()))
      return jsonRes({ error: 'An unsatisfactory verdict must state why — unexplained rejection is what this platform exists to remove.' }, 400);

    const db = getVCAdmin();
    const { data: st } = await db.from('startups').select('id, name, stage').eq('id', b.startup_id).maybeSingle();
    if (!st) return jsonRes({ error: 'Solution not found.' }, 404);

    const departmentName = (dept.role === 'admin' && b.department_name?.trim()) ? b.department_name.trim() : dept.deptName;
    const { error } = await db.from('scale_up_endorsements').insert({
      startup_id: st.id, startup_name: st.name, department_name: departmentName,
      verdict: b.verdict, pilot_ref: b.pilot_ref?.trim() || null, note: b.note?.trim() || null, endorsed_by: dept.email,
    });
    if (isUniqueViolation(error)) return jsonRes({ error: `${departmentName} has already endorsed this solution — one endorsement per department.` }, 409);
    if (error) return jsonRes({ error: error.message }, 500);

    // Recompute the gate (Odisha rule: 3+ satisfactory departmental reports).
    const { data: gate } = await db.from('scale_up_readiness').select('*').eq('startup_id', st.id).maybeSingle();
    const unlocked = !!gate?.gate_unlocked;
    if (unlocked && st.stage === 'Validated') {
      await db.from('startups').update({ stage: 'Scaled' }).eq('id', st.id);
      await logActivity({ type: 'scaled_up', actor_email: dept.email, title: st.name, detail: `Scale-up gate unlocked — ${gate.satisfactory_count} satisfactory departmental endorsements`, meta: { startup_id: st.id } });
    } else {
      await logActivity({ type: 'endorsement_recorded', actor_email: dept.email, title: st.name, detail: `${departmentName}: ${b.verdict}${gate ? ` · gate ${gate.satisfactory_count}/3` : ''}`, meta: { startup_id: st.id } });
    }
    return jsonRes({ ok: true, gate: gate ?? { satisfactory_count: 0, gate_unlocked: false }, stage_advanced: unlocked && st.stage === 'Validated' });
  } catch {
    return jsonRes({ error: 'Failed to record the endorsement.' }, 500);
  }
}

// ─── Solutions list for the pathway selector ─────────────────────────────────
async function handlePathwaySolutions(): Promise<Response> {
  const db = getVCAdmin();
  const { data, error } = await db.from('startups')
    .select('id, name, tagline, founder, industry, stage, funding_goal, raised, pitch_score, dpiit_verified')
    .eq('status', 'approved').order('created_at', { ascending: true });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes(data ?? []);
}

// ─── The composite pathway view: one call, all eight stages ──────────────────
async function handlePathwayView(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const startupId = url.searchParams.get('startup_id');
  if (!startupId) return jsonRes({ error: 'startup_id query parameter required.' }, 400);
  const db = getVCAdmin();

  const { data: startup } = await db.from('startups')
    .select('id, name, tagline, description, founder, industry, stage, funding_goal, raised, pitch_score, dpiit_verified, dpiit_recognition_no, turnover_waived, experience_waived, status')
    .eq('id', startupId).maybeSingle();
  if (!startup) return jsonRes({ error: 'Solution not found.' }, 404);

  const [{ data: applications }, { data: sandboxes }, { data: milestones }, { data: kpis }, { data: endorsements }, { data: gate }] = await Promise.all([
    db.from('challenge_applications').select('*, challenges(id, reference_no, title, department_name, domain, baseline_metric, baseline_value, target_value, metric_unit, metric_direction, pilot_budget_inr, pilot_duration_days, turnover_relaxed, experience_relaxed, emd_exempt, evaluation_days, deemed_approval, status)').eq('startup_id', startupId).order('created_at', { ascending: false }),
    db.from('sandbox_agreements').select('*').eq('startup_id', startupId).order('created_at', { ascending: false }),
    db.from('pilot_milestones').select('*').eq('startup_id', startupId).order('seq', { ascending: true }),
    db.from('pilot_kpis').select('*').eq('startup_id', startupId).order('created_at', { ascending: true }),
    db.from('scale_up_endorsements').select('*').eq('startup_id', startupId).order('created_at', { ascending: true }),
    db.from('scale_up_readiness').select('*').eq('startup_id', startupId).maybeSingle(),
  ]);

  // Panel scores for each application (attributable, with consensus).
  const appIds = (applications ?? []).map(a => a.id);
  let scores: unknown[] = [];
  if (appIds.length) {
    const { data: sc } = await db.from('evaluation_scores').select('*').in('application_id', appIds).order('submitted_at', { ascending: true });
    scores = sc ?? [];
  }

  return jsonRes({
    startup,
    applications: applications ?? [],
    scores,
    sandboxes: sandboxes ?? [],
    milestones: milestones ?? [],
    kpis: kpis ?? [],
    endorsements: endorsements ?? [],
    gate: gate ?? { startup_id: startupId, satisfactory_count: 0, unsatisfactory_count: 0, gate_unlocked: false },
  });
}

// ─── Confidential documents — the server-side fix for scout.tsx:921 ──────────
// deck_type='investor' rows are excluded from anon access by design; they are
// released here, only to verified departments (and the admin).
async function handleConfidentialDocs(request: Request): Promise<Response> {
  const dept = await getActingDepartment(request);
  if (!dept) return jsonRes({ error: 'Confidential submissions are visible only to verified departments.' }, 403);
  const db = getVCAdmin();
  const { data, error } = await db.from('documents')
    .select('id, created_at, name, type, status, date, views, score, file_url, startup_name, deck_type')
    .eq('deck_type', 'investor').order('created_at', { ascending: false });
  if (error) return jsonRes({ error: error.message }, 500);
  return jsonRes(data ?? []);
}

// ─── Main fetch handler ───────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: unknown) {
    // In Vite dev mode (Node.js adapter) env arrives as undefined — normalise it
    // so every handler can safely access env.X without a TypeError.
    const e: Env = (env as Env | undefined) ?? {};

    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };

    // ── Auth routes ──────────────────────────────────────────────────────────
    if (pathname === '/api/auth/signup'         && method === 'POST') return handleSignUp(request, e);
    if (pathname === '/api/auth/verify-otp'     && method === 'POST') return handleVerifyOTP(request, e);
    if (pathname === '/api/auth/login'          && method === 'POST') return handleLogin(request, e);
    if (pathname === '/api/auth/logout'         && method === 'POST') return handleLogout();
    if (pathname === '/api/auth/me'             && method === 'GET')  return handleMe(request, e);
    if (pathname === '/api/auth/delete-account' && method === 'POST') return handleDeleteAccount(request, e);
    if (pathname === '/api/auth/google'         && method === 'GET')  return handleGoogleInit(request, e);
    if (pathname === '/api/auth/google/callback'&& method === 'GET')  return handleGoogleCallback(request, e);

    if (pathname === '/api/chat' && method === 'POST')
      return handleChatRequest(request, env);

    if (pathname === '/api/incuscore/phase1' && method === 'POST')
      return handleFitScorePhase1(request);

    if (pathname === '/api/incuscore/phase2' && method === 'POST')
      return handleFitScorePhase2(request);

    if (pathname === '/api/documents' && method === 'POST')
      return handleDocumentInsert(request);

    if (pathname === '/api/documents/delete' && method === 'POST')
      return handleDocumentDelete(request);

    if (pathname === '/api/startups' && method === 'POST')
      return handleStartupInsert(request);

    if (pathname === '/api/startup-auth/set' && method === 'POST')
      return handleStartupAuthSet(request);

    if (pathname === '/api/startup-auth/verify' && method === 'POST')
      return handleStartupAuthVerify(request);

    if (pathname === '/api/startups/update' && method === 'POST')
      return handleStartupUpdate(request);

    if (pathname === '/api/startups/delete' && method === 'POST')
      return handleStartupDelete(request);

    if (pathname === '/api/events/create' && method === 'POST')
      return handleEventCreate(request);

    if (pathname === '/api/events/pending' && method === 'GET')
      return handleEventsPending(request);

    if (pathname === '/api/events/review' && method === 'POST')
      return handleEventsReview(request);

    if (pathname === '/api/events/rsvp' && method === 'POST')
      return handleEventRsvp(request);

    if (pathname === '/api/startup-advance/request' && method === 'POST')
      return handleAdvanceRequest(request);

    if (pathname === '/api/startup-advance/pending' && method === 'GET')
      return handleAdvancePending(request);

    if (pathname === '/api/startup-advance/review' && method === 'POST')
      return handleAdvanceReview(request);

    if (pathname === '/api/vc/mandate' && method === 'POST')
      return handleVCMandate(request);

    if (pathname === '/api/vc/list' && method === 'GET')
      return handleVCList(request);

    if (pathname === '/api/vc/mandate' && method === 'GET')
      return handleVCGetMandate(request);

    if (pathname === '/api/vc/confirm-password' && method === 'POST')
      return handleVCConfirmPassword(request);

    if (pathname === '/api/vc/deal-interest' && method === 'POST')
      return handleVCDealInterest(request);

    if (pathname === '/api/vc/diligence-request' && method === 'POST')
      return handleVCDiligenceRequest(request);

    if (pathname === '/api/vc/shortlist' && method === 'POST')
      return handleVCShortlist(request);

    if (pathname === '/api/vc/delete' && method === 'POST')
      return handleVCDelete(request);

    if (pathname === '/api/vc/message' && method === 'POST')
      return handleVCMessage(request);

    if (pathname === '/api/vc/audit' && method === 'POST')
      return handleVCAuditLog(request);

    if (pathname === '/api/vc/audit' && method === 'GET')
      return handleVCAuditList(request);

    if (pathname === '/api/vc/admin/pending' && method === 'GET')
      return handleVCAdminPending(request);

    if (pathname === '/api/vc/admin/review' && method === 'POST')
      return handleVCAdminReview(request);

    if (pathname === '/api/startups/admin/pending' && method === 'GET')
      return handleStartupAdminPending(request);

    if (pathname === '/api/startups/admin/review' && method === 'POST')
      return handleStartupAdminReview(request);

    if (pathname === '/api/admin/activity' && method === 'GET')
      return handleAdminActivity(request);

    if (pathname === '/api/contact' && method === 'POST')
      return handleContactSubmit(request);

    if (pathname === '/api/contact/messages' && method === 'GET')
      return handleContactAdminList(request);

    if (pathname === '/api/contact/mark-read' && method === 'POST')
      return handleContactMarkRead(request);

    // ── Procurement pathway (PS 26136 stages 1–8) ──────────────────────────
    if (pathname === '/api/challenges' && method === 'GET')
      return handlePathwayChallenges();

    if (pathname === '/api/challenges/create' && method === 'POST')
      return handleChallengeCreate(request);

    if (pathname === '/api/challenges/apply' && method === 'POST')
      return handleChallengeApply(request);

    if (pathname === '/api/applications/score' && method === 'POST')
      return handleApplicationScore(request);

    if (pathname === '/api/milestones/verify' && method === 'POST')
      return handleMilestoneVerify(request);

    if (pathname === '/api/milestones/release' && method === 'POST')
      return handleMilestoneRelease(request);

    if (pathname === '/api/kpis/record' && method === 'POST')
      return handleKpiRecord(request);

    if (pathname === '/api/endorsements' && method === 'POST')
      return handleEndorsementCreate(request);

    if (pathname === '/api/pathway/solutions' && method === 'GET')
      return handlePathwaySolutions();

    if (pathname === '/api/pathway' && method === 'GET')
      return handlePathwayView(request);

    if (pathname === '/api/documents/confidential' && method === 'GET')
      return handleConfidentialDocs(request);

    if (
      (pathname === '/api/chat' || pathname === '/api/documents') &&
      method === 'OPTIONS'
    ) {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};