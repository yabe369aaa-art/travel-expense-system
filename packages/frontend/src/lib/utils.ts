import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ja-JP');
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('ja-JP');
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: '下書き',
    pending: '申請中',
    rejected: '差し戻し',
    approved: '認定保存',
    transferred: '転記完了',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    approved: 'bg-green-100 text-green-800',
    transferred: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getTransportLabel(type: string): string {
  const labels: Record<string, string> = {
    train: '電車',
    bus: 'バス',
    plane: '飛行機',
    car: '自家用車',
  };
  return labels[type] || type;
}

export function getTransportIcon(type: string) {
  const icons: Record<string, string> = {
    train: '🚃',
    bus: '🚌',
    plane: '✈️',
    car: '🚗',
  };
  return icons[type] || '📍';
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    applicant: '申請者',
    coordinator: 'コーディネータ',
    admin: '事務局',
  };
  return labels[role] || role;
}