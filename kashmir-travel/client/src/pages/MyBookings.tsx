import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Booking } from '../api';

declare global { interface Window { Razorpay: any } }

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function MyBookings() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => api<Booking[]>('/bookings/mine').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    if (!confirm('Cancel this booking?')) return;
    setError('');
    try { await api(`/bookings/${id}/cancel`, { method: 'PATCH' }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  async function pay(b: Booking) {
    setError(''); setNotice('');
    try {
      if (!(await loadRazorpay())) throw new Error('Could not load the payment window. Check your internet.');
      const o = await api<{ orderId: string; amount: number; keyId: string }>('/payments/order', { method: 'POST', body: { bookingId: b.id } });
      const rzp = new window.Razorpay({
        key: o.keyId, amount: o.amount, currency: 'INR', name: 'Kashmir Travel', description: b.title, order_id: o.orderId,
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try { await api('/payments/verify', { method: 'POST', body: resp }); setNotice('Payment received. Your booking is confirmed.'); load(); }
          catch (e) { setError((e as Error).message); }
        },
        theme: { color: '#0F766E' },
      });
      rzp.open();
    } catch (e) { setError((e as Error).message); }
  }

  if (!items) return error ? <p className="text-red-600">{error}</p> : <p>Loading…</p>;
  return (
    <section>
      <h1 className="text-3xl font-bold">My bookings</h1>
      {error && <p role="alert" className="mt-3 text-red-600">{error}</p>}
      {notice && <p role="status" className="mt-3 font-semibold text-lake">{notice}</p>}
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
              {b.status === 'pending' && (
                <button onClick={() => pay(b)} className="px-3 py-1 rounded bg-lake text-white font-semibold">Pay now</button>
              )}
              {b.status === 'confirmed' && (
                <Link to={`/packages/${b.slug}`} className="text-lake font-semibold underline">Review this trip</Link>
              )}
              {b.status !== 'cancelled' && (
                <button onClick={() => cancel(b.id)} className="text-red-600 font-semibold">Cancel</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}