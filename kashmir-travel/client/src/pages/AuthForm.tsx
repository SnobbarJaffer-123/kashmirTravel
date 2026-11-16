import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      nav('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = 'border rounded px-3 py-2 w-full';
  return (
    <form onSubmit={submit} className="max-w-sm mx-auto bg-white border rounded-xl p-6 grid gap-4">
      <h1 className="text-2xl font-bold">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      {mode === 'register' && (
        <label className="grid gap-1 font-semibold">Name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
        </label>
      )}
      <label className="grid gap-1 font-semibold">Email
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>
      <label className="grid gap-1 font-semibold">Password
        <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
      </label>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button disabled={busy} className="px-4 py-2 rounded bg-lake text-white font-semibold disabled:opacity-60">
        {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
      </button>
    </form>
  );
}
