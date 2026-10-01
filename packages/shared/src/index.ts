export type Role = 'applicant' | 'coordinator' | 'admin';
export type AuthType = 'local' | 'entra_id';
export type ApplicationStatus = 'draft' | 'pending' | 'rejected' | 'approved' | 'transferred';
export type TransportType = 'train' | 'bus' | 'plane' | 'car';
export type Action = 'submit' | 'reject' | 'approve' | 'transfer';

export interface User {
  id: string;
  email: string;
  role: Role;
  authType: AuthType;
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
  status: ApplicationStatus;
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
  transportType: TransportType;
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
  action: Action;
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

export const ROLE_LABELS: Record<Role, string> = {
  applicant: '申請者',
  coordinator: 'コーディネータ',
  admin: '事務局',
};

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: '下書き',
  pending: '申請中',
  rejected: '差し戻し',
  approved: '認定保存',
  transferred: '転記完了',
};

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  train: '電車',
  bus: 'バス',
  plane: '飛行機',
  car: '自家用車',
};

export const ACTION_LABELS: Record<Action, string> = {
  submit: '申請提出',
  reject: '差し戻し',
  approve: '承認',
  transfer: '転記完了',
};

export const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['pending'],
  pending: ['approved', 'rejected'],
  rejected: ['pending'],
  approved: ['transferred'],
  transferred: [],
};

export function canTransition(current: ApplicationStatus, next: ApplicationStatus, role: Role): boolean {
  if (!VALID_TRANSITIONS[current]?.includes(next)) return false;

  const permissions = {
    admin: { canApprove: true, canTransfer: true, canReject: true },
    coordinator: { canApprove: false, canTransfer: false, canReject: false },
    applicant: { canApprove: false, canTransfer: false, canReject: false },
  };

  const perm = permissions[role];
  if (next === 'approved' && !perm.canApprove) return false;
  if (next === 'transferred' && !perm.canTransfer) return false;
  if (next === 'rejected' && !perm.canReject) return false;

  return true;
}