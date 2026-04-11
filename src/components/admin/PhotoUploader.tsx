import { useState, useCallback } from 'react';
import type { Photo } from '../../lib/db';

interface PhotoUploaderProps {
  checkpointId: number;
  existingPhotos: Photo[];
  onDone: () => void;
  onClose: () => void;
}

interface PendingPhoto {
  file: File;
  preview: string;
  caption: string;
}

export function PhotoUploader({ checkpointId, existingPhotos, onDone, onClose }: PhotoUploaderProps) {
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Manage existing photos (reorder / delete)
  const [managed, setManaged] = useState<Photo[]>(existingPhotos);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const totalCount = managed.length + pending.length;

  // ── File picking / drag-drop ─────────────────────────────────────────────
  function addFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 5 - totalCount;
    if (remaining <= 0) return;

    const toAdd = Array.from(files).slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: '',
    }));
    setPending((prev) => [...prev, ...toAdd]);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    e.target.value = ''; // reset so same file can be re-selected
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [totalCount]);

  // ── Pending photo actions ────────────────────────────────────────────────
  function removePending(idx: number) {
    setPending((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function updateCaption(idx: number, caption: string) {
    setPending((prev) => prev.map((p, i) => (i === idx ? { ...p, caption } : p)));
  }

  // ── Upload all pending ───────────────────────────────────────────────────
  async function handleUpload() {
    if (pending.length === 0) return;
    setError('');
    setUploading(true);

    try {
      for (let i = 0; i < pending.length; i++) {
        const { file, caption } = pending[i];
        const fd = new FormData();
        fd.append('photo', file);
        fd.append('caption', caption);
        fd.append('order', String(managed.length + i));

        const res = await fetch(`/api/checkpoints/${checkpointId}/photos`, {
          method: 'POST',
          body: fd,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Upload foto ${i + 1} gagal`);
        }
      }
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload gagal');
    } finally {
      setUploading(false);
    }
  }

  // ── Delete existing photo ────────────────────────────────────────────────
  async function deletePhoto(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setManaged((prev) => prev.filter((p) => p.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || 'Gagal menghapus foto');
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Drag-reorder existing photos ─────────────────────────────────────────
  function handleDragStart(idx: number) {
    setDraggingIdx(idx);
  }

  function handleDragEnter(idx: number) {
    if (draggingIdx === null || draggingIdx === idx) return;
    const reordered = [...managed];
    const [moved] = reordered.splice(draggingIdx, 1);
    reordered.splice(idx, 0, moved);
    setDraggingIdx(idx);
    setManaged(reordered);
  }

  async function handleDragEnd() {
    setDraggingIdx(null);
    // Persist new order
    for (let i = 0; i < managed.length; i++) {
      await fetch(`/api/photos/${managed[i].id}/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: i }),
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-xl bg-stone-900 sm:rounded-2xl rounded-t-2xl border border-stone-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 shrink-0">
          <h2 className="text-base font-semibold text-stone-100">🖼️ Kelola Foto</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Existing photos list */}
          {managed.length > 0 && (
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2 font-medium">
                Foto Tersimpan — drag untuk urut ulang
              </p>
              <div className="space-y-2">
                {managed.map((photo, idx) => (
                  <div
                    key={photo.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`flex items-center gap-3 p-2.5 rounded-xl bg-stone-800 border cursor-grab active:cursor-grabbing transition-all
                                ${draggingIdx === idx ? 'border-amber-500/50 opacity-50' : 'border-stone-700'}`}
                  >
                    <span className="text-stone-600 select-none">⠿</span>
                    <img
                      src={photo.photo_url}
                      alt={photo.caption}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-stone-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-200 truncate">{photo.caption || '—'}</p>
                      <p className="text-xs text-stone-600">Foto #{idx + 1}</p>
                    </div>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      disabled={deletingId === photo.id}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      {deletingId === photo.id ? (
                        <span className="inline-block w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : '🗑'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop zone — only if under limit */}
          {totalCount < 5 && (
            <div>
              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2 font-medium">
                Tambah Foto ({totalCount}/5)
              </p>
              <label
                className={`flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed cursor-pointer transition-all
                             ${dragOver ? 'border-amber-500 bg-amber-500/5' : 'border-stone-700 hover:border-stone-500 bg-stone-800/50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <span className="text-2xl">📷</span>
                <span className="text-sm text-stone-400">Drop foto di sini atau</span>
                <span className="text-xs text-amber-500 font-medium">Pilih File</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Pending photos */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">
                Siap Upload ({pending.length})
              </p>
              {pending.map((p, idx) => (
                <div key={idx} className="flex gap-3 p-3 rounded-xl bg-stone-800 border border-amber-500/20">
                  <img
                    src={p.preview}
                    alt="preview"
                    className="w-16 h-16 rounded-lg object-cover shrink-0 bg-stone-700"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <input
                      type="text"
                      value={p.caption}
                      onChange={(e) => updateCaption(idx, e.target.value)}
                      placeholder="Caption foto ini..."
                      className="w-full px-2.5 py-2 rounded-lg bg-stone-700 border border-stone-600 text-stone-100 placeholder-stone-500
                                 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm transition-all"
                    />
                    <p className="text-xs text-stone-500 truncate">{p.file.name}</p>
                  </div>
                  <button
                    onClick={() => removePending(idx)}
                    className="self-start w-7 h-7 flex items-center justify-center rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-stone-800 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-all text-sm font-medium"
          >
            Tutup
          </button>
          {pending.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500
                         text-stone-950 font-semibold transition-all text-sm flex items-center justify-center gap-2"
            >
              {uploading && (
                <span className="inline-block w-4 h-4 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
              )}
              {uploading ? 'Mengupload...' : `Upload ${pending.length} Foto`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
