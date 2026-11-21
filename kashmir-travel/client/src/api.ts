export type User = { id: number; name: string; email: string; role: 'user' | 'admin' };
export type Pkg = {
  id: number; title: string; slug: string; destination: string; description: string;
  duration_days: number; price_inr: number; max_guests: number; daily_capacity: number;image_url: string | null;
};
export type Booking = {
  id: number; travel_date: string; guests: number; total_inr: number;
  status: 'pending' | 'confirmed' | 'cancelled'; title: string; slug: string;
};

export function getToken() { return localStorage.getItem('token'); }
export function setToken(t: string | null) { t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); }

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}
