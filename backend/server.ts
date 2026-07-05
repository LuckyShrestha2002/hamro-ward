import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5174;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Models. The key has paid credit, so both use Claude Sonnet 4.5 — it handles
// vision (categorize) and text (nibedan/recommendation) with the best Nepali
// quality. Small key balance: keep max_tokens capped (1500) on every call.
const VISION_MODEL = 'anthropic/claude-sonnet-4.5'; // categorize (needs image input)
const TEXT_MODEL = 'anthropic/claude-sonnet-4.5'; // nibedan + recommendation

// Allow large base64 image payloads.
app.use(cors());
app.use(express.json({ limit: '15mb' }));

if (!OPENROUTER_API_KEY) {
  console.warn(
    '\n⚠️  OPENROUTER_API_KEY is not set. Copy backend/.env.example to backend/.env and add your key.\n'
  );
}

// ---- OpenRouter message types (OpenAI-compatible) ----
type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image_url'; image_url: { url: string } };
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<TextPart | ImagePart>;
};

/**
 * Thin wrapper around the OpenRouter chat completions endpoint.
 * Returns the assistant message text (data.choices[0].message.content).
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callOpenRouter(
  messages: ChatMessage[],
  maxTokens = 1500,
  model = TEXT_MODEL
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Server is missing OPENROUTER_API_KEY. Add it to backend/.env.');
  }

  // OpenRouter can occasionally rate-limit (429) or be briefly unavailable
  // (5xx); retry a few times with backoff before giving up.
  let response: Awaited<ReturnType<typeof fetch>> | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        // Optional but recommended by OpenRouter for attribution.
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Hamro Ward',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });

    if (response.ok) break;
    if (response.status === 429 || response.status >= 500) {
      if (attempt < 2) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
    }
    break;
  }

  if (!response || !response.ok) {
    const errText = response ? await response.text().catch(() => '') : '';
    throw new Error(`OpenRouter error ${response?.status ?? 'network'}: ${errText.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected response shape from OpenRouter.');
  }
  return content;
}

/**
 * Strip stray markdown code fences so JSON.parse can succeed.
 */
function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const CATEGORIZE_SYSTEM_PROMPT =
  "You identify civic infrastructure problems in Nepal from a photo. The possible categories are exactly: 'Pothole / Road', 'Streetlight', 'Water Supply', 'Waste Management', or 'Other'. Respond ONLY with a valid JSON object, no markdown, no backticks, in this shape: {\"category\": \"...\", \"description_en\": \"one short sentence\", \"description_np\": \"same description in Nepali\", \"severity\": \"Low\" | \"Medium\" | \"High\", \"confidence\": <integer 0-100: how certain you are that the category is correct — be honest, use lower values for unclear or ambiguous photos>}";

const RECOMMEND_SYSTEM_PROMPT =
  "You are a municipal operations advisor in Nepal. Given a civic problem's category, severity, and description, recommend how the ward office should respond. Respond ONLY with a valid JSON object, no markdown, no backticks, in this shape: {\"recommended_action\": \"one short actionable sentence\", \"suggested_priority\": \"Low\" | \"Medium\" | \"High\", \"urgency\": \"a short response-time phrase, e.g. 'Within 48 hours'\"}";

const NIBEDAN_SYSTEM_PROMPT =
  "You write a formal Nepali nibedan (निवेदन) for a citizen reporting a civic problem to their ward office. Use correct, respectful formal Nepali and the standard nibedan structure: addressee 'श्रीमान् वडा अध्यक्षज्यू,' then the ward office and municipality; a subject line 'विषय:' stating the problem briefly; salutation 'महोदय,'; a body that politely describes the problem, its location, and the harm it causes and requests prompt action; and a closing 'निवेदक,' followed by the citizen's name, address/ward, and contact. Do NOT include a मिति (date) line — the document letterhead already carries the submission date; never invent a date or leave a bracketed date placeholder. Use the details provided. Where another detail is missing, leave a clear blank like '[तपाईंको नाम]' for the user to fill. Respond with ONLY the nibedan text, nothing else.";

