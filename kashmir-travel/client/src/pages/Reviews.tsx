import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

type Data = {
  average: number; count: number;
  reviews: { id: number; rating: number; comment: string | null; name: string; created_at: string }[];
};

export default function Reviews({ packageId }: { packageId: number }) {
  const { user } = useAuth();
  const [data, setData] = useState<Data | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => api<Data>(`/reviews/package/${packageId}`).then(setData).catch(() => {});
  useEffect(() => { load(); }, [packageId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api('/reviews', { method: 'POST', body: { packageId, rating, comment } });
      setComment(''); setMsg('Thanks, your review is saved.'); load();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold">Reviews</h2>
      {data && data.count > 0 ? (
        <p className="mt-1 font-semibold">★ {data.average} <span className="font-normal text-slate-500">({data.count} reviews)</span></p>
      ) : (
        <p className="mt-1 text-slate-500">No reviews yet.</p>
      )}

      <ul className="mt-4 grid gap-3">
        {data?.reviews.map((r) => (
          <li key={r.id} className="bg-white border rounded-xl p-4">
            <p className="font-semibold">{r.name} <span className="text-saffron">{'★'.repeat(r.rating)}</span></p>
            {r.comment && <p className="text-slate-700">{r.comment}</p>}
          </li>
        ))}
      </ul>

      {user && (
        <form onSubmit={submit} className="mt-6 bg-white border rounded-xl p-4 grid gap-3 max-w-md">
          <h3 className="font-bold">Write a review</h3>
          <label className="grid gap-1 font-semibold">Rating
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border rounded px-3 py-2 font-normal">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}
            </select>
          </label>
          <label className="grid gap-1 font-semibold">Comment (optional)
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={3}
              className="border rounded px-3 py-2 font-normal" />
          </label>
          {msg && <p role="status" className="font-semibold text-lake">{msg}</p>}
          <button className="px-4 py-2 rounded bg-lake text-white font-semibold justify-self-start">Submit review</button>
        </form>
      )}
    </section>
  );
}