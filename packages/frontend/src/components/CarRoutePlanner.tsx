import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  routeSearchApi,
  type PlacePrediction,
  type CarRouteResult,
  type StaticMapParams,
  type CarRoutePDFData,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, MapPin, Trash2, Plus, Download, Map } from 'lucide-react';

interface Waypoint {
  placeId: string;
  name: string;
}

interface CarRoutePlannerProps {
  transportType: string;
  departurePlace: string;
  arrivalPlace: string;
  waypoints: Waypoint[];
  routeSerializeData?: string;
  onDeparturePlaceChange: (value: string) => void;
  onArrivalPlaceChange: (value: string) => void;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  onRouteSerializeDataChange: (value: string) => void;
  onFareChange: (value: number) => void;
  onDistanceChange: (value: number) => void;
}

function parseSelectedRoute(serialized?: string): CarRouteResult | null {
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as CarRouteResult;
  } catch {
    return null;
  }
}

function PlaceAutocompleteInput({
  label,
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (prediction: PlacePrediction) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [debouncedValue, setDebouncedValue] = useState(value);

  // デバウンス: 入力停止から300ms後に検索クエリを更新
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [debouncedValue, isOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ['places-autocomplete', debouncedValue],
    queryFn: () => routeSearchApi.searchPlaces(debouncedValue),
    enabled: isOpen && debouncedValue.trim().length > 0,
    staleTime: 60_000,
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || !data?.items.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, data.items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      const prediction = data.items[selectedIndex];
      onChange(prediction.description);
      onSelect?.(prediction);
      setIsOpen(false);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-10"
          role="combobox"
          aria-expanded={isOpen && Boolean(data?.items.length)}
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `place-option-${selectedIndex}` : undefined}
        />
      </div>
      {isOpen && debouncedValue.trim().length > 0 && (
        <div className="absolute z-20 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md max-h-60 overflow-auto">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">場所を検索中...</p>
          ) : data === undefined ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">場所を取得できませんでした。</p>
          ) : data?.items.length ? (
            <ul role="listbox" className="max-h-48 overflow-auto">
              {data.items.map((prediction: PlacePrediction, index) => (
                <li key={prediction.placeId}>
                  <button
                    type="button"
                    id={`place-option-${index}`}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={`w-full rounded-sm px-3 py-2 text-left text-sm ${index === selectedIndex ? 'bg-accent' : 'hover:bg-accent'}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(prediction.description);
                      onSelect?.(prediction);
                      setIsOpen(false);
                    }}
                  >
                    <span className="font-medium">{prediction.structuredFormatting.mainText}</span>
                    {prediction.structuredFormatting.secondaryText && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        {prediction.structuredFormatting.secondaryText}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">候補がありません。別のキーワードで検索してください。</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CarRoutePlanner({
  transportType,
  departurePlace,
  arrivalPlace,
  waypoints,
  routeSerializeData,
  onDeparturePlaceChange,
  onArrivalPlaceChange,
  onWaypointsChange,
  onRouteSerializeDataChange,
  onFareChange,
  onDistanceChange,
}: CarRoutePlannerProps) {
  const [routeResult, setRouteResult] = useState<CarRouteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState('');
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const selectedRoute = parseSelectedRoute(routeSerializeData);

  useEffect(() => {
    if (selectedRoute) {
      setRouteResult(selectedRoute);
      generateStaticMap(selectedRoute);
    }
  }, [selectedRoute]);

  const generateStaticMap = useCallback(async (route: CarRouteResult) => {
    setIsGeneratingMap(true);
    try {
      const markers: StaticMapParams['markers'] = JSON.stringify(
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
      setMapUrl(result.mapUrl);
    } catch (err) {
      console.error('Static map generation failed:', err);
    } finally {
      setIsGeneratingMap(false);
    }
  }, []);

  const handleCalculateRoute = async () => {
    if (!departurePlace.trim() || !arrivalPlace.trim()) {
      setError('出発地と目的地を入力してください');
      return;
    }

    const originPrediction = await routeSearchApi.searchPlaces(departurePlace);
    const destPrediction = await routeSearchApi.searchPlaces(arrivalPlace);

    if (!originPrediction.items.length || !destPrediction.items.length) {
      setError('出発地または目的地が見つかりません');
      return;
    }

    const originPlaceId = originPrediction.items[0].placeId;
    const destinationPlaceId = destPrediction.items[0].placeId;
    const waypointPlaceIds = waypoints.map((wp) => wp.placeId).filter(Boolean);

    setIsCalculating(true);
    setError('');

    try {
      const result = await routeSearchApi.calculateCarRoute(
        originPlaceId,
        destinationPlaceId,
        waypointPlaceIds
      );
      setRouteResult(result);
      setMapUrl(null);
      await generateStaticMap(result);

      const serialized = JSON.stringify(result);
      onRouteSerializeDataChange(serialized);
      onFareChange(result.fare);
      onDistanceChange(result.distanceKm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ルート計算に失敗しました');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!routeResult) return;

    setIsGeneratingPDF(true);
    try {
      const pdfData: CarRoutePDFData = {
        distanceKm: routeResult.distanceKm,
        durationMinutes: routeResult.durationMinutes,
        fare: routeResult.fare,
        departurePlace,
        arrivalPlace,
        waypoints: routeResult.waypoints.map((wp) => ({ name: wp.name })),
        mapImageUrl: mapUrl || undefined,
      };

      const blob = await routeSearchApi.generateCarRoutePDF(pdfData);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `走行距離証明書_${departurePlace}_${arrivalPlace}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF生成に失敗しました');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleWaypointSelect = (index: number) => (prediction: PlacePrediction) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = { placeId: prediction.placeId, name: prediction.description };
    onWaypointsChange(newWaypoints);
  };

  const addWaypoint = () => {
    onWaypointsChange([...waypoints, { placeId: '', name: '' }]);
  };

  const removeWaypoint = (index: number) => {
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onWaypointsChange(newWaypoints);
  };

  if (transportType !== 'car') {
    return (
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>出発地</Label>
          <Input value={departurePlace} placeholder="例: 東京駅" onChange={(event) => onDeparturePlaceChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>目的地</Label>
          <Input value={arrivalPlace} placeholder="例: 大阪駅" onChange={(event) => onArrivalPlaceChange(event.target.value)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceAutocompleteInput
          label="出発地"
          value={departurePlace}
          onChange={onDeparturePlaceChange}
          placeholder="例: 東京駅"
        />
        <PlaceAutocompleteInput
          label="目的地"
          value={arrivalPlace}
          onChange={onArrivalPlaceChange}
          placeholder="例: 大阪駅"
        />
      </div>

      <div className="space-y-2">
        {waypoints.map((waypoint, index) => (
          <div key={index} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <PlaceAutocompleteInput
                label={`経由地 ${index + 1}`}
                value={waypoint.name}
                onChange={(value) => {
                  const newWaypoints = [...waypoints];
                  newWaypoints[index] = { ...waypoint, name: value };
                  onWaypointsChange(newWaypoints);
                }}
                onSelect={handleWaypointSelect(index)}
                placeholder={`経由地 ${index + 1} を入力`}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`経由地 ${index + 1} を削除`}
              onClick={() => removeWaypoint(index)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addWaypoint} className="w-fit">
          <Plus className="mr-1 h-4 w-4" />経由地を追加
        </Button>
      </div>

      <Button
        type="button"
        onClick={handleCalculateRoute}
        disabled={isCalculating || !departurePlace.trim() || !arrivalPlace.trim()}
        className="w-full sm:w-auto"
      >
        {isCalculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            計算中...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            距離・経路を計算
          </>
        )}
      </Button>

      {error && <p role="status" className="text-sm text-destructive">{error}</p>}

      {routeResult && (
        <div className="space-y-4 rounded-md border bg-muted/40 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">走行距離</p>
              <p className="text-2xl font-bold">{routeResult.distanceKm.toFixed(2)} km</p>
            </div>
            <div className="rounded-lg bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">所要時間</p>
              <p className="text-2xl font-bold">{routeResult.durationMinutes} 分</p>
            </div>
            <div className="rounded-lg bg-background p-4 text-center">
              <p className="text-sm text-muted-foreground">支給額</p>
              <p className="text-2xl font-bold text-primary">
                {routeResult.fare.toLocaleString('ja-JP')} 円
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium">ルート: </p>
            <p className="text-sm text-muted-foreground break-all">
              {routeResult.waypoints.map((wp) => wp.name).join(' → ')}
            </p>
          </div>

          {mapUrl && !isGeneratingMap && (
            <div className="rounded-md border overflow-hidden">
              <img
                src={mapUrl}
                alt="ルート地図"
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {isGeneratingMap && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              地図を生成中...
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  PDF保存
                </>
              )}
            </Button>
            <Button variant="secondary" onClick={() => window.open(mapUrl || '', '_blank')} disabled={!mapUrl}>
              <Map className="mr-2 h-4 w-4" />
              地図を別タブで開く
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            ※ Google Maps APIによる計算結果です。実際の走行距離と異なる場合があります。
          </p>
        </div>
      )}
    </div>
  );
}