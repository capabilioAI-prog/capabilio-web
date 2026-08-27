const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )capabilio-user-id=([^;]+)'));
  return match && match[2] ? decodeURIComponent(match[2]) : null;
}

async function request<T>(path: string, options?: RequestInit): Promise<{ success: true; data: T } | { success: false; error: { message: string } }> {
  try {
    const userId = getUserIdFromCookie();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(options?.headers as Record<string, string> ?? {}),
    };

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    return res.json();
  } catch {
    return { success: false, error: { message: 'Network error' } };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
