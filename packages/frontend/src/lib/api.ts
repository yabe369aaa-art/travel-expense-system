import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { Application, Detail, PaginatedResponse, TransferAssistData, User, CommuterPass, LoginResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers && token) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.tokens;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Auth API - return data directly since interceptor unwraps response.data
export const authApi = {
  login: (email: string, password: string) => 
    api.post<LoginResponse>('/auth/login', { email, password }).then(r => r.data),
  sendMfa: (email: string) => 
    api.post<{ message: string }>('/auth/mfa/send', { email }).then(r => r.data),
  verifyMfa: (email: string, code: string) => 
    api.post<LoginResponse>('/auth/mfa/verify', { email, code }).then(r => r.data),
  refresh: (refreshToken: string) => 
    api.post<LoginResponse>('/auth/refresh', { refreshToken }).then(r => r.data),
  getMe: () => 
    api.get<{ user: User }>('/auth/me').then(r => r.data),
  entraLogin: () => 
    api.get<void>('/auth/entra_id').then(r => r.data),
};

// Application API
export const applicationApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string; sortBy?: string; sortOrder?: string }) =>
    api.get<PaginatedResponse<Application>>('/applications', { params }).then(r => r.data),
  get: (id: string) =>
    api.get<Application>(`/applications/${id}`).then(r => r.data),
  create: (data: { targetUserId: string; title: string }) =>
    api.post<Application>('/applications', data).then(r => r.data),
  update: (id: string, data: { title?: string }) =>
    api.patch<Application>(`/applications/${id}`, data).then(r => r.data),
  submit: (id: string) =>
    api.post<Application>(`/applications/${id}/submit`).then(r => r.data),
  approve: (id: string) =>
    api.post<Application>(`/applications/${id}/approve`).then(r => r.data),
  reject: (id: string, comment: string) =>
    api.post<Application>(`/applications/${id}/reject`, { comment }).then(r => r.data),
  transfer: (id: string) =>
    api.post<Application>(`/applications/${id}/transfer`).then(r => r.data),
  delete: (id: string) =>
    api.delete<void>(`/applications/${id}`).then(r => r.data),
  getTransferAssist: (id: string) =>
    api.get<TransferAssistData>(`/applications/${id}/transfer-assist`).then(r => r.data),
};

// Detail API
export const detailApi = {
  list: (applicationId: string) =>
    api.get<Detail[]>(`/details/application/${applicationId}`).then(r => r.data),
  create: (applicationId: string, data: {
    transportType: string;
    useDate: string;
    departurePlace: string;
    arrivalPlace: string;
    reimbursementFare: number;
    routeSerializeData?: string;
    gpsDistanceKm?: number;
    receiptFileUrl?: string;
    purpose?: string;
  }) => api.post<Detail>(`/details/application/${applicationId}`, data).then(r => r.data),
  update: (id: string, data: Partial<{
    transportType: string;
    useDate: string;
    departurePlace: string;
    arrivalPlace: string;
    reimbursementFare: number;
    routeSerializeData: string | null;
    gpsDistanceKm: number | null;
    receiptFileUrl: string | null;
    purpose: string | null;
  }>) => api.patch<Detail>(`/details/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete<void>(`/details/${id}`).then(r => r.data),
  duplicate: (id: string, useDate: string) =>
    api.post<Detail>(`/details/${id}/duplicate`, { useDate }).then(r => r.data),
  bulkDuplicate: (detailId: string, useDates: string[]) =>
    api.post<Detail[]>('/details/bulk-duplicate', { detailId, useDates }).then(r => r.data),
  searchHistory: (params: { departurePlace?: string; arrivalPlace?: string; transportType?: string; limit?: number; offset?: number }) =>
    api.get<PaginatedResponse<Detail>>('/details/search/history', { params }).then(r => r.data),
  reuseRoute: (sourceDetailId: string, newUseDate: string) =>
    api.post<{ application: Application; detail: Detail }>('/details/reuse', { sourceDetailId, newUseDate }).then(r => r.data),
  calculateCarFare: (departurePlace: string, arrivalPlace: string) =>
    api.post<{ distance: number; fare: number }>('/details/calculate-car-fare', { departurePlace, arrivalPlace }).then(r => r.data),
};

// User API
export const userApi = {
  getCommuterPass: () =>
    api.get<CommuterPass | null>('/users/me/commuter-pass').then(r => r.data),
  updateCommuterPass: (data: { routeText?: string; teikiProfile: string; expiredAt: string }) =>
    api.put<CommuterPass>('/users/me/commuter-pass', data).then(r => r.data),
  getUserCommuterPass: (userId: string) =>
    api.get<CommuterPass | null>(`/users/${userId}/commuter-pass`).then(r => r.data),
  list: (params?: { page?: number; limit?: number; role?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }).then(r => r.data),
};

// File API
export const fileApi = {
  getPresignedUrl: (fileName: string, contentType: string, fileSize: number) =>
    api.post<{ uploadUrl: string; fileKey: string }>('/files/presigned-url', { fileName, contentType, fileSize }).then(r => r.data),
  getViewUrl: (fileKey: string) =>
    api.get<{ url: string }>(`/files/view/${fileKey}`).then(r => r.data),
  delete: (fileKey: string) =>
    api.delete<void>(`/files/${fileKey}`).then(r => r.data),
};

export function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  return axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
  });
}