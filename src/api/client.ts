const API_BASE = import.meta.env.VITE_API_URL ?? '';

type ApiResponse<T> = { success: true; data: T } | { success: false; message: string };

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !body.success) {
    throw new Error('message' in body ? body.message : 'Request failed');
  }

  return body.data;
}

export async function login(username: string, password: string): Promise<string> {
  const data = await request<{ token: string }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  return data.token;
}

export function createAdminApi(token: string) {
  return {
    getUsers: () => request<import('../types').AdminUser[]>('/api/admin/users', {}, token),
    getUserActivity: (userId: number) =>
      request<import('../types').UserActivity>(`/api/admin/users/${userId}/activity`, {}, token),
    getGlobalActivity: () =>
      request<import('../types').ActivityPoint[]>('/api/admin/activity', {}, token),
    getActivityInRange: (from: string, to: string) =>
      request<import('../types').ActivityRangeData>(
        `/api/admin/discoveries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        {},
        token,
      ),
    getCustomPois: () =>
      request<import('../types').CustomPoi[]>('/api/admin/custom-pois', {}, token),
    getPendingCustomPois: () =>
      request<import('../types').PendingCustomPoi[]>('/api/admin/custom-pois/pending', {}, token),
    approveCustomPoi: (id: number) =>
      request<{ id: number; approved: boolean }>(
        `/api/admin/custom-pois/${id}/approve`,
        { method: 'POST' },
        token,
      ),
    getNearbyPois: (lat: number, lon: number) =>
      request<import('../types').NearbyPoisResponse>(
        `/api/admin/pois/nearby?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
        {},
        token,
      ),
  };
}
