import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { Application, Detail, PaginatedResponse, TransferAssistData, User, CommuterPass, LoginResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface RouteStation {
  id: string;
  name: string;
  area: string;
}

export interface RouteCandidate {
  id: string;
  label: string;
  departurePlace: string;
  arrivalPlace: string;
  viaStations: string[];
  durationMinutes: number;
  fare: number;
  provider: 'mock';
}

export interface PlacePrediction {
  placeId: string;
  description: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
}

export interface CarRouteResult {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  path: Array<{ lat: number; lng: number }>;
  waypoints: Array<{ placeId: string; name: string; lat: number; lng: number }>;
}

export interface StaticMapParams {
  centerLat: number;
  centerLng: number;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: string;
  path?: string;
}

export interface CarRoutePDFData {
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  departurePlace: string;
  arrivalPlace: string;
  waypoints: Array<{ name: string }>;
  mapImageUrl?: string;
}

const axiosClient = axios.create({
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

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers && token) {
            originalRequest.headers.Authorization = `Bearer ${String(token)}`;
          }
          return axiosClient(originalRequest);
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
        return axiosClient(originalRequest);
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

export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    axiosClient.get<T>(url, config).then((response) => response.data),
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosClient.post<T>(url, data, config).then((response) => response.data),
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosClient.put<T>(url, data, config).then((response) => response.data),
  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    axiosClient.patch<T>(url, data, config).then((response) => response.data),
  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    axiosClient.delete<T>(url, config).then((response) => response.data),
};

// Auth API - return data directly since interceptor unwraps response.data
export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  sendMfa: (email: string) =>
    api.post<{ message: string }>('/auth/mfa/send', { email }),
  verifyMfa: (email: string, code: string) =>
    api.post<LoginResponse>('/auth/mfa/verify', { email, code }),
  refresh: (refreshToken: string) =>
    api.post<LoginResponse>('/auth/refresh', { refreshToken }),
  getMe: () =>
    api.get<{ user: User }>('/auth/me'),
  entraLogin: () =>
    api.get<void>('/auth/entra_id'),
};

// Application API
export const applicationApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string; sortBy?: string; sortOrder?: string }) =>
    api.get<PaginatedResponse<Application>>('/applications', { params }),
  get: (id: string) =>
    api.get<Application>(`/applications/${id}`),
  create: (data: { targetUserId: string; title: string }) =>
    api.post<Application>('/applications', data),
  update: (id: string, data: { title?: string }) =>
    api.patch<Application>(`/applications/${id}`, data),
  submit: (id: string) =>
    api.post<Application>(`/applications/${id}/submit`),
  approve: (id: string) =>
    api.post<Application>(`/applications/${id}/approve`),
  reject: (id: string, comment: string) =>
    api.post<Application>(`/applications/${id}/reject`, { comment }),
  transfer: (id: string) =>
    api.post<Application>(`/applications/${id}/transfer`),
  delete: (id: string) =>
    api.delete<void>(`/applications/${id}`),
  getTransferAssist: (id: string) =>
    api.get<TransferAssistData>(`/applications/${id}/transfer-assist`),
};

// Detail API
export const detailApi = {
  list: (applicationId: string) =>
    api.get<Detail[]>(`/details/application/${applicationId}`),
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
  }) => api.post<Detail>(`/details/application/${applicationId}`, data),
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
  }>) => api.patch<Detail>(`/details/${id}`, data),
  delete: (id: string) =>
    api.delete<void>(`/details/${id}`),
  duplicate: (id: string, useDate: string) =>
    api.post<Detail>(`/details/${id}/duplicate`, { useDate }),
  bulkDuplicate: (detailId: string, useDates: string[]) =>
    api.post<Detail[]>('/details/bulk-duplicate', { detailId, useDates }),
  searchHistory: (params: { departurePlace?: string; arrivalPlace?: string; transportType?: string; limit?: number; offset?: number }) =>
    api.get<PaginatedResponse<Detail>>('/details/search/history', { params }),
  reuseRoute: (sourceDetailId: string, newUseDate: string) =>
    api.post<{ application: Application; detail: Detail }>('/details/reuse', { sourceDetailId, newUseDate }),
  calculateCarFare: (departurePlace: string, arrivalPlace: string) =>
    api.post<{ distance: number; fare: number }>('/details/calculate-car-fare', { departurePlace, arrivalPlace }),
};

export const routeSearchApi = {
  searchStations: (query: string) =>
    api.get<{ items: RouteStation[] }>('/details/routes/stations', { params: { query } }),
  searchRoutes: (departurePlace: string, arrivalPlace: string) =>
    api.get<{ provider: 'mock'; items: RouteCandidate[] }>('/details/routes/search', {
      params: { departurePlace, arrivalPlace },
    }),
  searchPlaces: (query: string) =>
    api.get<{ items: PlacePrediction[] }>('/details/places/autocomplete', { params: { query } }),
  calculateCarRoute: (originPlaceId: string, destinationPlaceId: string, waypointPlaceIds?: string[]) =>
    api.post<CarRouteResult>('/details/routes/car', { originPlaceId, destinationPlaceId, waypointPlaceIds }),
  getStaticMap: (params: StaticMapParams) =>
    api.get<{ mapUrl: string }>('/details/routes/car/static-map', { params }),
  generateCarRoutePDF: (data: CarRoutePDFData) =>
    api.post<Blob>('/details/routes/car/pdf', data, { responseType: 'blob' }),
};

// User API
export const userApi = {
  getCommuterPass: () =>
    api.get<CommuterPass | null>('/users/me/commuter-pass'),
  updateCommuterPass: (data: { routeText?: string; teikiProfile: string; expiredAt: string }) =>
    api.put<CommuterPass>('/users/me/commuter-pass', data),
  getUserCommuterPass: (userId: string) =>
    api.get<CommuterPass | null>(`/users/${userId}/commuter-pass`),
  list: (params?: { page?: number; limit?: number; role?: string }) =>
    api.get<PaginatedResponse<User>>('/users', { params }),
};

// File API
export const fileApi = {
  getPresignedUrl: (fileName: string, contentType: string, fileSize: number) =>
    api.post<{ uploadUrl: string; fileKey: string }>('/files/presigned-url', { fileName, contentType, fileSize }),
  getViewUrl: (fileKey: string) =>
    api.get<{ url: string }>(`/files/view/${fileKey}`),
  delete: (fileKey: string) =>
    api.delete<void>(`/files/${fileKey}`),
};

export function uploadToS3(uploadUrl: string, file: File): Promise<void> {
  return axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
  });
}
