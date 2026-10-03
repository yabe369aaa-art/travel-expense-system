import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationApi, routeSearchApi, type CarRouteResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, FileText, Calendar, MapPin, AlertCircle, CheckCircle, XCircle, Clock, Loader2, Map } from 'lucide-react';
import { formatCurrency, formatDateShort, formatDateTime, getStatusLabel, getStatusColor, getTransportLabel, getTransportIcon } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Application, Detail, History } from '@/types';
import { useState, useEffect } from 'react';

export function ApplicantApplicationDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!application) {
    return <div className="text-center py-8">申請が見つかりません</div>;
  }

  const app = application as Application;
  const canEdit = app.status === 'draft';
  const isRejected = app.status === 'rejected';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/applications"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />戻る</Button></Link>
        <div>
          <h1 className="text-3xl font-bold">{app.title}</h1>
          <p className="text-muted-foreground">申請詳細・履歴確認</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className={cn('text-lg px-3 py-1', getStatusColor(app.status))}>
            {getStatusLabel(app.status)}
          </Badge>
        </div>
      </div>

      {isRejected && app.histories && app.histories.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <strong>差し戻し理由:</strong> {app.histories.find(h => h.action === 'reject')?.comment || '理由なし'}
          </AlertDescription>
        </Alert>
      )}

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

          {app.details && app.details.some((d: Detail) => d.transportType === 'car' && d.routeSerializeData) && (
            <CarRouteMaps details={app.details.filter((d: Detail) => d.transportType === 'car' && d.routeSerializeData)} />
          )}

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

          {canEdit && (
            <Card>
              <CardContent className="space-y-2">
                <Link to={`/applications/${app.id}`}><Button className="w-full"><FileText className="mr-2 h-4 w-4" />編集</Button></Link>
                {app.status === 'draft' && (
                  <Button variant="destructive" className="w-full"><FileText className="mr-2 h-4 w-4" />削除</Button>
                )}
                {app.status === 'rejected' && (
                  <Link to={`/applications/${app.id}`}><Button variant="outline" className="w-full"><FileText className="mr-2 h-4 w-4" />修正して再申請</Button></Link>
                )}
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

function parseCarRoute(serialized?: string): CarRouteResult | null {
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as CarRouteResult;
  } catch {
    return null;
  }
}

function CarRouteMaps({ details }: { details: Detail[] }) {
  const [mapUrls, setMapUrls] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadMaps = async () => {
      for (const detail of details) {
        if (!detail.routeSerializeData) continue;
        const route = parseCarRoute(detail.routeSerializeData);
        if (!route || route.path.length === 0) continue;

        setLoadingIds(prev => new Set(prev).add(detail.id));
        try {
          const markers = JSON.stringify(
            route.waypoints.map((wp, index) => ({
              lat: wp.lat,
              lng: wp.lng,
              label: String.fromCharCode(65 + index),
              color: index === 0 ? 'green' : index === route.waypoints.length - 1 ? 'red' : 'blue',
            }))
          );
          const path = JSON.stringify(route.path);
          const result = await routeSearchApi.getStaticMap({
            centerLat: route.waypoints[0]?.lat || 0,
            centerLng: route.waypoints[0]?.lng || 0,
            zoom: 12,
            width: 800,
            height: 600,
            markers,
            path,
          });
          setMapUrls(prev => ({ ...prev, [detail.id]: result.mapUrl }));
        } catch {
          setErrorIds(prev => new Set(prev).add(detail.id));
        } finally {
          setLoadingIds(prev => {
            const next = new Set(prev);
            next.delete(detail.id);
            return next;
          });
        }
      }
    };
    loadMaps();
  }, [details]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>自家用車経路地図</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {details.map((detail) => (
            <div key={detail.id} className="space-y-2">
              <p className="font-medium text-sm">
                {formatDateShort(detail.useDate)}: {detail.departurePlace} → {detail.arrivalPlace}
              </p>
              {loadingIds.has(detail.id) && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  地図を生成中...
                </div>
              )}
              {errorIds.has(detail.id) && (
                <div className="rounded-md border bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive">地図の読み込みに失敗しました</p>
                </div>
              )}
              {mapUrls[detail.id] && !loadingIds.has(detail.id) && !errorIds.has(detail.id) && (
                <div className="rounded-md border overflow-hidden">
                  <img
                    src={mapUrls[detail.id]}
                    alt={`ルート地図: ${detail.departurePlace} → ${detail.arrivalPlace}`}
                    className="w-full h-auto max-h-96 object-cover"
                    onError={() => {
                      setErrorIds(prev => new Set(prev).add(detail.id));
                      setMapUrls(prev => {
                        const next = { ...prev };
                        delete next[detail.id];
                        return next;
                      });
                    }}
                  />
                  <div className="p-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(mapUrls[detail.id], '_blank')}
                    >
                      <Map className="mr-2 h-4 w-4" />
                      別タブで開く
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}