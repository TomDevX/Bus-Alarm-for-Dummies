import { useState, useEffect, useCallback } from 'react';

interface Location {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
  heading?: number | null;
  compassHeading?: number | null;
}

export function useGeolocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported");
      return;
    }

    let watchId: number;

    const startTracking = () => {
      setIsTracking(true);
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation(prev => ({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            compassHeading: prev?.compassHeading ?? null,
          }));
          setError(null);
        },
        (err) => {
          setError(err.message);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    const stopTracking = () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };

    let lastHeading = 0;
    const smoothingFactor = 0.2;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      
      // @ts-ignore
      if (e.webkitCompassHeading !== undefined) {
        // @ts-ignore
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Standard formula for absolute alpha: 0 is North, increases counter-clockwise
        // We convert to clockwise heading
        heading = (360 - e.alpha) % 360;
      }

      if (heading !== null) {
        // Use a local ref-like variable to avoid old state closure if possible, 
        // though setLocation functional update is usually enough.
        // We round to avoid jitter in the UI transform string.
        const targetHeading = heading;
        
        setLocation(prev => {
          const currentLastHeading = prev?.compassHeading ?? targetHeading;
          
          let diff = targetHeading - currentLastHeading;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          
          const smoothed = (currentLastHeading + diff * smoothingFactor + 360) % 360;
          
          if (prev) {
            return { ...prev, compassHeading: smoothed };
          }
          return {
            latitude: null,
            longitude: null,
            compassHeading: smoothed
          };
        });
      }
    };

    // Chrome on Android requires deviceorientationabsolute for actual compass
    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else {
      win.addEventListener('deviceorientation', handleOrientation, true);
    }
    
    startTracking();

    return () => {
      stopTracking();
      win.removeEventListener('deviceorientationabsolute', handleOrientation);
      win.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return { location, error, isTracking };
}

// Haversine formula to calculate distance between two points in meters
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
