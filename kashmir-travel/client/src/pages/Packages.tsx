import { useEffect, useState } from 'react';
import { api, Pkg } from '../api';
import { Link } from 'react-router-dom';

export default function Packages() {
  const [items, setItems] = useState<Pkg[]>([]);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [state, setState] = useState<'loading' | 'error' | 'ok'>('loading');

  useEffect(() => {
    setState('loading');
    // Wait 300ms after typing stops so we don't call the API on every keystroke.
    const t = setTimeout(() => {
      api<Pkg[]>(`/packages?q=${encodeURIComponent(q)}&sort=${sort}`)
        .then((d) => { setItems(d); setState('ok'); })
        .catch(() => setState('error'));
    }, 300);
    return () => clearTimeout(t);
  }, [q, sort]);

  return (
    <section>
      <h1 className="text-3xl font-bold">Explore Kashmir</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search destination or package"
          aria-label="Search packages" className="border rounded px-3 py-2 flex-1 min-w-[200px]" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort packages" className="border rounded px-3 py-2">
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="duration">Shortest trip</option>
        </select>
      </div>

      {state === 'loading' && <p className="mt-6">Loading packages…</p>}
      {state === 'error' && <p className="mt-6 text-red-600">Could not load packages. Is the API running?</p>}
      {state === 'ok' && items.length === 0 && <p className="mt-6">No packages match your search.</p>}

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((p) => (
          <article key={p.id} className="bg-white rounded-xl border overflow-hidden">
            <div className="h-36 bg-gradient-to-br from-lake to-saffron" />
            <div className="p-4">
              <p className="text-sm text-slate-500">{p.destination} · {p.duration_days} days</p>
              <h2 className="font-bold text-lg">{p.title}</h2>
              <p className="mt-2 font-semibold text-lake">₹{p.price_inr.toLocaleString('en-IN')} <span className="text-sm font-normal text-slate-500">per person</span></p>
                <Link to={`/packages/${p.slug}`} className="mt-3 inline-block font-semibold text-lake underline">View details and book</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
