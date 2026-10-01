import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search } from 'lucide-react';
import { formatCurrency, formatDateShort, getStatusLabel, getStatusColor } from '@/lib/utils';
import type { Application } from '@/types';

const statusOptions = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'pending', label: '申請中' },
  { value: 'rejected', label: '差し戻し' },
  { value: 'approved', label: '認定保存' },
  { value: 'transferred', label: '転記完了' },
];

export function ApplicantApplicationList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'my', { page, limit, status, search }],
    queryFn: () => applicationApi.list({ page, limit, status: status || undefined, search: search || undefined, sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">申請一覧</h1>
          <p className="text-muted-foreground">作成した申請の一覧を表示・検索できます</p>
        </div>
        <Link to="/applications/new">
          <Button><FileText className="mr-2 h-4 w-4" />新規申請</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="タイトルで検索..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </form>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : data?.items.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-muted-foreground">申請が見つかりません</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>合計金額</TableHead>
                      <TableHead>作成日</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.items.map((app: Application) => (
                      <TableRow key={app.id}>
                        <TableCell>
                          <Link to={`/applications/${app.id}`} className="font-medium hover:underline">
                            {app.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(app.status)}>{getStatusLabel(app.status)}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(app.totalAmount)}</TableCell>
                        <TableCell>{formatDateShort(app.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Link to={`/applications/${app.id}`}>
                            <Button variant="ghost" size="sm">詳細</Button>
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