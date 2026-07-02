import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  fileToBase64,
  categorizeImage,
  generateNibedan,
  getRecommendation,
  reverseGeocode,
  type ImagePayload,
  type LetterLanguage,
} from '../lib/api';
import { uploadReportImage, createReport, listActiveReportsMin } from '../lib/reports';
import { findSimilarReports, type SimilarMatch } from '../lib/duplicates';
import {
  MUNICIPALITIES,
  wardsFor,
  CATEGORIES,
  SEVERITIES,
  DEFAULT_MUNICIPALITY,
  municipalityNp,
} from '../data/wards';
import { SeverityBadge, CategoryBadge } from './Badges';
import DownloadPdfButton from './DownloadPdfButton';
import { type LatLng } from './LocationPicker';
import RecommendationCard from './RecommendationCard';
import type { Detection, Recommendation, Report, Severity } from '../types';
import type { UseReports } from '../hooks/useReports';

// Lazy so Leaflet isn't in the initial bundle (loads when the map is shown).
const LocationPicker = lazy(() => import('./LocationPicker'));

const NAVY = '#1a365d';

/** Material Symbol glyph. `filled` switches to the solid variant. */
function Icon({
  name,
  className = '',
  filled = false,
  style,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
      style={style}
    >
      {name}
    </span>
  );
}

/** Numbered circular step badge matching the report flow design. */
function StepBadge({ n }: { n: number }) {
  return (
    <span
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
      style={{ background: '#d3e4fe', color: NAVY }}
    >
      {n}
    </span>
  );
}

