import { useState, useEffect } from 'react';

interface Location {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number;
  heading?: number | null;
  compassHeading?: number | null;
}

export function useGeolocation(compassEnabled: boolean = false) {
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
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
          });
          setError(null);
        },
        (err) => {
          setError(err.message);
          setIsTracking(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000, // Reuse position if it's less than 5 seconds old
        }
      );
    };

    const stopTracking = () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };

    startTracking();

    return () => {
      stopTracking();
    };
  }, []);

  useEffect(() => {
    if (!compassEnabled) {
      setLocation(prev => prev ? { ...prev, compassHeading: null } : null);
      return undefined;
    }

    let lastHeading = 0;
    const smoothingFactor = 0.15; // Slightly more smoothing for better battery (less frequent visual jitters)

    const handleOrientation = (e: any) => {
      let heading: number | null = null;
      
      if (e.webkitCompassHeading !== undefined) {
        heading = e.webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = 360 - e.alpha;
      }

      if (heading !== null) {
        const targetHeading = heading;
        setLocation(prev => {
          if (!prev) return { latitude: null, longitude: null, compassHeading: targetHeading };
          
          const currentLastHeading = prev.compassHeading ?? targetHeading;
          
          let diff = targetHeading - currentLastHeading;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          
          const smoothed = (currentLastHeading + diff * smoothingFactor + 360) % 360;
          
          // Optimization: Only update if change is significant (> 1 degree)
          if (Math.abs(diff) < 1 && prev.compassHeading !== null) return prev;

          return { ...prev, compassHeading: Math.round(smoothed) };
        });
      }
    };

    const win = window as any;
    const eventType = 'ondeviceorientationabsolute' in win ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventType, handleOrientation, true);
    
    return () => {
      window.removeEventListener(eventType, handleOrientation, true);
    };
  }, [compassEnabled]);

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
