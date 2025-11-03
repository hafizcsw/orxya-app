// Location Types for Epic 6

export interface LocationSample {
  id: number;
  lat: number;
  lng: number;
  accuracy?: number;
  provider?: string;
  recordedAt: number; // epoch millis (UTC)
  source: 'fused' | 'passive' | 'manual';
}

export interface PlaceFrequency {
  placeName: string;
  count: number;
}
