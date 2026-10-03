const stations = [
  { id: 'tokyo', name: '東京駅', area: '東京都', latitude: 35.6812, longitude: 139.7671 },
  { id: 'shinjuku', name: '新宿駅', area: '東京都', latitude: 35.6896, longitude: 139.7006 },
  { id: 'shibuya', name: '渋谷駅', area: '東京都', latitude: 35.658, longitude: 139.7016 },
  { id: 'shinagawa', name: '品川駅', area: '東京都', latitude: 35.6285, longitude: 139.7387 },
  { id: 'ueno', name: '上野駅', area: '東京都', latitude: 35.7138, longitude: 139.7773 },
  { id: 'yokohama', name: '横浜駅', area: '神奈川県', latitude: 35.4658, longitude: 139.6223 },
  { id: 'shin-yokohama', name: '新横浜駅', area: '神奈川県', latitude: 35.5074, longitude: 139.6178 },
  { id: 'nagoya', name: '名古屋駅', area: '愛知県', latitude: 35.1709, longitude: 136.8815 },
  { id: 'kyoto', name: '京都駅', area: '京都府', latitude: 34.9858, longitude: 135.7588 },
  { id: 'osaka', name: '大阪駅', area: '大阪府', latitude: 34.7025, longitude: 135.4959 },
  { id: 'shin-osaka', name: '新大阪駅', area: '大阪府', latitude: 34.7335, longitude: 135.5001 },
  { id: 'sapporo', name: '札幌駅', area: '北海道', latitude: 43.0687, longitude: 141.3508 },
  { id: 'hakata', name: '博多駅', area: '福岡県', latitude: 33.5897, longitude: 130.4206 },
  { id: 'haneda', name: '羽田空港', area: '東京都', latitude: 35.5494, longitude: 139.7798 },
  { id: 'narita', name: '成田空港', area: '千葉県', latitude: 35.7719, longitude: 140.3929 },
] as const;

export interface RouteCandidate {
  id: string;
  label: string;
  departurePlace: string;
  arrivalPlace: string;
  viaStations: string[];
  durationMinutes: number;
  fare: number;
  provider: 'mock';
}

export class RouteSearchService {
  searchStations(query: string) {
    const normalizedQuery = query.trim().toLocaleLowerCase('ja-JP');
    if (!normalizedQuery) return [];

    return stations
      .filter((station) =>
        `${station.name} ${station.area}`.toLocaleLowerCase('ja-JP').includes(normalizedQuery)
      )
      .map(({ id, name, area }) => ({ id, name, area }));
  }

  searchRoutes(departurePlace: string, arrivalPlace: string): RouteCandidate[] {
    const departure = stations.find((station) => station.name === departurePlace);
    const arrival = stations.find((station) => station.name === arrivalPlace);
    if (!departure || !arrival || departure.id === arrival.id) return [];

    const distanceKm = this.distanceKm(
      departure.latitude,
      departure.longitude,
      arrival.latitude,
      arrival.longitude
    );
    const via = this.getSuggestedViaStation(departure.id, arrival.id);
    const baseFare = Math.max(160, Math.round(distanceKm * 12 / 10) * 10);
    const direct: RouteCandidate = {
      id: `${departure.id}-${arrival.id}-direct`,
      label: '乗換少なめ（モック候補）',
      departurePlace: departure.name,
      arrivalPlace: arrival.name,
      viaStations: [],
      durationMinutes: Math.max(10, Math.round(distanceKm * 1.5)),
      fare: baseFare,
      provider: 'mock',
    };

    if (!via) return [direct];

    return [
      direct,
      {
        id: `${departure.id}-${via.id}-${arrival.id}-via`,
        label: `${via.name}経由（モック候補）`,
        departurePlace: departure.name,
        arrivalPlace: arrival.name,
        viaStations: [via.name],
        durationMinutes: direct.durationMinutes + 15,
        fare: baseFare + 240,
        provider: 'mock',
      },
    ];
  }

  private getSuggestedViaStation(departureId: string, arrivalId: string) {
    const route = new Set([departureId, arrivalId]);
    if ((route.has('tokyo') || route.has('shinjuku')) && route.has('osaka')) {
      return stations.find((station) => station.id === 'nagoya');
    }
    if (route.has('tokyo') && route.has('kyoto')) {
      return stations.find((station) => station.id === 'nagoya');
    }
    if (route.has('tokyo') && route.has('yokohama')) {
      return stations.find((station) => station.id === 'shin-yokohama');
    }
    return undefined;
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    const latitudeDelta = toRadians(lat2 - lat1);
    const longitudeDelta = toRadians(lon2 - lon1);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  }
}
