'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { UserPlus, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/layout/AuthGuard';
import type { Profile } from '@/lib/types';

export function UserManager() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'viewer'>('viewer');
  const [error, setError] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      return (data ?? []) as Profile[];
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      // Use the API route to create user with admin client
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to create user');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('viewer');
      setError('');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const isAdmin = currentUser?.role === 'admin';
  const adminCount = users.filter((u) => u.role === 'admin').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-text-primary">Users</h2>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 rounded-lg border border-border bg-bg-secondary p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'viewer')}
              className="rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => createUser.mutate()}
              disabled={!name || !email || !password || createUser.isPending}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
            >
              {createUser.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-bg-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-sm text-text-primary">{u.name}</span>
                <span className="ml-2 text-xs text-text-muted">{u.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  u.role === 'admin'
                    ? 'bg-accent/10 text-accent'
                    : 'bg-bg-tertiary text-text-muted'
                }`}
              >
                {u.role}
              </span>
              {isAdmin &&
                u.id !== currentUser?.id &&
                !(u.role === 'admin' && adminCount <= 1) && (
                  <button
                    onClick={() => deleteUser.mutate(u.id)}
                    className="text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
