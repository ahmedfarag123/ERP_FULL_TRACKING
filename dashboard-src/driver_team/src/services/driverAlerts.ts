import { supabase } from '@/lib/supabase';
import { getCurrentDriverLocation } from '@/services/locationTracking';

export async function createDriverSosAlert(input: {
  shipmentId?: string | null;
  message?: string;
}) {
  const location = await getCurrentDriverLocation();
  const { data, error } = await supabase.rpc('driver_create_sos_alert', {
    p_shipment_id: input.shipmentId ?? null,
    p_location_lat: location.lat,
    p_location_lng: location.lng,
    p_message: input.message ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