export default function ReportPage({ reports }: { reports: UseReports }) {
  // Image + categorization state
  const [file, setFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImagePayload | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [categorizing, setCategorizing] = useState(false);

  // AI recommendation
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommending, setRecommending] = useState(false);

  // Form state
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<Severity>('Medium');
  const [municipality, setMunicipality] = useState(DEFAULT_MUNICIPALITY);
  // Whether the user has explicitly picked a municipality (vs. the silent default).
  // Drives the preview letterhead so it doesn't assume Kathmandu before any choice.
  const [municipalityChosen, setMunicipalityChosen] = useState(false);
  const [ward, setWard] = useState('');
  const [geoNote, setGeoNote] = useState('');
  const [location, setLocation] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [contact, setContact] = useState('');
  const [extra, setExtra] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  // Letter state (bilingual)
  const [npText, setNpText] = useState('');
  const [enText, setEnText] = useState('');
  const [lang, setLang] = useState<LetterLanguage>('np');
  const [generatingLang, setGeneratingLang] = useState<LetterLanguage | null>(null);
  const [copied, setCopied] = useState(false);

  const activeText = lang === 'np' ? npText : enText;

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Report | null>(null);
  const [error, setError] = useState('');

  // Duplicate detection
  const [similar, setSimilar] = useState<SimilarMatch[]>([]);

  function resetForm() {
    setFile(null);
    setImageData(null);
    setDetection(null);
    setNpText('');
    setEnText('');
    setLang('np');
    setCategory('');
    setSeverity('Medium');
    setMunicipality(DEFAULT_MUNICIPALITY);
    setMunicipalityChosen(false);
    setWard('');
    setGeoNote('');
    setLocation('');
    setCitizenName('');
    setContact('');
    setExtra('');
    setCoords(null);
    setRecommendation(null);
    setSimilar([]);
    setSubmitted(null);
    setError('');
  }

  async function processFile(picked: File) {
    setError('');
    setDetection(null);
    setNpText('');
    setEnText('');
    setLang('np');
    setRecommendation(null);
    setSimilar([]);
    setFile(picked);

    try {
      const data = await fileToBase64(picked);
      setImageData(data);
      setCategorizing(true);
      const result = await categorizeImage(data);
      setDetection(result);
      const cat = CATEGORIES.includes(result.category as never) ? result.category : 'Other';
      const sev = (
        SEVERITIES.includes(result.severity as never) ? result.severity : 'Medium'
      ) as Severity;
      setCategory(cat);
      setSeverity(sev);

      // Fetch the AI recommendation in the background (non-blocking failure).
      setRecommending(true);
      getRecommendation({ category: cat, severity: sev, description: result.description_en })
        .then(setRecommendation)
        .catch(() => setRecommendation(null))
        .finally(() => setRecommending(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while analyzing the image.');
    } finally {
      setCategorizing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) void processFile(picked);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const picked = e.dataTransfer.files?.[0];
    if (picked && picked.type.startsWith('image/')) void processFile(picked);
  }

  // When a pin is dropped, reverse-geocode to auto-fill municipality (and ward when possible).
  async function handlePickLocation(p: LatLng) {
    setCoords(p);
    setGeoNote('Detecting location…');
    try {
      const g = await reverseGeocode(p.lat, p.lng);
      if (g.municipality) {
        setMunicipality(g.municipality);
        setMunicipalityChosen(true);
        const validWards = wardsFor(g.municipality).map(String);
        if (g.ward && validWards.includes(g.ward)) setWard(g.ward);
        setGeoNote(`📍 Detected: ${g.municipality}${g.ward ? `, Ward ${g.ward}` : ''}`);
      } else {
        setGeoNote('Location pinned — municipality not auto-detected, please select it.');
      }
    } catch {
      setGeoNote('');
    }
  }

  async function handleGenerate(target: LetterLanguage) {
    setError('');
    setCopied(false);
    setGeneratingLang(target);
    try {
      const { nibedan: text } = await generateNibedan({
        category,
        location,
        ward,
        municipality,
        citizenName,
        contact,
        extra,
        language: target,
      });
      if (target === 'np') setNpText(text);
      else setEnText(text);
      setLang(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the letter.');
    } finally {
      setGeneratingLang(null);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(activeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([activeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = lang === 'np' ? 'nibedan' : 'complaint-letter';
    a.download = `${base}-ward-${ward || 'x'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmitReport(force = false) {
    setError('');
    if (!category || !ward) {
      setError('Please select a category and ward before submitting.');
      return;
    }
    if (!reports.configured) {
      setError('Supabase is not configured. Add your credentials to frontend/.env (see README).');
      return;
    }

    // Duplicate check (skipped when the user chooses "Submit anyway").
    // Best-effort: pulls a minimal, no-PII list of active reports via RPC —
    // if it fails we let the submission proceed rather than block the citizen.
    if (!force) {
      try {
        const existing = await listActiveReportsMin();
        const matches = findSimilarReports(
          {
            category,
            ward,
            latitude: coords?.lat ?? null,
            longitude: coords?.lng ?? null,
            description: detection?.description_en ?? extra,
          },
          existing
        );
        if (matches.length > 0) {
          setSimilar(matches);
          return;
        }
      } catch {
        /* duplicate detection is non-critical; continue with submission */
      }
    }
    setSimilar([]);

    setSubmitting(true);
    try {
      const image_url = file ? await uploadReportImage(file) : null;
      const saved = await createReport({
        category,
        severity,
        description_en: detection?.description_en ?? null,
        description_np: detection?.description_np ?? null,
        ward,
        municipality,
        location: location || null,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        reporter_name: citizenName || null,
        contact: contact || null,
        nibedan: npText || null,
        english_letter: enText || null,
        recommendation,
        image_url,
      });
      reports.prepend(saved);
      setSubmitted(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the report.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Success screen ----
  if (submitted) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16 text-center">
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl text-emerald-600"
          style={{ boxShadow: '0 0 0 10px rgba(22,163,74,.1)' }}
        >
          ✓
        </div>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-[30px]">
          Complaint Submitted Successfully
        </h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">
          Your complaint has been logged and routed to the ward office.{' '}
          <span className="np font-semibold text-blue-600">तपाईंको निवेदन दर्ता भयो।</span>
        </p>

        <div className="card my-7 p-6">
          <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-400">
            Your Tracking ID
          </div>
          <div className="mt-1.5 font-mono text-3xl font-extrabold tracking-wide text-blue-600 sm:text-4xl">
            {submitted.tracking_id}
          </div>
          <div className="mt-1.5 text-[12.5px] text-slate-500">
            Save this ID to track your complaint anytime.
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <DownloadPdfButton report={submitted} className="btn-primary" />
          <Link to={`/track?id=${submitted.tracking_id}`} className="btn-secondary">
            🔎 Track Progress
          </Link>
          <button onClick={resetForm} className="btn-secondary">
            ＋ Submit Another
          </button>
        </div>

        <div className="mt-7">
          <Link to="/" className="text-sm font-bold text-blue-700 hover:underline">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const ready = !!detection;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ color: NAVY }}>
          Report an Issue
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-500">
          Upload a photo, confirm the details, and we'll draft the official letter for you.{' '}
          <span className="np font-semibold text-blue-600">समस्या रिपोर्ट गर्नुहोस्।</span>
        </p>
      </div>

      {!reports.configured && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Supabase isn't configured yet — you can still try the AI flow, but submitting won't save.
          Add credentials to <code>frontend/.env</code> (see README).
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-2">
        {/* LEFT COLUMN */}
        <div className="flex min-w-0 flex-col gap-6">
          {/* 1. Upload evidence */}
          <section className="card p-6 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <StepBadge n={1} />
              <h2 className="text-xl font-bold" style={{ color: NAVY }}>
                Upload Evidence
              </h2>
            </div>

            {!imageData ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#3b82f6]/40 bg-white px-6 py-14 text-center transition hover:bg-[#eff4ff]"
              >
                <span
                  className="mb-4 flex h-20 w-20 items-center justify-center rounded-full shadow-sm transition group-hover:scale-110"
                  style={{ background: '#dce9ff' }}
                >
                  <Icon name="photo_camera" className="text-4xl" filled={false} />
                </span>
                <span className="text-lg font-bold" style={{ color: NAVY }}>
                  Drag &amp; drop a photo, or <span className="text-blue-600">click to browse</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  PNG / JPG up to 10MB
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-slate-200">
                <img src={imageData.dataUrl} alt="preview" className="h-56 w-full object-cover" />
                <label className="absolute right-2.5 top-2.5 cursor-pointer rounded-lg bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-slate-900/75">
                  Replace
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            )}

            <div
              className="mt-6 flex items-start gap-4 rounded-xl border border-slate-100 p-4"
              style={{ background: '#eff4ff' }}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm"
                style={{ color: NAVY }}
              >
                <Icon name="info" className="text-xl" />
              </span>
              <p className="text-sm font-medium leading-relaxed text-slate-600">
                Clear photos of the location help us process your complaint faster. Make sure the
                issue is clearly visible.
              </p>
            </div>
          </section>

          {/* 2. AI detection */}
          {categorizing && (
            <section className="card flex items-center gap-3.5 p-5">
              <span className="h-8 w-8 flex-shrink-0 rounded-full border-[3px] border-blue-100 border-t-blue-600 [animation:hwspin_.8s_linear_infinite]" />
              <div>
                <div className="text-[15px] font-bold">Analyzing photo…</div>
                <div className="text-[13px] text-slate-500">
                  Detecting category, severity and drafting a description.
                </div>
              </div>
            </section>
          )}

          {ready && detection && (
            <section className="card p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <h2 className="flex items-center gap-3 text-xl font-bold" style={{ color: NAVY }}>
                  <StepBadge n={2} /> AI Detection
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  ✓ AI Analysis Complete
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <CategoryBadge category={detection.category} />
                <SeverityBadge severity={detection.severity} />
              </div>
              <div className="mt-4 border-t border-dashed border-slate-200 pt-3.5">
                <div className="text-[11px] font-extrabold tracking-[0.06em] text-slate-400">
                  ENGLISH
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {detection.description_en}
                </p>
                {detection.description_np && (
                  <>
                    <div className="np mt-3 text-[11px] font-extrabold tracking-[0.06em] text-slate-400">
                      नेपाली
                    </div>
                    <p className="np-body mt-1 text-[14.5px] text-slate-700">
                      {detection.description_np}
                    </p>
                  </>
                )}
              </div>
            </section>
          )}

          {ready && (
            <>
              {(recommending || recommendation) && (
                <RecommendationCard recommendation={recommendation} loading={recommending} />
              )}

              {/* 3. Pin location */}
              <section className="card p-6 sm:p-8">
                <h2 className="mb-4 flex items-center gap-3 text-xl font-bold" style={{ color: NAVY }}>
                  <StepBadge n={3} /> Pin Location{' '}
                  <span className="text-xs font-semibold text-slate-400">optional</span>
                </h2>
                <Suspense
                  fallback={
                    <div className="flex h-[220px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">
                      Loading map…
                    </div>
                  }
                >
                  <LocationPicker value={coords} onChange={handlePickLocation} />
                </Suspense>
                {geoNote && (
                  <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                    {geoNote}
                  </p>
                )}
              </section>

              {/* 4. Issue details */}
              <section className="card p-6 sm:p-8">
                <h2 className="mb-5 flex items-center gap-3 text-xl font-bold" style={{ color: NAVY }}>
                  <StepBadge n={4} /> Issue Details
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Municipality">
                    <select
                      value={municipality}
                      onChange={(e) => {
                        const next = e.target.value;
                        setMunicipality(next);
                        setMunicipalityChosen(true);
                        if (ward && Number(ward) > wardsFor(next).length) setWard('');
                      }}
                      className="field-input"
                    >
                      {MUNICIPALITIES.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ward Number">
                    <select value={ward} onChange={(e) => setWard(e.target.value)} className="field-input">
                      <option value="">Select ward…</option>
                      {wardsFor(municipality).map((w) => (
                        <option key={w} value={w}>
                          Ward {w}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Issue Category">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="field-input"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Severity">
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as Severity)}
                      className="field-input"
                    >
                      {SEVERITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Citizen ID / Phone">
                    <input
                      type="tel"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="field-input"
                    />
                  </Field>
                  <Field label="Reporter Name">
                    <input
                      type="text"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      placeholder="Your full name"
                      className="field-input"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Specific Location / Landmark">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Near Bhatbhateni, Naya Bazaar"
                        className="field-input"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Extra details">
                      <textarea
                        value={extra}
                        onChange={(e) => setExtra(e.target.value)}
                        rows={3}
                        placeholder="Anything else the ward office should know…"
                        className="field-input resize-y leading-relaxed"
                      />
                    </Field>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerate(lang)}
                  disabled={generatingLang !== null || !ward}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold transition ${
                    generatingLang !== null || !ward
                      ? 'cursor-not-allowed bg-[#d3e4fe] text-slate-400'
                      : 'text-white hover:brightness-110'
                  }`}
                  style={
                    generatingLang !== null || !ward
                      ? undefined
                      : { background: NAVY, boxShadow: '0 8px 20px -6px rgba(11,27,63,.5)' }
                  }
                >
                  {generatingLang !== null ? (
                    <>
                      <Spinner light />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Icon name="auto_awesome" className="text-lg" filled />
                      Generate {lang === 'np' ? 'नेपाली निवेदन' : 'English letter'}
                    </>
                  )}
                </button>
                {!ward && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    Select a ward above to generate the letter.
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        {/* RIGHT COLUMN — letter preview */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <section className="card overflow-hidden p-0">
            <div
              className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 px-5 py-4"
              style={{ background: '#f8f9ff' }}
            >
              <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.15em] text-slate-500">
                <Icon name="description" className="text-base text-slate-400" />
                Official Letter Preview
              </div>
              <div
                className="flex rounded-lg border border-slate-200 p-1"
                style={{ background: '#dce9ff' }}
              >
                <LangTab
                  label="नेपाली"
                  active={lang === 'np'}
                  loading={generatingLang === 'np'}
                  onClick={() => (npText ? setLang('np') : ready && handleGenerate('np'))}
                />
                <LangTab
                  label="English"
                  active={lang === 'en'}
                  loading={generatingLang === 'en'}
                  onClick={() => (enText ? setLang('en') : ready && handleGenerate('en'))}
                />
              </div>
            </div>

            {!ready ? (
              <NibedanLetterhead
                municipality={municipalityChosen ? municipality : ''}
                ward={ward}
              />
            ) : activeText ? (
              <div>
                <div className="max-h-[48vh] overflow-auto bg-[#fcfcfd] p-[18px]">
                  <div className="card p-5 shadow-none">
                    <pre
                      className={`whitespace-pre-wrap text-[14px] text-slate-800 ${
                        lang === 'np' ? 'np-body' : 'font-sans leading-loose'
                      }`}
                    >
                      {activeText}
                    </pre>
                  </div>
                </div>
                <div className="flex gap-2.5 px-[18px] pb-1">
                  <button onClick={handleCopy} className="btn-secondary flex-1 py-2.5 text-[13.5px]">
                    ⧉ {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={handleDownload} className="btn-secondary flex-1 py-2.5 text-[13.5px]">
                    ⬇ Download .txt
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center gap-3.5 px-6 text-center">
                {generatingLang ? (
                  <>
                    <Spinner />
                    <p className="text-sm text-slate-500">Generating your letter…</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">
                    Use the <span className="font-semibold text-[#1a365d]">Generate letter</span>{' '}
                    button in the Issue Details section to draft your official{' '}
                    {lang === 'np' ? 'नेपाली निवेदन' : 'English letter'}.
                  </p>
                )}
              </div>
            )}

            {/* Duplicate warning */}
            {similar.length > 0 && (
              <div className="mx-[18px] mt-1 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                <p className="text-[13.5px] font-bold text-amber-700">
                  ⚠️ A similar complaint may already exist nearby
                </p>
                <ul className="mt-2 space-y-1">
                  {similar.map((m) => (
                    <li key={m.report.id} className="text-[13px] text-amber-800">
                      <Link
                        to={`/track?id=${m.report.tracking_id}`}
                        className="font-mono font-bold underline"
                      >
                        {m.report.tracking_id}
                      </Link>{' '}
                      · {m.report.category} ({m.reason})
                    </li>
                  ))}
                </ul>
                {!submitting && (
                  <button
                    onClick={() => handleSubmitReport(true)}
                    className="mt-2.5 text-[13px] font-bold text-amber-800 underline"
                  >
                    Submit anyway
                  </button>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="border-t border-slate-100 bg-white px-6 py-6">
              <button
                onClick={() => handleSubmitReport()}
                disabled={submitting || !ready}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-base font-bold transition ${
                  submitting || !ready
                    ? 'cursor-not-allowed bg-[#d3e4fe] text-slate-400'
                    : 'text-white hover:brightness-110'
                }`}
                style={
                  submitting || !ready
                    ? undefined
                    : { background: NAVY, boxShadow: '0 8px 20px -6px rgba(11,27,63,.5)' }
                }
              >
                {submitting && <Spinner light />}
                {submitting ? 'Submitting…' : 'Submit Complaint'}
              </button>
              <p className="mx-auto mt-4 max-w-sm text-center text-[11px] font-medium leading-relaxed text-slate-400">
                By submitting, you confirm the information is accurate. Your complaint is logged and
                routed to the selected ward office for official review.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-16 text-center">
        <Link
          to="/track"
          className="group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition hover:bg-[#eff4ff] hover:text-blue-600"
          style={{ color: NAVY }}
        >
          Track a complaint
          <Icon name="arrow_forward" className="text-lg transition group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function LangTab({
  label,
  active,
  loading,
  onClick,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-5 py-1.5 text-xs font-bold transition ${
        active ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-[#1a365d]'
      }`}
      style={active ? { color: NAVY } : undefined}
    >
      {loading ? '…' : label}
    </button>
  );
}

/**
 * Decorative empty-state for the letter preview: a faux official नेपाल सरकार
 * ward-office letterhead so users see what the generated nibedan will look like.
 */
function NibedanLetterhead({ municipality, ward }: { municipality: string; ward: string }) {
  return (
    <div className="px-5 py-7">
      <div
        className="relative mx-auto max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white px-7 pb-7 pt-6 shadow-sm"
        style={{ borderTop: `3px solid ${NAVY}` }}
      >
        {/* Government of Nepal emblem — top-left corner */}
        <img
          src="/nepal-emblem.svg"
          alt="Government of Nepal emblem"
          className="absolute left-4 top-4 h-12 w-12 object-contain"
        />
        {/* Flag of Nepal — top-right corner */}
        <img
          src="/nepal-flag.svg"
          alt="Flag of Nepal"
          className="absolute right-4 top-4 h-12 w-auto object-contain"
        />

        {/* DRAFT watermark */}
        <span
          className="np pointer-events-none absolute -right-6 top-24 rotate-12 text-5xl font-extrabold opacity-[0.05]"
          style={{ color: NAVY }}
        >
          नमुना
        </span>

        {/* Letterhead */}
        <div className="flex flex-col items-center text-center">
          <p className="np mt-1 text-[15px] font-bold leading-tight" style={{ color: NAVY }}>
            नेपाल सरकार
          </p>
          {municipality ? (
            <p className="np text-[13px] font-bold leading-tight" style={{ color: NAVY }}>
              {municipalityNp(municipality)}
            </p>
          ) : (
            <p className="np text-[13px] font-bold leading-tight text-slate-300">
              …………… नगरपालिका
            </p>
          )}
          <p className="np text-[12px] font-semibold text-slate-500">
            वडा नं. {ward || '…'} को कार्यालय
          </p>
        </div>

        <div className="my-3" style={{ borderTop: `3px double ${NAVY}` }} />

        {/* Reference row */}
        <div className="flex items-center justify-between text-[10.5px] text-slate-400">
          <span className="np">पत्र संख्या: …………</span>
          <span className="np">मिति: …………</span>
        </div>

        {/* Subject + salutation */}
        <p className="np mt-4 text-center text-[12px] font-bold" style={{ color: NAVY }}>
          विषय: समस्या समाधान सम्बन्धमा।
        </p>
        <p className="np mt-3 text-[12px] font-semibold text-slate-600">श्रीमान् वडा अध्यक्षज्यू,</p>

        {/* Body skeleton lines */}
        <div className="mt-3 space-y-2">
          <div className="h-2 rounded bg-slate-100" />
          <div className="h-2 rounded bg-slate-100" />
          <div className="h-2 w-11/12 rounded bg-slate-100" />
          <div className="h-2 w-3/4 rounded bg-slate-100" />
        </div>

        {/* Signature block */}
        <div className="mt-6 flex flex-col items-end gap-1.5">
          <p className="np text-[11px] font-semibold text-slate-500">निवेदक,</p>
          <div className="h-2 w-28 rounded bg-slate-100" />
          <div className="h-2 w-20 rounded bg-slate-100" />
        </div>
      </div>

      <p className="mx-auto mt-5 max-w-xs text-center text-sm font-semibold leading-relaxed text-slate-500">
        Upload a photo to begin — your official ward letter will be drafted on this template
        automatically.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

function Spinner({ light }: { light?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-t-transparent ${
        light ? 'border-white' : 'border-slate-400'
      }`}
    />
  );
}
