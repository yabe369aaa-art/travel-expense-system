import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, Clock } from 'lucide-react';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import type { Application } from '@/types';

export function AdminPendingList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'admin', 'pending', { page, limit, search }],
    queryFn: () => applicationApi.list({ page, limit, status: 'pending', search: search || undefined, sortBy: 'createdAt', sortOrder: 'asc' }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">確認待ち申請一覧</h1>
          <p className="text-muted-foreground">申請中の案件を確認・承認・差し戻しできます</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800" variant="secondary">
            <Clock className="mr-1 h-3 w-3" /> 申請中のみ表示
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="申請者・タイトルで検索..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">確認待ちの申請はありません</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>申請者</TableHead>
                      <TableHead>支給対象者</TableHead>
                      <TableHead>合計金額</TableHead>
                      <TableHead>申請日</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((app: Application) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Link to={`/admin/applications/${app.id}`} className="font-medium hover:underline">
                            {app.title}
                          </Link>
                        </TableCell>
                        <TableCell>{app.applicant?.email || '-'}</TableCell>
                        <TableCell>{app.targetUser?.email || '-'}</TableCell>
                        <TableCell>{formatCurrency(app.totalAmount)}</TableCell>
                        <TableCell>{formatDateShort(app.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link to={`/admin/applications/${app.id}`}>
                            <Button size="sm">詳細確認</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {data && data.total > limit && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    ページ {page} / {Math.ceil(data.total / limit)} (全 {data.total} 件)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(Math.ceil(data.total / limit), p + 1))}
                    disabled={page >= Math.ceil(data.total / limit)}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}