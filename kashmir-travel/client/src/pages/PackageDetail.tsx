import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Pkg } from '../api';
import { useAuth } from '../AuthContext';
import Reviews from './Reviews';

export default function PackageDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [pkg, setPkg] = useState<Pkg | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading');
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  // Load this package when the page opens
  useEffect(() => {
    api<Pkg>(`/packages/${slug}`)
      .then((p) => { setPkg(p); setState('ok'); })
      .catch(() => setState('error'));
  }, [slug]);

  // Whenever the date changes, ask how many seats are left
useEffect(() => {
  if (!pkg || !date) { setLeft(null); return; }
  api<{ left: number }>(`/packages/${pkg.id}/availability?date=${date}`)
    .then((d) => setLeft(d.left))
    .catch(() => setLeft(null));
}, [pkg, date]);

  if (state === 'loading') return <p>Loading…</p>;
  if (state === 'error' || !pkg) {
    return <p>Package not found. <Link to="/" className="text-lake underline">Back to packages</Link></p>;
  }

  const total = pkg.price_inr * guests; // shown to the user; the server recalculates it
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  async function book(e: FormEvent) {
    e.preventDefault();
    if (!user) { nav('/login'); return; }
    setError(''); setBusy(true);
    try {
      await api('/bookings', { method: 'POST', body: { packageId: pkg!.id, travelDate: date, guests } });
      nav('/bookings');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="grid md:grid-cols-[2fr_1fr] gap-8">
      <div>
        <Link to="/" className="text-lake underline">← All packages</Link>
        <div className="mt-4 h-56 rounded-xl bg-gradient-to-br from-lake to-saffron" />
        <p className="mt-4 text-sm text-slate-500">{pkg.destination} · {pkg.duration_days} days · up to {pkg.max_guests} guests</p>
        <h1 className="text-3xl font-bold">{pkg.title}</h1>
        <p className="mt-4 text-slate-700 whitespace-pre-line">{pkg.description}</p>
        <Reviews packageId={pkg.id} />
      </div>

      <form onSubmit={book} className="bg-white border rounded-xl p-5 h-fit grid gap-4">
        <p className="text-2xl font-bold text-lake">
          ₹{pkg.price_inr.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-500">per person</span>
        </p>
        <label className="grid gap-1 font-semibold">Travel date
          <input type="date" min={tomorrow} value={date} onChange={(e) => setDate(e.target.value)} required
            className="border rounded px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 font-semibold">Guests
          <input type="number" min={1} max={left === null ? pkg.max_guests : Math.max(1, Math.min(pkg.max_guests, left))} value={guests}
            onChange={(e) => {
  const cap = left === null ? pkg.max_guests : Math.max(1, Math.min(pkg.max_guests, left));
  setGuests(Math.max(1, Math.min(cap, Number(e.target.value) || 1)));
}}
            className="border rounded px-3 py-2 font-normal" />
        </label>
        
        {left !== null && (
  <p role="status" className={left === 0 ? 'font-semibold text-red-600' : 'text-slate-600'}>
    {left === 0 ? 'Fully booked on this date' : `${left} seats left on this date`}
  </p>
)}


        <p className="font-semibold">Total: ₹{total.toLocaleString('en-IN')}</p>
        {error && <p role="alert" className="text-red-600">{error}</p>}
        <button disabled={busy || left === 0} className="px-4 py-2 rounded bg-lake text-white font-semibold disabled:opacity-60">
          {busy ? 'Booking…' : user ? 'Book now' : 'Log in to book'}
        </button>
      </form>
    </article>
  );
}