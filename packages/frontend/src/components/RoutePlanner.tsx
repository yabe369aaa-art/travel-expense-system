import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { routeSearchApi, type RouteCandidate, type RouteStation } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Search, Trash2 } from 'lucide-react';

interface SelectedRoute {
  provider: 'mock';
  routeId: string;
  routeLabel: string;
  viaStations: string[];
}

interface RoutePlannerProps {
  transportType: string;
  departurePlace: string;
  arrivalPlace: string;
  routeSerializeData?: string;
  onDeparturePlaceChange: (value: string) => void;
  onArrivalPlaceChange: (value: string) => void;
  onRouteSerializeDataChange: (value: string) => void;
  onFareChange: (value: number) => void;
}

function parseSelectedRoute(serialized?: string): SelectedRoute | null {
  if (!serialized) return null;
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'provider' in parsed &&
      parsed.provider === 'mock' &&
      'routeId' in parsed &&
      typeof parsed.routeId === 'string' &&
      'routeLabel' in parsed &&
      typeof parsed.routeLabel === 'string' &&
      'viaStations' in parsed &&
      Array.isArray(parsed.viaStations) &&
      parsed.viaStations.every((station) => typeof station === 'string')
    ) {
      return parsed as SelectedRoute;
    }
  } catch {
    return null;
  }
  return null;
}

function StationInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ['route-stations', value],
    queryFn: () => routeSearchApi.searchStations(value),
    enabled: isOpen && value.trim().length > 0,
    staleTime: 60_000,
  });

  return (
    <div className="relative space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        autoComplete="off"
        placeholder={`${label}を入力`}
        onFocus={() => setIsOpen(true)}
        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        role="combobox"
        aria-expanded={isOpen && Boolean(data?.items.length)}
        aria-autocomplete="list"
      />
      {isOpen && value.trim().length > 0 && (
        <div className="absolute z-20 w-full rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          {isFetching ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">駅候補を検索中...</p>
          ) : data === undefined ? (
            <p role="alert" className="px-3 py-2 text-sm text-destructive">駅候補を取得できませんでした。</p>
          ) : data?.items.length ? (
            <ul role="listbox" className="max-h-48 overflow-auto">
              {data.items.map((station: RouteStation) => (
                <li key={station.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={station.name === value}
                    className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(station.name);
                      setIsOpen(false);
                    }}
                  >
                    {station.name}<span className="ml-2 text-muted-foreground">{station.area}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">候補がありません。別の駅名で検索してください。</p>
          )}
        </div>
      )}
    </div>
  );
}

export function RoutePlanner({
  transportType,
  departurePlace,
  arrivalPlace,
  routeSerializeData,
  onDeparturePlaceChange,
  onArrivalPlaceChange,
  onRouteSerializeDataChange,
  onFareChange,
}: RoutePlannerProps) {
  const [routes, setRoutes] = useState<RouteCandidate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const selectedRoute = parseSelectedRoute(routeSerializeData);

  if (transportType !== 'train' && transportType !== 'bus') {
    return (
      <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>出発地</Label>
          <Input value={departurePlace} placeholder="例: 新宿駅" onChange={(event) => onDeparturePlaceChange(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>到着地</Label>
          <Input value={arrivalPlace} placeholder="例: 大阪駅" onChange={(event) => onArrivalPlaceChange(event.target.value)} />
        </div>
      </div>
    );
  }

  const saveSelectedRoute = (route: SelectedRoute) => {
    onRouteSerializeDataChange(JSON.stringify(route));
  };

  const updateViaStation = (index: number, station: string) => {
    if (!selectedRoute) return;
    const viaStations = [...selectedRoute.viaStations];
    viaStations[index] = station;
    saveSelectedRoute({ ...selectedRoute, viaStations });
  };

  const searchRoutes = async () => {
    setSearchError('');
    setRoutes([]);
    setIsSearching(true);
    try {
      const result = await routeSearchApi.searchRoutes(departurePlace, arrivalPlace);
      setRoutes(result.items);
      if (result.items.length === 0) {
        setSearchError('駅候補から出発地と到着地を選択してください。');
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : '経路を検索できませんでした。');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4 sm:col-span-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <StationInput
          label="出発地"
          value={departurePlace}
          onChange={(value) => {
            onDeparturePlaceChange(value);
            onRouteSerializeDataChange('');
            setRoutes([]);
          }}
        />
        <StationInput
          label="目的地"
          value={arrivalPlace}
          onChange={(value) => {
            onArrivalPlaceChange(value);
            onRouteSerializeDataChange('');
            setRoutes([]);
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={searchRoutes}
        disabled={isSearching || !departurePlace.trim() || !arrivalPlace.trim()}
      >
        {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
        経路を検索
      </Button>

      {searchError && <p role="status" className="text-sm text-destructive">{searchError}</p>}
      {routes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700">
            モック検索結果です。経路・運賃は実際の交通情報ではありません。
          </p>
          {routes.map((route) => {
            const isSelected = selectedRoute?.routeId === route.id;
            return (
              <button
                key={route.id}
                type="button"
                aria-pressed={isSelected}
                className={`w-full rounded-md border p-3 text-left ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                onClick={() => {
                  const nextRoute = {
                    provider: 'mock' as const,
                    routeId: route.id,
                    routeLabel: route.label,
                    viaStations: route.viaStations,
                  };
                  onDeparturePlaceChange(route.departurePlace);
                  onArrivalPlaceChange(route.arrivalPlace);
                  onFareChange(route.fare);
                  saveSelectedRoute(nextRoute);
                }}
              >
                <span className="flex flex-wrap items-center justify-between gap-2 font-medium">
                  <span>{route.label}</span>
                  <span>{route.fare.toLocaleString('ja-JP')}円・約{route.durationMinutes}分</span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {[route.departurePlace, ...route.viaStations, route.arrivalPlace].join(' → ')}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {selectedRoute && (
        <div className="space-y-3 rounded-md border bg-muted/40 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">選択した経路: {selectedRoute.routeLabel}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveSelectedRoute({ ...selectedRoute, viaStations: [...selectedRoute.viaStations, ''] })}
            >
              <Plus className="mr-1 h-4 w-4" />経由地を追加
            </Button>
          </div>
          {selectedRoute.viaStations.map((station, index) => (
            <div key={`${selectedRoute.routeId}-via-${index}`} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <StationInput
                  label={`経由地 ${index + 1}`}
                  value={station}
                  onChange={(value) => updateViaStation(index, value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`経由地 ${index + 1} を削除`}
                onClick={() => {
                  const viaStations = selectedRoute.viaStations.filter((_, stationIndex) => stationIndex !== index);
                  saveSelectedRoute({ ...selectedRoute, viaStations });
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <p className="text-sm text-muted-foreground">
            経路: {[departurePlace, ...selectedRoute.viaStations.filter(Boolean), arrivalPlace].filter(Boolean).join(' → ')}
          </p>
          <p className="text-xs text-muted-foreground">
            経由地を変更しても参考運賃は再計算されません。申請前に金額を確認してください。
          </p>
        </div>
      )}
    </div>
  );
}
