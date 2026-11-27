/**
 * API Service Abstraction for RentManager Pro
 *
 * Connected directly to Spring Boot 3 + MySQL 8.0 backend (http://localhost:8080/api).
 * No fake success fallbacks for authentication or data mutations.
 */

import {
  PROTOTYPE_BILL_DRAFT,
  PROTOTYPE_INVOICE,
  PROTOTYPE_PAYMENT,
  PROTOTYPE_HISTORICAL_RECORDS,
  PROTOTYPE_HOME_DASHBOARD,
  PROTOTYPE_ROOMS_INVENTORY,
  PROTOTYPE_ROOM_DETAIL,
  PROTOTYPE_BILLS_DASHBOARD,
} from '../data/prototypeData';
import { INITIAL_TENANTS, INITIAL_LEDGER_SUMMARY } from '../data/mockTenants';

// Dynamic API URL resolver: Supports environment variable, custom localStorage setting, or cloud backend fallback on mobile
export const getApiBaseUrl = () => {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('rm_custom_api_url') : null;
  if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  
  if (typeof window !== 'undefined') {
    const isCapacitor = window.location.protocol === 'capacitor:' || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    if (isCapacitor) {
      return 'https://rentmanager-backend-lw9w.onrender.com/api';
    }
  }
  return '/api';
};

const API_BASE_URL = getApiBaseUrl();

/**
 * Execute fetch request with Authorization header and unified error handling
 */
async function request(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('rm_auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr) {
    const err = new Error('Unable to connect to server. Please try again.');
    err.isNetworkError = true;
    throw err;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      data?.message ||
      (response.status === 409
        ? 'Room already exists in this property.'
        : data?.error || `HTTP ${response.status} from ${endpoint}`);
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Authentication Endpoints (POST /api/auth/...)
 * Strictly backend-only. ZERO mock fallback.
 */
export const authAPI = {
  async login({ identifier, password }) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    if (!res || res.status === 'ERROR') {
      throw new Error(res?.message || 'Invalid mobile/email or password.');
    }

    if (res.token) {
      localStorage.setItem('rm_auth_token', res.token);
    }
    return res;
  },

  async signup({ fullName, mobile, email, password }) {
    const res = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ fullName, mobile, email, password }),
    });

    if (!res || res.status === 'ERROR') {
      throw new Error(res?.message || 'Registration failed.');
    }

    if (res.token) {
      localStorage.setItem('rm_auth_token', res.token);
    }
    return res;
  },

  async requestOtp(mobile) {
    const res = await request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ mobile }),
    });

    if (!res || res.status === 'ERROR') {
      throw new Error(res?.message || 'Failed to send OTP.');
    }
    return res;
  },

  async verifyOtp(mobile, otp) {
    const res = await request('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ mobile, otp }),
    });

    if (!res || res.status === 'ERROR') {
      throw new Error(res?.message || 'OTP verification failed.');
    }

    if (res.token) {
      localStorage.setItem('rm_auth_token', res.token);
    }
    return res;
  },
};

/**
 * Property & Inventory Endpoints (GET / POST / PUT /api/properties/...)
 */
export const propertyAPI = {
  // Mutation: NO fake fallback
  async createProperty(propertyData) {
    return await request('/properties', {
      method: 'POST',
      body: JSON.stringify(propertyData),
    });
  },

  async getSetupStatus() {
    return await request('/properties/setup-status');
  },

  // Mutation: NO fake fallback
  async createRoom(roomData) {
    return await request('/properties/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
  },

  // Mutation: NO fake fallback
  async updateRoom(arg1, arg2, arg3) {
    let roomId, roomData;
    if (arg3 !== undefined) {
      roomId = arg2;
      roomData = arg3;
    } else {
      roomId = arg1;
      roomData = arg2;
    }
    return await request(`/properties/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
  },

  async getProperty(id) {
    return await request(`/properties/${id || 'first'}`);
  },

  async updateProperty(propertyData) {
    return await request('/properties', {
      method: 'PUT',
      body: JSON.stringify(propertyData),
    });
  },

  async getDashboardStats() {
    return await request('/properties/dashboard-stats');
  },

  async getRoomsInventory() {
    return await request('/properties/rooms-inventory');
  },

  async getRoomDetail(roomId = '101') {
    return await request(`/properties/rooms/${roomId}`);
  },

  async saveRoomHistory(roomId, historicalRecords) {
    return await request(`/properties/rooms/${roomId}/history`, {
      method: 'POST',
      body: JSON.stringify({ historicalRecords }),
    });
  },

  async deleteRoom(roomId) {
    return await request(`/properties/rooms/${roomId}`, {
      method: 'DELETE',
    });
  },

  async vacateRoom(roomId) {
    return await request(`/properties/rooms/${roomId}/vacate`, {
      method: 'POST',
    });
  },
};

/**
 * Tenant Endpoints (GET / POST /api/tenants/...)
 */
export const tenantAPI = {
  // Mutation: NO fake fallback
  async create(tenantData) {
    return await request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  },

  async createTenant(tenantData) {
    return await request('/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  },

  async getAll() {
    return await request('/tenants');
  },

  async getTenants() {
    return await request('/tenants');
  },

  async getById(tenantId) {
    return await request(`/tenants/${tenantId}`);
  },

  async getTenantById(tenantId) {
    return await request(`/tenants/${tenantId}`);
  },

  async update(tenantId, tenantData) {
    return await request(`/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
  },

  async updateTenant(tenantId, tenantData) {
    return await request(`/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(tenantData),
    });
  },

  async getLedgerSummary(month = 'OCT') {
    try {
      return await request(`/tenants/ledger-summary?month=${encodeURIComponent(month)}`);
    } catch (err) {
      if (err.status === 401) throw err;
      return INITIAL_LEDGER_SUMMARY;
    }
  },

  async getTenantHistory(tenantId) {
    try {
      return await request(`/tenants/${tenantId}/history`);
    } catch (err) {
      if (err.status === 401) throw err;
      return PROTOTYPE_HISTORICAL_RECORDS;
    }
  },

  async scanDiary(formData) {
    return await request('/tenants/diary/scan', {
      method: 'POST',
      body: formData,
    });
  },

  async vacate(tenantId) {
    return await request(`/tenants/${tenantId}/vacate`, {
      method: 'POST',
    });
  },
};

/**
 * Billing Endpoints (GET / POST /api/bills/...)
 */
export const billingAPI = {
  async generateBill(billPayload) {
    return await request('/bills/generate', {
      method: 'POST',
      body: JSON.stringify(billPayload),
    });
  },

  async getDraftBill(tenantId, month) {
    const q = new URLSearchParams();
    if (tenantId) q.append('tenantId', tenantId);
    if (month) q.append('month', month);
    return await request(`/bills/draft?${q.toString()}`);
  },

  async getInvoice(invoiceNumber) {
    return await request(`/bills/${encodeURIComponent(invoiceNumber)}`);
  },

  async getBillsDashboard() {
    return await request('/bills/dashboard');
  },
};

/**
 * Payment Endpoints (POST /api/payments/...)
 */
export const paymentAPI = {
  async recordPayment(paymentPayload) {
    return await request('/payments/record', {
      method: 'POST',
      body: JSON.stringify(paymentPayload),
    });
  },

  async getReceipt(receiptNumber) {
    return await request(`/payments/${encodeURIComponent(receiptNumber)}`);
  },
};

