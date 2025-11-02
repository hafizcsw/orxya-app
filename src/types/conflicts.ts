export type ConflictRow = {
  id: string;
  owner_id: string;
  object_id: string | null;
  object_kind: string;
  date_iso: string; // YYYY-MM-DD
  prayer_name: string;
  prayer_start: string; // timestamptz
  prayer_end: string;   // timestamptz
  overlap_min: number;
  buffer_min: number | null;
  severity: string;
  status: string;
  resolution: string | null;
  suggested_start_iso: string | null;
  created_at: string;
  updated_at: string | null;
  event_id?: string | null;
};

export type LocationSample = {
  id?: string;
  owner_id?: string;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  source: string | null;
  sampled_at: string;
  recorded_at?: string;
};