const ENGLISH_LETTER_SYSTEM_PROMPT =
  "You write a formal English complaint letter for a citizen reporting a civic problem to their ward office in Nepal. Use a standard formal letter structure: addressee 'To, The Ward Chairperson,' then the ward number and municipality; a subject line 'Subject:' stating the problem briefly; salutation 'Respected Sir/Madam,'; a body that politely describes the problem, its location, and the harm it causes and requests prompt action; and a closing 'Yours faithfully,' followed by the citizen's name, address/ward, and contact. Do NOT include a date line — the document letterhead already carries the submission date; never invent a date or leave a bracketed date placeholder. Use the details provided. Where another detail is missing, leave a clear blank like '[Your Name]' for the user to fill. Respond with ONLY the letter text, nothing else.";

// POST /api/categorize — identify a civic problem from a photo.
app.post('/api/categorize', async (req: Request, res: Response) => {
  try {
    const { base64, mediaType } = req.body || {};
    if (!base64 || !mediaType) {
      return res.status(400).json({ error: 'Missing "base64" or "mediaType" in request body.' });
    }

    const dataUrl = `data:${mediaType};base64,${base64}`;
    const messages: ChatMessage[] = [
      { role: 'system', content: CATEGORIZE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify the civic problem in this photo.' },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ];

    const raw = await callOpenRouter(messages, 1024, VISION_MODEL);

    // Parse the JSON safely; fall back to a sensible object on failure.
    const fallback = {
      category: 'Other',
      description_en: 'Could not automatically identify the problem. Please review and edit.',
      description_np: 'समस्या स्वतः पहिचान गर्न सकिएन। कृपया जाँच गरी सम्पादन गर्नुहोस्।',
      severity: 'Medium',
    };

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(stripFences(raw)) as Record<string, unknown>;
    } catch {
      result = fallback;
    }

    // Normalize confidence to an integer 0–100, or null when absent/invalid.
    const c = Number(result.confidence);
    result.confidence = Number.isFinite(c) ? Math.min(100, Math.max(0, Math.round(c))) : null;

    return res.json(result);
  } catch (err) {
    console.error('[/api/categorize]', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Failed to categorize image.' });
  }
});

// POST /api/recommend — suggest action / priority / urgency for an identified issue.
app.post('/api/recommend', async (req: Request, res: Response) => {
  try {
    const { category, severity, description } = req.body || {};

    const messages: ChatMessage[] = [
      { role: 'system', content: RECOMMEND_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Category: ${category || 'Other'}\nSeverity: ${severity || 'Medium'}\nDescription: ${
          description || '(none)'
        }`,
      },
    ];

    const raw = await callOpenRouter(messages, 300);

    const fallback = {
      recommended_action: 'Forward to the relevant ward department for inspection.',
      suggested_priority: severity || 'Medium',
      urgency: 'Within 1 week',
    };

    let result: unknown;
    try {
      result = JSON.parse(stripFences(raw));
    } catch {
      result = fallback;
    }

    return res.json(result);
  } catch (err) {
    console.error('[/api/recommend]', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Failed to generate recommendation.' });
  }
});

// POST /api/nibedan — generate a formal Nepali nibedan from report details.
app.post('/api/nibedan', async (req: Request, res: Response) => {
  try {
    const { category, location, ward, municipality, citizenName, contact, extra, language } =
      req.body || {};
    const isEnglish = language === 'en';

    const details = [
      `Category: ${category || '[not provided]'}`,
      `Ward: ${ward || '[not provided]'}`,
      `Municipality: ${municipality || '[not provided]'}`,
      `Location / landmark: ${location || '[not provided]'}`,
      `Citizen name: ${citizenName || '[not provided]'}`,
      `Contact: ${contact || '[not provided]'}`,
      `Extra details: ${extra || '[none]'}`,
    ].join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: isEnglish ? ENGLISH_LETTER_SYSTEM_PROMPT : NIBEDAN_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Write the ${isEnglish ? 'letter' : 'nibedan'} using these details:\n${details}`,
      },
    ];

    const text = await callOpenRouter(messages, 1500);
    return res.json({ nibedan: text.trim() });
  } catch (err) {
    console.error('[/api/nibedan]', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Failed to generate nibedan.' });
  }
});

// Map a free-text address to one of the supported Kathmandu Valley municipalities.
function detectMunicipality(blob: string): string | null {
  const s = blob.toLowerCase();
  // Suryabinayak first: it's in Bhaktapur district, so its addresses usually
  // mention "Bhaktapur" too.
  if (s.includes('suryabinayak') || s.includes('surya binayak')) return 'Suryabinayak Municipality';
  if (s.includes('bhaktapur')) return 'Bhaktapur Municipality';
  if (s.includes('lalitpur') || s.includes('patan')) return 'Lalitpur Metropolitan City';
  if (s.includes('kathmandu')) return 'Kathmandu Metropolitan City';
  return null;
}

// GET /api/reverse-geocode?lat=..&lon=.. — uses OpenStreetMap Nominatim to detect
// the municipality (and ward, when present) for a coordinate. No API key needed.
app.get('/api/reverse-geocode', async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat and lon query params are required.' });
    }

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`;
    const r = await fetch(url, {
      headers: {
        // Nominatim usage policy requires an identifying User-Agent.
        'User-Agent': 'HamroWard/1.0 (civic issue reporter; demo)',
        'Accept-Language': 'en',
      },
    });
    if (!r.ok) throw new Error(`Nominatim error ${r.status}`);

    const data = (await r.json()) as { address?: Record<string, string>; display_name?: string };
    const address = data.address ?? {};
    const blob = JSON.stringify(address) + ' ' + (data.display_name ?? '');

    const municipality = detectMunicipality(blob);

    // Try to pull a ward number out of any address field. Nominatim usually
    // encodes it as "<City>-<ward>" (e.g. "Kathmandu-14"); "Ward No. X" is rare.
    let ward: string | null = null;
    for (const v of Object.values(address)) {
      const m =
        String(v).match(/ward\s*(?:no\.?)?\s*(\d{1,2})/i) ??
        String(v).match(/(?:kathmandu|lalitpur|bhaktapur|patan|suryabinayak)\s*-\s*(\d{1,2})\b/i);
      if (m) {
        ward = String(parseInt(m[1], 10)); // "03" → "3", matching the form's ward values
        break;
      }
    }

    return res.json({ municipality, ward, display: data.display_name ?? null });
  } catch (err) {
    console.error('[/api/reverse-geocode]', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Reverse geocoding failed.' });
  }
});

// GET /api/geocode-search?q=.. — Nominatim forward search scoped to the
// Kathmandu Valley, powering the location picker's autocomplete. No key needed.
app.get('/api/geocode-search', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (q.length < 2) return res.json({ results: [] });

    // viewbox = lon1,lat1,lon2,lat2 covering the Kathmandu Valley.
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6' +
      '&countrycodes=np&viewbox=85.15,27.55,85.55,27.85&bounded=1' +
      `&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'HamroWard/1.0 (civic issue reporter; demo)',
        'Accept-Language': 'en',
      },
    });
    if (!r.ok) throw new Error(`Nominatim error ${r.status}`);

    const data = (await r.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
      type?: string;
    }>;
    const results = data
      .filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
      .map((p) => {
        const display = p.display_name ?? '';
        return {
          name: display.split(',')[0]?.trim() || display,
          display,
          lat: Number(p.lat),
          lon: Number(p.lon),
          type: p.type ?? null,
        };
      });
    return res.json({ results });
  } catch (err) {
    console.error('[/api/geocode-search]', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Place search failed.' });
  }
});

app.get('/api/health', (_req: Request, res: Response) =>
  res.json({ ok: true, keyConfigured: !!OPENROUTER_API_KEY })
);

app.listen(PORT, () => {
  console.log(`✅ Hamro Ward backend running on http://localhost:${PORT}`);
});
