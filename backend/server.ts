import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5174;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Models. Currently using FREE OpenRouter models so the app runs without paid
// credits. Once you add credit, switch both to 'anthropic/claude-sonnet-4.5'
// for the best quality (it does both vision and text).
const VISION_MODEL = 'nvidia/nemotron-nano-12b-v2-vl:free'; // categorize (needs image input)
const TEXT_MODEL = 'google/gemma-4-31b-it:free'; // nibedan + recommendation (good Nepali)

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

  // Free models are shared and occasionally rate-limited (429) or briefly
  // unavailable (5xx); retry a few times with backoff before giving up.
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
  "You identify civic infrastructure problems in Nepal from a photo. The possible categories are exactly: 'Pothole / Road', 'Streetlight', 'Water Supply', 'Waste Management', or 'Other'. Respond ONLY with a valid JSON object, no markdown, no backticks, in this shape: {\"category\": \"...\", \"description_en\": \"one short sentence\", \"description_np\": \"same description in Nepali\", \"severity\": \"Low\" | \"Medium\" | \"High\"}";

const RECOMMEND_SYSTEM_PROMPT =
  "You are a municipal operations advisor in Nepal. Given a civic problem's category, severity, and description, recommend how the ward office should respond. Respond ONLY with a valid JSON object, no markdown, no backticks, in this shape: {\"recommended_action\": \"one short actionable sentence\", \"suggested_priority\": \"Low\" | \"Medium\" | \"High\", \"urgency\": \"a short response-time phrase, e.g. 'Within 48 hours'\"}";

const NIBEDAN_SYSTEM_PROMPT =
  "You write a formal Nepali nibedan (निवेदन) for a citizen reporting a civic problem to their ward office. Use correct, respectful formal Nepali and the standard nibedan structure: a date line (मिति); addressee 'श्रीमान् वडा अध्यक्षज्यू,' then the ward office and municipality; a subject line 'विषय:' stating the problem briefly; salutation 'महोदय,'; a body that politely describes the problem, its location, and the harm it causes and requests prompt action; and a closing 'निवेदक,' followed by the citizen's name, address/ward, and contact. Use the details provided. Where a detail is missing, leave a clear blank like '[तपाईंको नाम]' for the user to fill. Respond with ONLY the nibedan text, nothing else.";

const ENGLISH_LETTER_SYSTEM_PROMPT =
  "You write a formal English complaint letter for a citizen reporting a civic problem to their ward office in Nepal. Use a standard formal letter structure: a date line; addressee 'To, The Ward Chairperson,' then the ward number and municipality; a subject line 'Subject:' stating the problem briefly; salutation 'Respected Sir/Madam,'; a body that politely describes the problem, its location, and the harm it causes and requests prompt action; and a closing 'Yours faithfully,' followed by the citizen's name, address/ward, and contact. Use the details provided. Where a detail is missing, leave a clear blank like '[Your Name]' for the user to fill. Respond with ONLY the letter text, nothing else.";

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

    let result: unknown;
    try {
      result = JSON.parse(stripFences(raw));
    } catch {
      result = fallback;
    }

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

    // Try to pull a ward number out of any address field (rarely present).
    let ward: string | null = null;
    for (const v of Object.values(address)) {
      const m = String(v).match(/ward\s*(?:no\.?)?\s*(\d{1,2})/i);
      if (m) {
        ward = m[1];
        break;
      }
    }

    return res.json({ municipality, ward, display: data.display_name ?? null });
  } catch (err) {
    console.error('[/api/reverse-geocode]', errorMessage(err));
    return res.status(502).json({ error: errorMessage(err) || 'Reverse geocoding failed.' });
  }
});

app.get('/api/health', (_req: Request, res: Response) =>
  res.json({ ok: true, keyConfigured: !!OPENROUTER_API_KEY })
);

app.listen(PORT, () => {
  console.log(`✅ Hamro Ward backend running on http://localhost:${PORT}`);
});
