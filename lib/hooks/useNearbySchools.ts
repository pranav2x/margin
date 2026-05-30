import { useCallback, useState } from 'react';
import * as Location from 'expo-location';

import { supabase } from '../supabase';

export interface NearbySchool {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  distance_km: number;
}

export interface NearbySchoolsState {
  data: NearbySchool[] | null;
  loading: boolean;
  denied: boolean;
  error: string | null;
}

// Foreground-only, one-shot reverse lookup. Coordinates leave the device once
// (in the RPC call), are never written to state beyond this closure, and are
// never persisted — same contract onboarding established.
export function useNearbySchools(initialLimit = 8) {
  const [data, setData] = useState<NearbySchool[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locate = useCallback(async (limit: number = initialLimit): Promise<NearbySchool[] | null> => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data: rows, error: err } = await supabase.rpc('nearby_schools', {
        p_lat: pos.coords.latitude,
        p_lng: pos.coords.longitude,
        p_limit: limit,
      });
      if (err) throw err;
      const list = ((rows as NearbySchool[] | null) ?? []);
      setData(list);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not find schools near you.');
      return null;
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  const reset = useCallback(() => {
    setData(null);
    setDenied(false);
    setError(null);
  }, []);

  return { data, loading, denied, error, locate, reset };
}
