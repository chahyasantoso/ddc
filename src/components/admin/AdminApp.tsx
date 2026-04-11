import { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import type { CheckpointWithPhotos } from '../../lib/db';

type View = 'login' | 'dashboard' | 'add-checkpoint' | 'edit-checkpoint';

interface AppState {
  view: View;
  editingId: number | null;
}

export function AdminApp() {
  const [auth, setAuth] = useState(false);
  const [state, setState] = useState<AppState>({ view: 'login', editingId: null });
  const [checkpoints, setCheckpoints] = useState<CheckpointWithPhotos[]>([]);
  const [loading, setLoading] = useState(false);

  // Check existing session
  useEffect(() => {
    const token = localStorage.getItem('ddc-admin-token');
    if (token) {
      setAuth(true);
      setState({ view: 'dashboard', editingId: null });
    }
  }, []);

  // Fetch checkpoints when authenticated
  useEffect(() => {
    if (auth) fetchCheckpoints();
  }, [auth]);

  async function fetchCheckpoints() {
    setLoading(true);
    try {
      const res = await fetch('/api/checkpoints');
      const data = await res.json();
      setCheckpoints(data);
    } catch (err) {
      console.error('Failed to fetch checkpoints:', err);
    }
    setLoading(false);
  }

  function handleLogin(token: string) {
    localStorage.setItem('ddc-admin-token', token);
    setAuth(true);
    setState({ view: 'dashboard', editingId: null });
  }

  function handleLogout() {
    localStorage.removeItem('ddc-admin-token');
    setAuth(false);
    setState({ view: 'login', editingId: null });
  }

  if (!auth) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <AdminDashboard
      checkpoints={checkpoints}
      loading={loading}
      onRefresh={fetchCheckpoints}
      onLogout={handleLogout}
    />
  );
}
