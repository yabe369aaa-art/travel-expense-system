import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, FileText, MapPin, CheckCircle, XCircle, Clock, Loader2, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDateShort, formatDateTime, getStatusLabel, getStatusColor, getTransportLabel, getTransportIcon } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Application, Detail, History } from '@/types';
import { useState } from 'react';

export function AdminApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.get(id!),
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: () => applicationApi.approve(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({ title: '承認しました', variant: 'success' });
    },
    onError: (error: Error) => toast({ title: 'エラー', description: error.message, variant: 'destructive' }),
  });

  const rejectMutation = useMutation({
    mutationFn: (comment: string) => applicationApi.reject(id!, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast({ title: '差し戻しました', variant: 'success' });
    },
    onError: (error: Error) => toast({ title: 'エラー', description: error.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!application) {
    return <div className="text-center py-8">申請が見つかりません</div>;
  }

  const app = application as Application;
  const isPending = app.status === 'pending';
  const [rejectComment, setRejectComment] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  const handleReject = () => {
    if (!rejectComment.trim()) return;
    rejectMutation.mutate(rejectComment);
    setRejectOpen(false);
    setRejectComment('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/pending"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />一覧に戻る</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">{app.title}</h1>
          <p className="text-muted-foreground">申請内容確認・承認/差し戻し</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className={cn('text-lg px-3 py-1', getStatusColor(app.status))}>
            {getStatusLabel(app.status)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>明細一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {app.details && app.details.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>日付</TableHead>
                        <TableHead>交通手段</TableHead>
                        <TableHead>区間</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>目的</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {app.details.map((detail: Detail) => (
                        <TableRow key={detail.id}>
                          <TableCell>{formatDateShort(detail.useDate)}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <span>{getTransportIcon(detail.transportType)}</span>
                              {getTransportLabel(detail.transportType)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <MapPin className="inline h-3 w-3 text-muted-foreground" />
                              <span className="ml-1">{detail.departurePlace} → {detail.arrivalPlace}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(detail.reimbursementFare)}</TableCell>
                          <TableCell className="text-muted-foreground">{detail.purpose || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">明細がありません</p>
              )}
              <div className="mt-4 flex justify-end">
                <p className="text-lg font-bold">合計: {formatCurrency(app.totalAmount)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {app.histories && app.histories.length > 0 ? (
                <div className="space-y-4">
                  {app.histories.map((history: History) => (
                    <HistoryItem key={history.id} history={history} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">履歴がありません</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="申請者" value={app.applicant?.email || '-'} />
              <InfoRow label="支給対象者" value={app.targetUser?.email || '-'} />
              <InfoRow label="作成日時" value={formatDateTime(app.createdAt)} />
              <InfoRow label="更新日時" value={formatDateTime(app.updatedAt)} />
            </CardContent>
          </Card>

          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle>アクション</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full" disabled={rejectMutation.isPending}>
                      <XCircle className="mr-2 h-4 w-4" />
                      {rejectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '差し戻し'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>申請を差し戻す</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="差し戻し理由を入力してください（必須）"
                        value={rejectComment}
                        onChange={(e) => setRejectComment(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRejectOpen(false)}>キャンセル</Button>
                      <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectComment.trim()}>
                        {rejectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '差し戻し実行'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button
                  className="w-full"
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '承認'}
                </Button>
              </CardContent>
            </Card>
          )}

          {app.status === 'approved' && (
            <Card>
              <CardContent className="space-y-2">
                <Link to={`/admin/applications/${app.id}/transfer`}>
                  <Button className="w-full"><ArrowRight className="mr-2 h-4 w-4" />転記アシスト画面へ</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function HistoryItem({ history }: { history: History }) {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    submit: Clock,
    approve: CheckCircle,
    reject: XCircle,
    transfer: FileText,
  };
  const Icon = icons[history.action] || Clock;
  const colors: Record<string, string> = {
    submit: 'text-blue-600 bg-blue-100',
    approve: 'text-green-600 bg-green-100',
    reject: 'text-red-600 bg-red-100',
    transfer: 'text-purple-600 bg-purple-100',
  };

  const actionLabels: Record<string, string> = {
    submit: '申請提出',
    approve: '承認',
    reject: '差し戻し',
    transfer: '転記完了',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={cn('p-2 rounded-full', colors[history.action] || 'text-gray-600 bg-gray-100')}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{actionLabels[history.action] || history.action}</p>
        <p className="text-sm text-muted-foreground">
          {history.operator?.email || '不明'} • {formatDateTime(history.createdAt)}
        </p>
        {history.comment && (
          <p className="mt-1 text-sm text-muted-foreground italic">「{history.comment}」</p>
        )}
      </div>
    </div>
  );
}