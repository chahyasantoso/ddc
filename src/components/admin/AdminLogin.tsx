import { useState } from 'react';

interface AdminLoginProps {
  onLogin: (token: string) => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Login gagal');
      }
    } catch {
      setError('Tidak dapat terhubung ke server');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <span className="text-2xl">🗺️</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100">DDC Admin</h1>
          <p className="text-stone-500 text-sm mt-1">Travel Journal Control Panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-400 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password admin"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-600
                         focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-700 disabled:text-stone-500
                       text-stone-950 font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
                Masuk...
              </>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <p className="text-center text-stone-700 text-xs mt-8">
          DDC Travel Journal · Local Dev
        </p>
      </div>
    </div>
  );
}
