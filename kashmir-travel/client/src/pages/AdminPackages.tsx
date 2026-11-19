import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Pkg } from '../api';

type Row = Pkg & { is_active: number };
const empty = { title: '', slug: '', destination: '', description: '', duration_days: 1, price_inr: 1000, max_guests: 10, image_url: '' };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function AdminPackages() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api<Row[]>('/admin/packages').then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  function set<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // While creating, build the slug from the title automatically
      if (key === 'title' && editingId === null) next.slug = slugify(String(value));
      return next;
    });
  }

  function edit(p: Row) {
    setEditingId(p.id);
    setForm({ title: p.title, slug: p.slug, destination: p.destination, description: p.description,
      duration_days: p.duration_days, price_inr: p.price_inr, max_guests: p.max_guests, image_url: p.image_url ?? '' });
    setError(''); setOk('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() { setEditingId(null); setForm(empty); setError(''); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setOk(''); setBusy(true);
    const body = {
      ...form,
      duration_days: Number(form.duration_days),
      price_inr: Number(form.price_inr),
      max_guests: Number(form.max_guests),
      image_url: form.image_url.trim() || undefined,
    };
    try {
      if (editingId === null) await api('/packages', { method: 'POST', body });
      else await api(`/packages/${editingId}`, { method: 'PUT', body });
      setOk(editingId === null ? 'Package created.' : 'Package updated.');
      setEditingId(null); setForm(empty); load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(p: Row) {
    try { await api(`/admin/packages/${p.id}/active`, { method: 'PATCH', body: { active: !p.is_active } }); load(); }
    catch (err) { setError((err as Error).message); }
  }

  const field = 'border rounded px-3 py-2 font-normal';
  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Manage packages</h1>
        <Link to="/admin" className="text-lake underline font-semibold">← Dashboard</Link>
      </div>

      <form onSubmit={submit} className="bg-white border rounded-xl p-5 grid sm:grid-cols-2 gap-4">
        <h2 className="sm:col-span-2 font-bold text-xl">{editingId === null ? 'Add a package' : 'Edit package'}</h2>
        <label className="grid gap-1 font-semibold">Title
          <input className={field} value={form.title} onChange={(e) => set('title', e.target.value)} required minLength={3} />
        </label>
        <label className="grid gap-1 font-semibold">Slug (used in the web address)
          <input className={field} value={form.slug} onChange={(e) => set('slug', e.target.value)} required pattern="[a-z0-9-]+"
            title="Lowercase letters, numbers and hyphens only" />
        </label>
        <label className="grid gap-1 font-semibold">Destination
          <input className={field} value={form.destination} onChange={(e) => set('destination', e.target.value)} required />
        </label>
        <label className="grid gap-1 font-semibold">Image path or URL (optional)
          <input className={field} value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="/images/gulmarg.jpg" />
        </label>
        <label className="grid gap-1 font-semibold sm:col-span-2">Description
          <textarea className={field} rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} required minLength={10} />
        </label>
        <label className="grid gap-1 font-semibold">Duration (days)
          <input className={field} type="number" min={1} max={30} value={form.duration_days} onChange={(e) => set('duration_days', Number(e.target.value))} required />
        </label>
        <label className="grid gap-1 font-semibold">Price per person (₹)
          <input className={field} type="number" min={1} value={form.price_inr} onChange={(e) => set('price_inr', Number(e.target.value))} required />
        </label>
        <label className="grid gap-1 font-semibold">Maximum guests
          <input className={field} type="number" min={1} max={50} value={form.max_guests} onChange={(e) => set('max_guests', Number(e.target.value))} required />
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button disabled={busy} className="px-5 py-2 rounded bg-lake text-white font-semibold disabled:opacity-60">
            {busy ? 'Saving…' : editingId === null ? 'Create package' : 'Save changes'}
          </button>
          {editingId !== null && <button type="button" onClick={cancelEdit} className="font-semibold underline">Cancel edit</button>}
          {error && <p role="alert" className="text-red-600">{error}</p>}
          {ok && <p role="status" className="text-lake font-semibold">{ok}</p>}
        </div>
      </form>

      <div className="bg-white border rounded-xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-3">All packages</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="py-2">Title</th><th>Destination</th><th>Price</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2 font-semibold">{p.title}</td>
                <td>{p.destination}</td>
                <td>₹{p.price_inr.toLocaleString('en-IN')}</td>
                <td>{p.duration_days}</td>
                <td>{p.is_active ? 'Visible' : 'Hidden'}</td>
                <td className="whitespace-nowrap">
                  <button onClick={() => edit(p)} className="text-lake font-semibold underline mr-4">Edit</button>
                  <button onClick={() => toggle(p)} className="font-semibold underline">{p.is_active ? 'Hide' : 'Restore'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}