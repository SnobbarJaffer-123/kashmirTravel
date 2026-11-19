import { useEffect, useState } from 'react';
import { api, Booking } from '../api';
import { Link } from 'react-router-dom';

export default function MyBookings() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');

  const load = () => api<Booking[]>('/bookings/mine').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    if (!confirm('Cancel this booking?')) return;
    try { await api(`/bookings/${id}/cancel`, { method: 'PATCH' }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!items) return <p>Loading…</p>;
  return (
    <section>
      <h1 className="text-3xl font-bold">My bookings</h1>
      {items.length === 0 && <p className="mt-4">You have no bookings yet.</p>}
      <ul className="mt-4 grid gap-3">
        {items.map((b) => (
          <li key={b.id} className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-2">
            <div>
              <h2 className="font-bold">{b.title}</h2>
              <p className="text-sm text-slate-600">{String(b.travel_date).slice(0, 10)} · {b.guests} guests · ₹{b.total_inr.toLocaleString('en-IN')}</p>
              <p className="text-sm font-semibold capitalize">{b.status}</p>
            </div>
            
            <div className="flex gap-4 items-start">
  {b.status === 'confirmed' && (
    <Link to={`/packages/${b.slug}`} className="text-lake font-semibold underline">Review this trip</Link>
  )}
  {b.status !== 'cancelled' && <button onClick={() => cancel(b.id)} className="text-red-600 font-semibold">Cancel</button>}
</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
