import { useState } from 'react';
import type { CheckpointWithPhotos, Checkpoint } from '../../lib/db';
import { CheckpointForm } from './CheckpointForm';
import { PhotoUploader } from './PhotoUploader';
import { AiSettingsPanel } from './AiSettingsPanel';
import { adminFetch } from '../../lib/adminFetch';

interface AdminDashboardProps {
  checkpoints: CheckpointWithPhotos[];
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}

export function AdminDashboard({ checkpoints, loading, onRefresh, onLogout }: AdminDashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCheckpoint, setEditingCheckpoint] = useState<Checkpoint | null>(null);
  const [photoTarget, setPhotoTarget] = useState<CheckpointWithPhotos | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await adminFetch(`/api/checkpoints/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDeleteId(null);
        onRefresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleCheckpointSaved() {
    setShowAddForm(false);
    setEditingCheckpoint(null);
    onRefresh();
  }

  function handlePhotosDone() {
    setPhotoTarget(null);
    onRefresh();
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-stone-950/90 backdrop-blur-md border-b border-stone-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <div>
            <h1 className="text-sm font-semibold leading-none text-stone-100">DDC Admin</h1>
            <p className="text-xs text-stone-600 mt-0.5">Travel Journal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAiSettings(true)}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
            title="AI Settings"
          >
            <span className="text-base">🤖</span>
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onLogout}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-stone-900 border border-stone-800 p-4">
            <p className="text-xs text-stone-500">Total Checkpoint</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{checkpoints.length}</p>
          </div>
          <div className="rounded-xl bg-stone-900 border border-stone-800 p-4">
            <p className="text-xs text-stone-500">Total Foto</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">
              {checkpoints.reduce((acc, c) => acc + c.photos.length, 0)}
            </p>
          </div>
        </div>

        {/* Add Checkpoint Button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 border-dashed border-stone-700
                     hover:border-amber-500/50 hover:bg-amber-500/5 text-stone-400 hover:text-amber-400 transition-all group"
        >
          <span className="text-xl group-hover:scale-110 transition-transform">+</span>
          <span className="text-sm font-medium">Tambah Checkpoint Baru</span>
        </button>

        {/* Loading skeleton */}
        {loading && checkpoints.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-stone-900 border border-stone-800 p-4 animate-pulse">
                <div className="h-4 bg-stone-800 rounded w-32 mb-3" />
                <div className="h-3 bg-stone-800 rounded w-24" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && checkpoints.length === 0 && (
          <div className="text-center py-16 text-stone-600">
            <p className="text-4xl mb-3">🏁</p>
            <p className="font-medium text-stone-400">Belum ada checkpoint</p>
            <p className="text-sm mt-1">Tambahkan checkpoint pertama untuk memulai perjalanan.</p>
          </div>
        )}

        {/* Checkpoint list */}
        <div className="space-y-4">
          {checkpoints.map((cp, idx) => (
            <div
              key={cp.id}
              className="rounded-xl bg-stone-900 border border-stone-800 overflow-hidden"
            >
              {/* Card header */}
              <div className="flex items-start gap-4 p-5">
                {/* Order badge */}
                <div className="shrink-0 w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-400">{idx + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-stone-100 truncate">{cp.location_name}</h2>
                  <p className="text-xs text-stone-500 font-mono mt-0.5">
                    {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}
                  </p>
                  {cp.description && (
                    <p className="text-sm text-stone-400 mt-1 line-clamp-2">{cp.description}</p>
                  )}
                </div>
              </div>

              {/* Photo thumbnails */}
              {cp.photos.length > 0 && (
                <div className="px-5 pb-4 flex gap-3">
                  {cp.photos.slice(0, 4).map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.photo_url}
                      alt={photo.caption}
                      className="w-14 h-14 rounded-lg object-cover bg-stone-800 border border-stone-700"
                    />
                  ))}
                  {cp.photos.length > 4 && (
                    <div className="w-14 h-14 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-xs text-stone-400 font-medium">
                      +{cp.photos.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex border-t border-stone-800 divide-x divide-stone-800">
                <button
                  onClick={() => setPhotoTarget(cp)}
                  className="flex-1 py-3 text-sm text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 transition-colors flex items-center justify-center gap-2"
                >
                  🖼️ Foto <span className="text-amber-500 font-medium">({cp.photos.length})</span>
                </button>
                <button
                  onClick={() => setEditingCheckpoint(cp)}
                  className="flex-1 py-3 text-sm text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 transition-colors flex items-center justify-center gap-2"
                >
                  ✏️ Edit
                </button>
                {confirmDeleteId === cp.id ? (
                  <button
                    onClick={() => handleDelete(cp.id)}
                    disabled={deletingId === cp.id}
                    className="flex-1 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    {deletingId === cp.id ? (
                      <span className="inline-block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : 'Yakin hapus?'}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(cp.id)}
                    className="flex-1 py-3 text-sm text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                  >
                    🗑️ Hapus
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modals */}
      {(showAddForm || editingCheckpoint) && (
        <CheckpointForm
          editing={editingCheckpoint}
          onSaved={handleCheckpointSaved}
          onCancel={() => { setShowAddForm(false); setEditingCheckpoint(null); }}
        />
      )}

      {photoTarget && (
        <PhotoUploader
          checkpointId={photoTarget.id}
          existingPhotos={photoTarget.photos}
          locationName={photoTarget.location_name}
          onDone={handlePhotosDone}
          onClose={() => setPhotoTarget(null)}
        />
      )}

      {showAiSettings && (
        <AiSettingsPanel onClose={() => setShowAiSettings(false)} />
      )}
    </div>
  );
}
