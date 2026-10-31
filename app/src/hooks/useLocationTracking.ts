import { useEffect, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import type { LatLng } from '@hunt/shared';
import { gameService } from '../data/gameService';

const HEARTBEAT_MS = 5000;

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  return new Promise(resolve =>
    Geolocation.requestAuthorization(
      () => resolve(true),
      () => resolve(false),
    ),
  );
}

/** Streams the device position to the server while `active`. */
export function useLocationTracking(active: boolean) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    let watchId: number | null = null;
    let cancelled = false;
    let last: LatLng | null = null;

    const onFix = ({ coords }: { coords: { latitude: number; longitude: number } }) => {
      last = { lat: coords.latitude, lng: coords.longitude };
      setPosition(last);
      setError(null);
      gameService.sendLocation(last);
    };
    const onError = (e: { message: string }) => setError(e.message);

    requestPermission().then(granted => {
      if (cancelled) return;
      if (!granted) return setError('Location permission is needed to play');
      // A standing-still phone may never fire the watch (distanceFilter), so ask for one fix up front.
      Geolocation.getCurrentPosition(onFix, onError, { enableHighAccuracy: true, maximumAge: 10_000 });
      watchId = Geolocation.watchPosition(onFix, onError, {
        enableHighAccuracy: true,
        distanceFilter: 2,
        interval: 2000,
        fastestInterval: 1000,
      });
    });

    // Re-send the last fix so a new room, reconnect or server restart always knows where we are.
    const heartbeat = setInterval(() => last && gameService.sendLocation(last), HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      if (watchId !== null) Geolocation.clearWatch(watchId);
    };
  }, [active]);

  return { position, error };
}
