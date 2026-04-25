import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '../../lib/adminFetch';
import type { CaptionTone } from '../../lib/ai/types';

const TONE_OPTIONS: { value: CaptionTone; label: string; description: string }[] = [
  { value: 'descriptive',  label: '📋 Deskriptif',   description: 'Faktual, jelas, dan informatif' },
  { value: 'poetic',       label: '🌸 Puitis',       description: 'Liris, evokatif, dengan imajinasi vivid' },
  { value: 'casual',       label: '😊 Santai',       description: 'Ramah, percakapan, seperti cerita ke teman' },
  { value: 'storytelling', label: '📖 Naratif',      description: 'Narasi orang pertama, gaya jurnal perjalanan' },
  { value: 'minimal',      label: '✂️ Minimal',      description: 'Pendek, tajam, maksimal 10 kata' },
];

interface AiSettingsData {
  gemini_api_key: string;
  global_context: string;
  caption_tone: CaptionTone;
  has_api_key: boolean;
}

interface AiSettingsPanelProps {
  onClose: () => void;
}

export function AiSettingsPanel({ onClose }: AiSettingsPanelProps) {
  const [settings, setSettings] = useState<AiSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // API key form
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Global context
  const [contextInput, setContextInput] = useState('');
  const [savingContext, setSavingContext] = useState(false);

  // Tone
  const [toneValue, setToneValue] = useState<CaptionTone>('descriptive');
  const [savingTone, setSavingTone] = useState(false);

  // ── Load settings ──────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/ai/settings');
      if (!res.ok) throw new Error('Gagal memuat pengaturan AI');
      const data = await res.json() as AiSettingsData;
      setSettings(data);
      setContextInput(data.global_context || '');
      setToneValue(data.caption_tone || 'descriptive');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // ── Save helpers ────────────────────────────────────────────────────────────
  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2500);
  }

  async function saveApiKey() {
    if (!apiKeyInput.trim()) return;
    setSavingKey(true);
    setError('');
    try {
      const res = await adminFetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: apiKeyInput.trim() }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan API key');
      setApiKeyInput('');
      showSuccess('API key berhasil disimpan!');
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSavingKey(false);
    }
  }

  async function clearApiKey() {
    setSavingKey(true);
    setError('');
    try {
      const res = await adminFetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: '' }),
      });
      if (!res.ok) throw new Error('Gagal menghapus API key');
      showSuccess('API key berhasil dihapus');
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus');
    } finally {
      setSavingKey(false);
    }
  }

  async function saveContext() {
    setSavingContext(true);
    setError('');
    try {
      const res = await adminFetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_context: contextInput }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan konteks');
      showSuccess('Konteks global berhasil disimpan!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSavingContext(false);
    }
  }

  async function saveTone(newTone: CaptionTone) {
    setToneValue(newTone);
    setSavingTone(true);
    setError('');
    try {
      const res = await adminFetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption_tone: newTone }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan tone');
      showSuccess('Tone caption berhasil diubah!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSavingTone(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const selectedTone = TONE_OPTIONS.find(t => t.value === toneValue);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-stone-900 sm:rounded-2xl rounded-t-2xl border border-stone-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800 shrink-0 bg-stone-900/50">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h2 className="text-base font-semibold text-stone-100">AI Caption Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-xl bg-stone-800 p-4 animate-pulse">
                  <div className="h-3 bg-stone-700 rounded w-24 mb-3" />
                  <div className="h-8 bg-stone-700 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* ── API Key ──────────────────────────────────────────── */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                  🔑 Gemini API Key
                </label>

                {settings?.has_api_key && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-xs text-emerald-400 flex-1 font-mono">
                      {settings.gemini_api_key}
                    </span>
                    <button
                      onClick={clearApiKey}
                      disabled={savingKey}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={settings?.has_api_key ? 'Ganti dengan key baru...' : 'Masukkan Gemini API key...'}
                      className="w-full px-3 py-2.5 pr-10 rounded-lg bg-stone-800 border border-stone-700 text-stone-100
                                 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm font-mono transition-all"
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors text-sm"
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <button
                    onClick={saveApiKey}
                    disabled={savingKey || !apiKeyInput.trim()}
                    className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500
                               text-stone-950 font-semibold text-sm transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {savingKey ? (
                      <span className="inline-block w-3.5 h-3.5 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
                    ) : 'Simpan'}
                  </button>
                </div>

                <p className="text-xs text-stone-600">
                  Dapatkan API key gratis di{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-400 underline underline-offset-2"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              {/* ── Global Context ───────────────────────────────────── */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                  📝 Konteks Global
                </label>
                <textarea
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  placeholder="Contoh: Scrollytelling ini tentang perjalanan motor dari Malang ke Yogyakarta via pantai selatan..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100
                             placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm resize-none transition-all"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-stone-600">
                    Konteks ini akan disertakan di setiap prompt AI untuk hasil yang lebih relevan.
                  </p>
                  <button
                    onClick={saveContext}
                    disabled={savingContext}
                    className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300
                               hover:bg-stone-700 hover:border-stone-600 text-xs font-medium transition-all
                               disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {savingContext ? (
                      <span className="inline-block w-3 h-3 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
                    ) : 'Simpan Konteks'}
                  </button>
                </div>
              </div>

              {/* ── Caption Tone ──────────────────────────────────────── */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-stone-400 uppercase tracking-wider">
                  🎨 Tone Caption
                </label>
                <div className="space-y-1.5">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => saveTone(tone.value)}
                      disabled={savingTone}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all
                        ${toneValue === tone.value
                          ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20'
                          : 'bg-stone-800/50 border-stone-700 hover:bg-stone-800 hover:border-stone-600'
                        }`}
                    >
                      <span className="text-sm font-medium text-stone-200">{tone.label}</span>
                      <span className="text-xs text-stone-500 flex-1">{tone.description}</span>
                      {toneValue === tone.value && (
                        <span className="text-amber-400 text-xs font-bold">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                {selectedTone && (
                  <p className="text-xs text-stone-500 italic mt-1">
                    Aktif: {selectedTone.description}
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Status messages ──────────────────────────────────────── */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm animate-pulse">
              ✅ {success}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-800 shrink-0 bg-stone-900/50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200
                       hover:border-stone-500 transition-all text-sm font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
