import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDateShort, getStatusLabel, getStatusColor } from '@/lib/utils';
import type { Application } from '@/types';

export function ApplicantDashboard() {
  const { data: applications } = useQuery({
    queryKey: ['applications', 'my', { limit: 5 }],
    queryFn: () => applicationApi.list({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
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
          <h1 className="text-3xl font-bold">ダッシュボード</h1>
          <p className="text-muted-foreground">申請状況の概要とクイックアクション</p>
        </div>
        <Link to="/applications/new">
          <Button><Plus className="mr-2 h-4 w-4" />新規申請</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="下書き" count={stats.draft || 0} icon={FileText} color="bg-gray-100 text-gray-600" />
        <StatCard title="申請中" count={stats.pending || 0} icon={Clock} color="bg-blue-100 text-blue-600" />
        <StatCard title="認定保存" count={stats.approved || 0} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <StatCard title="差し戻し" count={stats.rejected || 0} icon={AlertCircle} color="bg-red-100 text-red-600" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>最近の申請</CardTitle>
          <Link to="/applications" className="text-sm text-primary hover:underline">
            すべて見る <ArrowRight className="ml-1 h-4 w-4 inline" />
          </Link>
        </CardHeader>
        <CardContent>
          {applications?.items.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">申請がありません</p>
              <Link to="/applications/new" className="mt-4 inline-block">
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" />初めての申請を作成</Button>
              </Link>
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
    <Link to={`/applications/${app.id}`} className="flex items-center justify-between p-4 hover:bg-accent rounded-lg transition-colors">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{app.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatDateShort(app.createdAt)} 作成 • 合計 {formatCurrency(app.totalAmount)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge className={getStatusColor(app.status)}>{getStatusLabel(app.status)}</Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  );
}

import { cn } from '@/lib/utils';