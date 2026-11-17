import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';

type Stats = {
  monthly: { month: string; bookings: number; revenue: string | number }[];
  topPackages: { title: string; bookings: number }[];
};
type Row = {
  id: number; user_name: string; email: string; title: string; travel_date: string;
  guests: number; total_inr: number; status: 'pending' | 'confirmed' | 'cancelled';
};

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  const load = () =>
    Promise.all([api<Stats>('/admin/stats'), api<Row[]>('/admin/bookings')])
      .then(([s, b]) => { setStats(s); setRows(b); })
      .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function setStatus(id: number, status: string) {
    try { await api(`/admin/bookings/${id}/status`, { method: 'PATCH', body: { status } }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!stats) return <p>Loading…</p>;

  // MySQL sends SUM() as text, so convert it to a number for the chart
  const data = stats.monthly.map((m) => ({ month: m.month, bookings: m.bookings, revenue: Number(m.revenue) }));
  const totalBookings = data.reduce((a, m) => a + m.bookings, 0);
  const totalRevenue = data.reduce((a, m) => a + m.revenue, 0);

  return (
    <section className="grid gap-8">
      <h1 className="text-3xl font-bold">Admin dashboard</h1>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-slate-500">Active bookings</p>
          <p className="text-3xl font-bold text-lake">{totalBookings}</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <p className="text-sm text-slate-500">Revenue (excluding cancelled)</p>
          <p className="text-3xl font-bold text-lake">₹{totalRevenue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-bold mb-3">Bookings per month</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="bookings" fill="#0F766E" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <h2 className="font-bold mb-3">Revenue per month (₹)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" /><YAxis /><Tooltip />
              <Bar dataKey="revenue" fill="#D9930D" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-5">
        <h2 className="font-bold mb-3">Top packages</h2>
        <ol className="list-decimal pl-5">
          {stats.topPackages.map((p) => <li key={p.title}>{p.title}: {p.bookings} bookings</li>)}
        </ol>
      </div>

      <div className="bg-white border rounded-xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-3">All bookings</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b">
            <th className="py-2">Customer</th><th>Package</th><th>Date</th><th>Guests</th><th>Total</th><th>Status</th>
          </tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="py-2">{b.user_name}<br /><span className="text-slate-500">{b.email}</span></td>
                <td>{b.title}</td>
                <td>{String(b.travel_date).slice(0, 10)}</td>
                <td>{b.guests}</td>
                <td>₹{b.total_inr.toLocaleString('en-IN')}</td>
                <td>
                  <select value={b.status} onChange={(e) => setStatus(b.id, e.target.value)}
                    aria-label={`Status for booking ${b.id}`} className="border rounded px-2 py-1">
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="mt-3">No bookings yet.</p>}
      </div>
    </section>
  );
}