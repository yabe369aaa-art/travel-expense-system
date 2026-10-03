import { useState } from 'react';
import { Controller, useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { applicationApi, detailApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Copy } from 'lucide-react';
import { RoutePlanner } from '@/components/RoutePlanner';
import { CarRoutePlanner } from '@/components/CarRoutePlanner';

const transportTypes = [
  { value: 'train', label: '電車' },
  { value: 'bus', label: 'バス' },
  { value: 'plane', label: '飛行機' },
  { value: 'car', label: '自家用車' },
] as const;

const detailSchema = z.object({
  transportType: z.enum(['train', 'bus', 'plane', 'car']),
  useDate: z.string().min(1, '日付を選択してください'),
  departurePlace: z.string().min(1, '出発地を入力してください'),
  arrivalPlace: z.string().min(1, '到着地を入力してください'),
  reimbursementFare: z.number().min(0, '金額を入力してください'),
  routeSerializeData: z.string().optional(),
  gpsDistanceKm: z.number().optional(),
  receiptFileUrl: z.string().optional(),
  purpose: z.string().optional(),
  waypoints: z.array(z.object({ placeId: z.string(), name: z.string() })).optional(),
});

const formSchema = z.object({
  targetUserId: z.string().min(1, '支給対象者を選択してください'),
  title: z.string().min(1, 'タイトルを入力してください').max(100),
  details: z.array(detailSchema).min(1, '少なくとも1つの明細を追加してください'),
});

type FormData = z.infer<typeof formSchema>;

const targetUsers = [
  { id: 'applicant1', name: '田中 太郎', email: 'applicant1@travel-expense.local' },
  { id: 'applicant2', name: '佐藤 花子', email: 'applicant2@travel-expense.local' },
];

export function CoordinatorApplicationNew() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetUserId: '',
      title: '',
      details: [{ transportType: 'train', useDate: '', departurePlace: '', arrivalPlace: '', reimbursementFare: 0, waypoints: [] }],
    },
  });

  const { fields, append, remove, move } = useFieldArray({ control, name: 'details' });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const app = await applicationApi.create({
        targetUserId: data.targetUserId,
        title: data.title,
      });

      for (const detail of data.details) {
        await detailApi.create(app.id, detail);
      }

      toast({ title: '代理申請を作成しました', variant: 'success' });
      navigate(`/applications/${app.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '作成に失敗しました';
      toast({ title: 'エラー', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId);
    setValue('targetUserId', userId);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">代理申請作成</h1>
        <p className="text-muted-foreground">担当者を選択し、申請情報と明細を入力してください</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>対象者選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>支給対象者</Label>
              <Select
                value={watch('targetUserId') || selectedUserId}
                onValueChange={handleUserChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="担当者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {targetUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.targetUserId && <p className="text-sm text-destructive">{errors.targetUserId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>申請タイトル</Label>
              <Input placeholder="例: 6月出張費用 (代理申請)" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            {selectedUserId && (
              <div className="p-3 bg-muted rounded-lg border">
                <p className="font-medium">選択中: {targetUsers.find(u => u.id === selectedUserId)?.name}</p>
                <p className="text-sm text-muted-foreground">定期券: 新宿 〜 渋谷 (有効期限: 2026/03/31)</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Copy className="mr-2 h-4 w-4" />定期区間を明細に自動追加
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>交通費明細</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ transportType: 'train', useDate: '', departurePlace: '', arrivalPlace: '', reimbursementFare: 0, waypoints: [] })}>
              <Plus className="mr-2 h-4 w-4" />明細追加
            </Button>
          </CardHeader>
          <CardContent>
            {fields.map((field, index) => (
              <DetailRow key={field.id} index={index} field={field} remove={remove} move={move} fields={fields} control={control} register={register} setValue={setValue} />
            ))}

            {fields.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                明細がありません。「明細追加」ボタンから追加してください。
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <p className="text-lg font-bold">
                合計: <span id="total-amount">0</span> 円
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            キャンセル
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '下書き保存'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DetailRow({
  index,
  field,
  remove,
  move,
  fields,
  control,
  register,
  setValue,
}: {
  index: number;
  field: { id: string };
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  fields: Array<{ id: string }>;
  control: ReturnType<typeof useForm<FormData>>['control'];
  register: ReturnType<typeof useForm<FormData>>['register'];
  setValue: ReturnType<typeof useForm<FormData>>['setValue'];
}) {
  const indexPath = `details.${index}` as const;
  const departurePlace = useWatch({ control, name: `${indexPath}.departurePlace` }) ?? '';
  const arrivalPlace = useWatch({ control, name: `${indexPath}.arrivalPlace` }) ?? '';
  const transportType = useWatch({ control, name: `${indexPath}.transportType` });
  const routeSerializeData = useWatch({ control, name: `${indexPath}.routeSerializeData` });
  const waypoints = useWatch({ control, name: `${indexPath}.waypoints` }) ?? [];
  const gpsDistanceKm = useWatch({ control, name: `${indexPath}.gpsDistanceKm` }) ?? 0;

  const handleWaypointsChange = (newWaypoints: Array<{ placeId: string; name: string }>) => {
    setValue(`${indexPath}.waypoints`, newWaypoints, { shouldDirty: true });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-card">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">明細 #{index + 1}</h4>
        <div className="flex items-center gap-2">
          {index > 0 && <Button type="button" variant="ghost" size="icon" onClick={() => move(index, index - 1)}>↑</Button>}
          {index < fields.length - 1 && <Button type="button" variant="ghost" size="icon" onClick={() => move(index, index + 1)}>↓</Button>}
          {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>交通手段</Label>
          <Controller
            control={control}
            name={`details.${index}.transportType`}
            render={({ field: transportField }) => (
              <Select
                value={transportField.value}
                onValueChange={(value) => {
                  transportField.onChange(value);
                  setValue(`${indexPath}.routeSerializeData`, '');
                  setValue(`${indexPath}.waypoints`, []);
                }}
              >
                <SelectTrigger ref={transportField.ref}>
                  <SelectValue placeholder="選択" />
                </SelectTrigger>
                <SelectContent>
                  {transportTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>利用日</Label>
          <Input type="date" {...register(`details.${index}.useDate`, { valueAsDate: false })} />
        </div>

        {transportType === 'car' ? (
          <CarRoutePlanner
            transportType={transportType}
            departurePlace={departurePlace}
            arrivalPlace={arrivalPlace}
            waypoints={waypoints}
            routeSerializeData={routeSerializeData}
            onDeparturePlaceChange={(value) => setValue(`${indexPath}.departurePlace`, value, { shouldDirty: true, shouldValidate: true })}
            onArrivalPlaceChange={(value) => setValue(`${indexPath}.arrivalPlace`, value, { shouldDirty: true, shouldValidate: true })}
            onWaypointsChange={handleWaypointsChange}
            onRouteSerializeDataChange={(value) => setValue(`${indexPath}.routeSerializeData`, value, { shouldDirty: true })}
            onFareChange={(value) => setValue(`${indexPath}.reimbursementFare`, value, { shouldDirty: true, shouldValidate: true })}
            onDistanceChange={(value) => setValue(`${indexPath}.gpsDistanceKm`, value, { shouldDirty: true })}
          />
        ) : (
          <RoutePlanner
            transportType={transportType}
            departurePlace={departurePlace}
            arrivalPlace={arrivalPlace}
            routeSerializeData={routeSerializeData}
            onDeparturePlaceChange={(value) => setValue(`${indexPath}.departurePlace`, value, { shouldDirty: true, shouldValidate: true })}
            onArrivalPlaceChange={(value) => setValue(`${indexPath}.arrivalPlace`, value, { shouldDirty: true, shouldValidate: true })}
            onRouteSerializeDataChange={(value) => setValue(`${indexPath}.routeSerializeData`, value, { shouldDirty: true })}
            onFareChange={(value) => setValue(`${indexPath}.reimbursementFare`, value, { shouldDirty: true, shouldValidate: true })}
          />
        )}

        <div className="space-y-2">
          <Label>支給金額 (円)</Label>
          <Input type="number" min="0" step="1" {...register(`details.${index}.reimbursementFare`, { valueAsNumber: true })} />
        </div>

        {transportType === 'car' && gpsDistanceKm > 0 && (
          <div className="space-y-2 sm:col-span-2">
            <Label>走行距離 (km)</Label>
            <Input type="number" min="0" step="0.01" value={gpsDistanceKm} readOnly className="bg-muted" />
            <p className="text-xs text-muted-foreground">Google Maps APIで自動計算された距離です</p>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label>訪問目的・備考</Label>
          <Input placeholder="例: 客先訪問" {...register(`details.${index}.purpose`)} />
        </div>
      </div>
    </div>
  );
}