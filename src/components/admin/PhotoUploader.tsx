import { useState, useCallback } from 'react';
import type { Photo } from '../../lib/db';
import { compressImage } from '../../lib/imageOpt';
import { adminFetch } from '../../lib/adminFetch';

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
  isBackdrop: boolean;
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
  const [editingCaptionId, setEditingCaptionId] = useState<number | null>(null);
  const [editingCaptionValue, setEditingCaptionValue] = useState('');

  const totalCount = managed.length + pending.length;

  // ── File picking / drag-drop ─────────────────────────────────────────────
  async function addFiles(files: FileList | null) {
    if (!files) return;

    const fileArray = Array.from(files);
    setUploading(true);
    const toAdd: PendingPhoto[] = [];
    for (const originalFile of fileArray) {
      try {
        const file = await compressImage(originalFile);
        toAdd.push({
          file,
          preview: URL.createObjectURL(file),
          caption: '',
          isBackdrop: false,
        });
      } catch (err) {
        console.error('Failed to compress image:', err);
      }
    }
    setPending((prev) => [...prev, ...toAdd]);
    setUploading(false);
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

  function togglePendingBackdrop(idx: number) {
    setPending((prev) => prev.map((p, i) => (i === idx ? { ...p, isBackdrop: !p.isBackdrop } : p)));
  }

  // ── Upload all pending ───────────────────────────────────────────────────
  async function handleUpload() {
    if (pending.length === 0) return;
    setError('');
    setUploading(true);

    try {
      for (let i = 0; i < pending.length; i++) {
        const { file, caption, isBackdrop } = pending[i];
        const fd = new FormData();
        fd.append('photo', file);
        fd.append('caption', caption);
        fd.append('order', String(managed.length + i));
        fd.append('is_backdrop', isBackdrop ? '1' : '0');

        const res = await adminFetch(`/api/checkpoints/${checkpointId}/photos`, {
          method: 'POST',
          body: fd,
        });

        if (!res.ok) {
          const data = await res.json() as { error?: string };
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
      const res = await adminFetch(`/api/photos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setManaged((prev) => prev.filter((p) => p.id !== id));
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Gagal menghapus foto');
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleManagedBackdrop(id: number, current: number) {
    const newValue = current ? 0 : 1;
    try {
      const res = await adminFetch(`/api/photos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_backdrop: newValue }),
      });
      if (res.ok) {
        setManaged((prev) => prev.map((p) => p.id === id ? { ...p, is_backdrop: newValue } : p));
      }
    } catch (err) {
      console.error('Failed to update backdrop status', err);
    }
  }

  // ── Edit caption for existing photo ────────────────────────────────────────
  function startEditCaption(photo: Photo) {
    setEditingCaptionId(photo.id);
    setEditingCaptionValue(photo.caption ?? '');
  }

  async function saveCaption(id: number) {
    try {
      const res = await adminFetch(`/api/photos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: editingCaptionValue }),
      });
      if (res.ok) {
        setManaged((prev) =>
          prev.map((p) => (p.id === id ? { ...p, caption: editingCaptionValue } : p))
        );
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error || 'Gagal menyimpan caption');
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setEditingCaptionId(null);
    }
  }

  function handleCaptionKeyDown(e: React.KeyboardEvent, id: number) {
    if (e.key === 'Enter') saveCaption(id);
    if (e.key === 'Escape') setEditingCaptionId(null);
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

  async function persistOrder(photos: Photo[]) {
    try {
      for (let i = 0; i < photos.length; i++) {
        await adminFetch(`/api/photos/${photos[i].id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: i }),
        });
      }
    } catch (err) {
      console.error('Failed to persist photo order', err);
      setError('Gagal menyimpan urutan foto');
    }
  }

  async function handleDragEnd() {
    setDraggingIdx(null);
    await persistOrder(managed);
  }

  // ── Touch-based reorder (mobile) ────────────────────────────────────────
  const [touchIdx, setTouchIdx] = useState<number | null>(null);

  function moveItem(fromIdx: number, direction: 'up' | 'down') {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= managed.length) return;
    const reordered = [...managed];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setManaged(reordered);
    setTouchIdx(toIdx);
    persistOrder(reordered);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-xl bg-stone-900 sm:rounded-2xl rounded-t-2xl border border-stone-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-800 shrink-0 bg-stone-900/50">
          <h2 className="text-lg font-semibold text-stone-100">🖼️ Kelola Foto</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-8">
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
                                ${draggingIdx === idx || touchIdx === idx ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-stone-700'}`}
                  >
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveItem(idx, 'up')}
                        disabled={idx === 0}
                        className="w-6 h-5 flex items-center justify-center rounded text-stone-500 hover:text-amber-400 hover:bg-stone-700 disabled:opacity-20 disabled:pointer-events-none transition-colors text-xs"
                        title="Pindah ke atas"
                      >▲</button>
                      <button
                        onClick={() => moveItem(idx, 'down')}
                        disabled={idx === managed.length - 1}
                        className="w-6 h-5 flex items-center justify-center rounded text-stone-500 hover:text-amber-400 hover:bg-stone-700 disabled:opacity-20 disabled:pointer-events-none transition-colors text-xs"
                        title="Pindah ke bawah"
                      >▼</button>
                    </div>
                    <img
                      src={photo.photo_url}
                      alt={photo.caption}
                      className="w-12 h-12 rounded-lg object-cover shrink-0 bg-stone-700"
                    />
                    <div className="flex-1 min-w-0">
                      {editingCaptionId === photo.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={editingCaptionValue}
                            onChange={(e) => setEditingCaptionValue(e.target.value)}
                            onKeyDown={(e) => handleCaptionKeyDown(e, photo.id)}
                            onBlur={() => saveCaption(photo.id)}
                            placeholder="Caption foto ini..."
                            className="flex-1 min-w-0 px-2 py-1 rounded-md bg-stone-900 border border-amber-500/40 text-stone-100
                                       placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm transition-all"
                          />
                          <button
                            onMouseDown={(e) => { e.preventDefault(); saveCaption(photo.id); }}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors"
                            title="Simpan"
                          >✓</button>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); setEditingCaptionId(null); }}
                            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-stone-800 hover:bg-stone-700 text-stone-400 text-xs transition-colors"
                            title="Batal"
                          >✕</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditCaption(photo)}
                          className="w-full text-left group"
                          title="Klik untuk edit caption"
                        >
                          <p className="text-sm text-stone-200 truncate group-hover:text-amber-400 transition-colors">
                            {photo.caption || <span className="text-stone-600 italic">Tambah caption...</span>}
                          </p>
                        </button>
                      )}
                      <p className="text-xs text-stone-600 mt-0.5">Foto #{idx + 1} · klik caption untuk edit</p>
                    </div>
                    <button
                      onClick={() => toggleManagedBackdrop(photo.id, photo.is_backdrop)}
                      title={photo.is_backdrop ? 'Jadikan biasa' : 'Jadikan backdrop'}
                      className={`shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border ${
                        photo.is_backdrop 
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20' 
                          : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-stone-300'
                      }`}
                    >
                      {photo.is_backdrop ? '★ Backdrop' : '☆ Reguler'}
                    </button>
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

          {/* Drop zone */}
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wider mb-2 font-medium">
              Tambah Foto ({totalCount})
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

          {/* Pending photos */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 uppercase tracking-wider font-medium">
                Siap Upload ({pending.length})
              </p>
              {pending.map((p, idx) => (
                <div key={idx} className="flex flex-col gap-3 p-4 rounded-xl bg-stone-800/50 border border-amber-500/20">
                  <div className="flex gap-4">
                    <img
                      src={p.preview}
                      alt="preview"
                      className="w-20 h-20 rounded-lg object-cover shrink-0 bg-stone-700 border border-stone-600"
                    />
                    <div className="flex-1 min-w-0 space-y-3">
                      <input
                        type="text"
                        value={p.caption}
                        onChange={(e) => updateCaption(idx, e.target.value)}
                        placeholder="Caption foto ini..."
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500
                                   focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-sm transition-all"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={p.isBackdrop}
                            onChange={() => togglePendingBackdrop(idx)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                            ${p.isBackdrop ? 'bg-indigo-500 border-indigo-500' : 'bg-stone-800 border-stone-600 group-hover:border-stone-400'}`}>
                            {p.isBackdrop && <span className="text-[10px] text-white font-bold">✓</span>}
                          </div>
                          <span className={`text-sm ${p.isBackdrop ? 'text-indigo-400 font-medium' : 'text-stone-400'}`}>
                            Jadikan Backdrop
                          </span>
                        </label>
                        <p className="text-xs text-stone-500 truncate max-w-[120px]" title={p.file.name}>{p.file.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removePending(idx)}
                      className="self-start w-8 h-8 flex items-center justify-center rounded-lg text-stone-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
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
        <div className="px-6 py-5 border-t border-stone-800 shrink-0 flex gap-3 bg-stone-900/50">
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
