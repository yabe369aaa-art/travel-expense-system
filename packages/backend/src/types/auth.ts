export interface JWTPayload {
  id: string;
  email: string;
  role: 'applicant' | 'coordinator' | 'admin';
  authType: 'local' | 'entra_id';
  entraObjectId?: string;
  iat?: number;
  exp?: number;
  type?: 'access' | 'refresh';
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'applicant' | 'coordinator' | 'admin';
  authType: 'local' | 'entra_id';
  entraObjectId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface MfaSession {
  email: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
}