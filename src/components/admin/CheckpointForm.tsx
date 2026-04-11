import { useState, useEffect } from 'react';
import type { Checkpoint } from '../../lib/db';

interface CheckpointFormProps {
  editing?: Checkpoint | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function CheckpointForm({ editing, onSaved, onCancel }: CheckpointFormProps) {
  const [locationName, setLocationName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editing) {
      setLocationName(editing.location_name);
      setLat(String(editing.lat));
      setLng(String(editing.lng));
      setDescription(editing.description ?? '');
    }
  }, [editing]);

  function handleGeolocation() {
    if (!navigator.geolocation) {
      setGeoError('Browser tidak mendukung Geolocation');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGeoLoading(false);
      },
      (err) => {
        setGeoError('Gagal mendapat lokasi: ' + err.message);
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      location_name: locationName,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      description: description || null,
    };

    try {
      const url = editing
        ? `/api/checkpoints/${editing.id}`
        : '/api/checkpoints';
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSaved();
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal menyimpan checkpoint');
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-stone-900 sm:rounded-2xl rounded-t-2xl border border-stone-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <h2 className="text-base font-semibold text-stone-100">
            {editing ? '✏️ Edit Checkpoint' : '📍 Tambah Checkpoint'}
          </h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Location Name */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">
              Nama Lokasi *
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="cth: Malang"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-600
                         focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-sm"
            />
          </div>

          {/* Coordinates */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-stone-400 uppercase tracking-wider">
                Koordinat *
              </label>
              <button
                type="button"
                onClick={handleGeolocation}
                disabled={geoLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20
                           text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                {geoLoading ? (
                  <span className="inline-block w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  '📍'
                )}
                {geoLoading ? 'Mendapat lokasi...' : 'Gunakan Lokasi Saat Ini'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="-7.9797"
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-600
                             focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="112.6304"
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-600
                             focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-sm font-mono"
                />
              </div>
            </div>
            {geoError && (
              <p className="text-xs text-red-400 mt-1.5">{geoError}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">
              Deskripsi <span className="text-stone-600 normal-case">(opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cerita singkat tentang tempat ini..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-600
                         focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-sm resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all text-sm font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500
                         text-stone-950 font-semibold transition-all text-sm flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="inline-block w-4 h-4 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
              ) : null}
              {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Checkpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
