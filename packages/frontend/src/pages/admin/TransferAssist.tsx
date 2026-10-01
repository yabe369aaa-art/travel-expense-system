import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Copy, Check, ClipboardCheck, Loader2, MapPin, FileText } from 'lucide-react';
import { formatCurrency, formatDateShort, getStatusLabel, getStatusColor, getTransportLabel, getTransportIcon } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import type { Application, TransferAssistData, TransferItem } from '@/types';
import { useState } from 'react';

export function AdminTransferAssist() {
  const { id } = useParams<{ id: string }>();

  const { data: transferData, isLoading } = useQuery({
    queryKey: ['transfer-assist', id],
    queryFn: () => applicationApi.getTransferAssist(id!),
    enabled: !!id,
  });

  const { data: application } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.get(id!),
    enabled: !!id,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'コピーしました', description: label });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!transferData) {
    return <div className="text-center py-8">データが見つかりません</div>;
  }

  const app = application as Application;
  const data = transferData as TransferAssistData;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/admin/applications/${id}`}><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />詳細に戻る</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">転記アシスト: {data.applicantName} の申請</h1>
          <p className="text-muted-foreground">クライアントシステムへの転記作業をサポートします</p>
        </div>
        <div className="ml-auto">
          <Badge className={cn('text-lg px-3 py-1', getStatusColor(app?.status || ''))}>
            {getStatusLabel(app?.status || '')}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>申請サマリー</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoBox label="申請者" value={data.applicantName} icon={<FileText className="h-4 w-4" />} />
          <InfoBox label="支給対象者" value={data.targetUserName} icon={<FileText className="h-4 w-4" />} />
          <InfoBox label="部署" value={data.department || '-'} icon={<FileText className="h-4 w-4" />} />
          <InfoBox label="申請ID" value={data.applicationId.slice(0, 8)} icon={<FileText className="h-4 w-4" />} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>転記データ (クライアントシステム項目順)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            各項目の「コピー」ボタンでワンクリックコピー。クライアントシステムの入力順に並んでいます。
          </p>
          <div className="space-y-3">
            {data.items.sort((a, b) => a.order - b.order).map((item: TransferItem) => (
              <TransferItemRow key={item.copyKey} item={item} onCopy={copyToClipboard} />
            ))}
          </div>
        </CardContent>
      </Card>

      {app?.details && app.details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>明細詳細 (参照用)</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {app.details.map((detail) => (
                    <TableRow key={detail.id}>
                      <TableCell>{formatDateShort(detail.useDate)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          <span>{getTransportIcon(detail.transportType)}</span>
                          {getTransportLabel(detail.transportType)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <MapPin className="inline h-3 w-3 text-muted-foreground" />
                        <span className="ml-1">{detail.departurePlace} → {detail.arrivalPlace}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(detail.reimbursementFare)}</TableCell>
                      <TableCell className="text-muted-foreground">{detail.purpose || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <p className="text-lg font-bold">合計: {formatCurrency(app.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4 pt-4 border-t">
        <Link to={`/admin/applications/${id}`}>
          <Button variant="outline">詳細画面に戻る</Button>
        </Link>
        <Button
          variant="default"
          className="bg-green-600 hover:bg-green-700"
          onClick={() => applicationApi.transfer(id!)}
        >
          <ClipboardCheck className="mr-2 h-4 w-4" />
          転記完了 (ステータスを「転記完了」に変更)
        </Button>
      </div>
    </div>
  );
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium flex items-center gap-2">{icon} {value}</p>
    </div>
  );
}

function TransferItemRow({ item, onCopy }: { item: TransferItem; onCopy: (text: string, label: string) => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy(String(item.value), item.label);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{item.label}</p>
        <p className="font-medium truncate">{item.value}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        disabled={copied}
        className="whitespace-nowrap"
      >
        {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? 'コピー済み' : 'コピー'}
      </Button>
    </div>
  );
}