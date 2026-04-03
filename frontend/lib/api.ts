const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('eventsync_token') : null);

export const apiFetch = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Request failed.');
  }

  return data as T;
};

export { API_BASE_URL, getToken };
