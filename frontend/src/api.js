const API_BASE_URL = 'http://localhost:8080/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const result = await response.json();
    if (!response.ok || result.success === false) {
      throw new Error(result.message || `Request failed with status ${response.status}`);
    }
    return result.data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Buildings
  getBuildings: () => request('/buildings'),
  createBuilding: (data) =>
    request('/buildings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBuilding: (id) =>
    request(`/buildings/${id}`, {
      method: 'DELETE',
    }),

  // Rooms
  getRooms: (buildingId) =>
    request(`/rooms${buildingId ? `?building_id=${buildingId}` : ''}`),
  createRoom: (data) =>
    request('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateRoomPricing: (id, monthlyRent, electricityPerUnit) =>
    request(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        monthly_rent: monthlyRent,
        electricity_per_unit: electricityPerUnit,
      }),
    }),
  deleteRoom: (id) =>
    request(`/rooms/${id}`, {
      method: 'DELETE',
    }),

  // Tenants
  getTenants: () => request('/tenants'),
  createTenant: (data) =>
    request('/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTenant: (id, data) =>
    request(`/tenants/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTenant: (id) =>
    request(`/tenants/${id}`, {
      method: 'DELETE',
    }),

  // Payments
  getPayments: (tenantId, month) => {
    const params = new URLSearchParams();
    if (tenantId) params.append('tenant_id', tenantId);
    if (month) params.append('month', month);
    const qs = params.toString();
    return request(`/payments${qs ? `?${qs}` : ''}`);
  },
  getPaymentHelperInfo: (tenantId, month) =>
    request(`/payments/helper-info?tenant_id=${tenantId}&month=${month}`),
  recordPayment: (data) =>
    request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deletePayment: (id) =>
    request(`/payments/${id}`, {
      method: 'DELETE',
    }),
};
