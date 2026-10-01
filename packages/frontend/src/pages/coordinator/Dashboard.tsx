import { useQuery } from '@tanstack/react-query';
import { applicationApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Clock, CheckCircle, AlertCircle, ArrowRight, Building2 } from 'lucide-react';
import { formatCurrency, formatDateShort, getStatusLabel, getStatusColor } from '@/lib/utils';
import type { Application } from '@/types';

export function CoordinatorDashboard() {
  const { data: applications } = useQuery({
    queryKey: ['applications', 'coordinator', { limit: 10 }],
    queryFn: () => applicationApi.list({ limit: 10, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const stats = applications?.items.reduce(
    (acc: Record<string, number>, app: Application) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">コーディネータ マイページ</h1>
          <p className="text-muted-foreground">担当者の申請状況を管理</p>
        </div>
        <Button asChild>
          <a href="/coordinator/applications/new"><Plus className="mr-2 h-4 w-4" />代理申請作成</a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="下書き" count={stats.draft || 0} icon={FileText} color="bg-gray-100 text-gray-600" />
        <StatCard title="申請中" count={stats.pending || 0} icon={Clock} color="bg-blue-100 text-blue-600" />
        <StatCard title="認定済" count={stats.approved || 0} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <StatCard title="差し戻し" count={stats.rejected || 0} icon={AlertCircle} color="bg-red-100 text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>担当者選択</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="担当者を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applicant1">田中 太郎 (applicant1@travel-expense.local)</SelectItem>
                  <SelectItem value="applicant2">佐藤 花子 (applicant2@travel-expense.local)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">担当者を切り替えると、その人の申請・定期券データが表示されます</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>定期券情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">新宿 〜 渋谷</p>
                <p className="text-sm text-muted-foreground">有効期限: 2026年3月31日まで</p>
              </div>
              <p className="text-sm text-muted-foreground">選択した担当者の定期券が自動適用されます</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>担当者の最近の申請</CardTitle>
          <Link to="/applications" className="text-sm text-primary hover:underline">
            すべて見る <ArrowRight className="ml-1 h-4 w-4 inline" />
          </Link>
        </CardHeader>
        <CardContent>
          {applications?.items.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">申請がありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications?.items.map((app: Application) => (
                <ApplicationRow key={app.id} app={app} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, count, icon: Icon, color }: { title: string; count: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{count}</p>
          </div>
          <div className={cn('p-3 rounded-full', color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationRow({ app }: { app: Application }) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{app.title}</p>
          <p className="text-sm text-muted-foreground">
            対象: {app.targetUser?.email || '-'} • {formatDateShort(app.createdAt)} 作成 • 合計 {formatCurrency(app.totalAmount)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={getStatusColor(app.status)}>{getStatusLabel(app.status)}</Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';