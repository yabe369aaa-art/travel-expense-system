import { Client, PlaceAutocompleteType, TravelMode, Language, UnitSystem } from '@googlemaps/google-maps-services-js';
import { getEnv } from '../config/env.js';

const env = getEnv();

const googleMapsClient = new Client({});

interface PlacePrediction {
  placeId: string;
  description: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
}

interface DistanceMatrixResult {
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
}

interface RouteWithWaypoints {
  distanceMeters: number;
  durationSeconds: number;
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  path: Array<{ lat: number; lng: number }>;
  waypoints: Array<{ placeId: string; name: string; lat: number; lng: number }>;
}

interface PlaceDetailsResult {
  lat: number;
  lng: number;
  name: string;
}

export class GoogleMapsService {
  private apiKey: string;
  private gasolineUnitPrice: number;

  constructor() {
    this.apiKey = env.GOOGLE_MAPS_API_KEY || '';
    this.gasolineUnitPrice = env.GASOLINE_UNIT_PRICE;
  }

  private checkApiKey(): void {
    if (!this.apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY が設定されていません');
    }
  }

  async searchPlaces(query: string): Promise<PlacePrediction[]> {
    this.checkApiKey();

    try {
      const response = await googleMapsClient.placeAutocomplete({
        params: {
          input: query,
          key: this.apiKey,
          language: Language.ja,
          types: PlaceAutocompleteType.geocode,
          components: ['country:jp'],
        },
      });

      return response.data.predictions.map((prediction) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        structuredFormatting: {
          mainText: prediction.structured_formatting?.main_text || '',
          secondaryText: prediction.structured_formatting?.secondary_text || '',
        },
      }));
    } catch (error) {
      console.error('Google Places API error:', error);
      throw new Error('場所の検索に失敗しました');
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
    this.checkApiKey();

    try {
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          key: this.apiKey,
          language: Language.ja,
          fields: ['geometry', 'name', 'formatted_address'],
        },
      });

      const result = response.data.result;
      if (!result.geometry?.location) return null;

      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        name: result.name || result.formatted_address || '',
      };
    } catch (error) {
      console.error('Google Place Details API error:', error);
      throw new Error('場所の詳細取得に失敗しました');
    }
  }

  async calculateRouteWithWaypoints(
    origin: string,
    destination: string,
    waypoints: string[] = []
  ): Promise<DistanceMatrixResult> {
    this.checkApiKey();

    try {
      const allWaypoints = waypoints.filter((w) => w.trim()).map((w) => w.trim());

      // Use Directions API for routes with waypoints, Distance Matrix for simple routes
      if (allWaypoints.length > 0) {
        const response = await googleMapsClient.directions({
          params: {
            origin,
            destination,
            waypoints: allWaypoints,
            mode: TravelMode.driving,
            key: this.apiKey,
            language: Language.ja,
          },
        });

        const route = response.data.routes[0];
        if (!route || route.legs.length === 0) {
          throw new Error('ルートが見つかりません');
        }

        // Sum up distance and duration from all legs
        let totalDistanceMeters = 0;
        let totalDurationSeconds = 0;
        route.legs.forEach((leg) => {
          totalDistanceMeters += leg.distance.value;
          totalDurationSeconds += leg.duration.value;
        });

        return {
          distanceMeters: totalDistanceMeters,
          durationSeconds: totalDurationSeconds,
          distanceText: `${(totalDistanceMeters / 1000).toFixed(1)} km`,
          durationText: `${Math.ceil(totalDurationSeconds / 60)} 分`,
        };
      } else {
        // Use Distance Matrix for simple origin-destination
        const response = await googleMapsClient.distancematrix({
          params: {
            origins: [origin],
            destinations: [destination],
            mode: TravelMode.driving,
            key: this.apiKey,
            language: Language.ja,
            units: UnitSystem.metric,
          },
        });

        const element = response.data.rows[0]?.elements[0];
        if (!element || element.status !== 'OK') {
          throw new Error('ルートが見つかりません');
        }

        return {
          distanceMeters: element.distance.value,
          durationSeconds: element.duration.value,
          distanceText: element.distance.text,
          durationText: element.duration.text,
        };
      }
    } catch (error) {
      console.error('Google Maps API error:', error);
      throw new Error('距離計測に失敗しました');
    }
  }

  async getRoutePath(
    origin: string,
    destination: string,
    waypoints: string[] = []
  ): Promise<Array<{ lat: number; lng: number }>> {
    this.checkApiKey();

    try {
      const allWaypoints = waypoints.filter((w) => w.trim()).map((w) => w.trim());

      const response = await googleMapsClient.directions({
        params: {
          origin,
          destination,
          waypoints: allWaypoints.length > 0 ? allWaypoints : undefined,
          mode: TravelMode.driving,
          key: this.apiKey,
          language: Language.ja,
        },
      });

      const route = response.data.routes[0];
      if (!route) return [];

      const path: Array<{ lat: number; lng: number }> = [];
      route.legs.forEach((leg) => {
        leg.steps.forEach((step) => {
          if (step.start_location) {
            path.push({
              lat: step.start_location.lat,
              lng: step.start_location.lng,
            });
          }
          if (step.end_location) {
            path.push({
              lat: step.end_location.lat,
              lng: step.end_location.lng,
            });
          }
        });
      });

      return path;
    } catch (error) {
      console.error('Google Directions API error:', error);
      return [];
    }
  }

  async getStaticMapUrl(
    center: { lat: number; lng: number },
    zoom: number,
    markers: Array<{ lat: number; lng: number; label?: string; color?: string }> = [],
    path?: Array<{ lat: number; lng: number }>,
    width = 800,
    height = 600
  ): Promise<string> {
    this.checkApiKey();

    const params = new URLSearchParams({
      center: `${center.lat},${center.lng}`,
      zoom: zoom.toString(),
      size: `${width}x${height}`,
      scale: '2',
      maptype: 'roadmap',
      key: this.apiKey,
    });

    if (markers.length > 0) {
      const markerParams = markers.map((marker, index) => {
        const color = marker.color || 'red';
        const label = marker.label || String.fromCharCode(65 + index);
        return `color:${color}|label:${label}|${marker.lat},${marker.lng}`;
      });
      params.append('markers', markerParams.join('|'));
    }

    if (path && path.length > 0) {
      const pathStr = path.map((p) => `${p.lat},${p.lng}`).join('|');
      params.append('path', `weight:5|color:0x0000ff|enc:${encodePolyline(path)}`);
    }

    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }

  calculateFare(distanceKm: number): number {
    return Math.max(0, Math.round(distanceKm * this.gasolineUnitPrice));
  }

  async getFullRouteInfo(
    originPlaceId: string,
    destinationPlaceId: string,
    waypointPlaceIds: string[] = []
  ): Promise<RouteWithWaypoints> {
    const originDetails = await this.getPlaceDetails(originPlaceId);
    const destinationDetails = await this.getPlaceDetails(destinationPlaceId);
    const waypointDetails = await Promise.all(
      waypointPlaceIds.map((id) => this.getPlaceDetails(id))
    );

    if (!originDetails || !destinationDetails) {
      throw new Error('出発地または目的地の詳細が取得できません');
    }

    const waypointsValid = waypointDetails.filter((w): w is PlaceDetailsResult => w !== null);

    const distanceResult = await this.calculateRouteWithWaypoints(
      `place_id:${originPlaceId}`,
      `place_id:${destinationPlaceId}`,
      waypointPlaceIds.filter((id) => id.trim())
    );

    const path = await this.getRoutePath(
      `place_id:${originPlaceId}`,
      `place_id:${destinationPlaceId}`,
      waypointPlaceIds.filter((id) => id.trim())
    );

    const allWaypoints: Array<{ placeId: string; name: string; lat: number; lng: number }> = [
      { placeId: originPlaceId, ...originDetails },
      ...waypointsValid.map((w) => ({ placeId: '', ...w })),
      { placeId: destinationPlaceId, ...destinationDetails },
    ];

    const distanceKm = distanceResult.distanceMeters / 1000;
    const fare = this.calculateFare(distanceKm);

    return {
      distanceMeters: distanceResult.distanceMeters,
      durationSeconds: distanceResult.durationSeconds,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.ceil(distanceResult.durationSeconds / 60),
      fare,
      path,
      waypoints: allWaypoints,
    };
  }
}

function encodePolyline(path: Array<{ lat: number; lng: number }>): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of path) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);

    const dLat = lat - prevLat;
    const dLng = lng - prevLng;

    prevLat = lat;
    prevLng = lng;

    result += encodeSignedNumber(dLat);
    result += encodeSignedNumber(dLng);
  }

  return result;
}

function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~sgnNum;
  }
  return encodeNumber(sgnNum);
}

function encodeNumber(num: number): string {
  let result = '';
  while (num >= 0x20) {
    result += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  result += String.fromCharCode(num + 63);
  return result;
}