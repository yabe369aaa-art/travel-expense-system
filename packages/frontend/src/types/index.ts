export interface User {
  id: string;
  email: string;
  role: 'applicant' | 'coordinator' | 'admin';
  authType: 'local' | 'entra_id';
  entraObjectId?: string;
  createdAt: string;
}

export interface CommuterPass {
  userId: string;
  routeText: string | null;
  teikiProfile: string;
  expiredAt: string;
}

export interface Application {
  id: string;
  applicantId: string;
  targetUserId: string;
  title: string;
  status: 'draft' | 'pending' | 'rejected' | 'approved' | 'transferred';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  applicant?: User;
  targetUser?: User;
  details?: Detail[];
  histories?: History[];
}

export interface Detail {
  id: string;
  applicationId: string;
  transportType: 'train' | 'bus' | 'plane' | 'car';
  useDate: string;
  departurePlace: string;
  arrivalPlace: string;
  reimbursementFare: number;
  routeSerializeData: string | null;
  gpsDistanceKm: number | null;
  receiptFileUrl: string | null;
  purpose: string | null;
  createdAt: string;
}

export interface History {
  id: string;
  applicationId: string;
  operatorId: string;
  action: 'submit' | 'reject' | 'approve' | 'transfer';
  comment: string | null;
  createdAt: string;
  operator?: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TransferAssistData {
  applicationId: string;
  applicantName: string;
  targetUserName: string;
  department: string;
  items: TransferItem[];
}

export interface TransferItem {
  label: string;
  value: string | number;
  copyKey: string;
  order: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  mfaRequired: boolean;
}