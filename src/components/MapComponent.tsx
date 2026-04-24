import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { translations, Language } from '../translations';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
import markerIcon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
// @ts-ignore
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  currentLocation: { 
    latitude: number | null; 
    longitude: number | null; 
    heading?: number | null;
  } | null;
  destination: { latitude: number; longitude: number } | null;
  onDestinationSelect: (lat: number, lng: number) => void;
  radius: number;
  language: Language;
}

// Custom Google Maps style blue dot
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center pointer-events-none" style="width: 60px; height: 60px;">
        <!-- Outer Pulse -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-blue-500/20 rounded-full animate-pulse-slow"></div>
        
        <!-- Main Dot Container -->
        <div class="relative w-6 h-6 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center border border-white/50">
          <!-- The Blue Dot -->
          <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]"></div>
        </div>
      </div>
    `,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });
};

const UserLocationMarker = ({ location }: { location: MapProps['currentLocation'] }) => {
  if (!location || location.latitude === null || location.longitude === null) return null;
  return (
    <Marker 
      position={[location.latitude, location.longitude]} 
      icon={createUserIcon()}
      zIndexOffset={1000}
    />
  );
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapComponent({ currentLocation, destination, onDestinationSelect, radius, language }: MapProps) {
  const t = translations[language];
  const mapRef = useRef<any>(null);

  const defaultCenter: [number, number] = (currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null)
    ? [currentLocation.latitude, currentLocation.longitude] 
    : [10.762622, 106.660172]; // Default to HCMC

  const handleRecenter = () => {
    if (currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null) {
      mapRef.current?.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden rounded-2xl shadow-inner bg-slate-200">
      <style>{`
        .custom-user-marker {
          transition: transform 0.3s ease-out;
        }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.5); opacity: 0.4; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        // @ts-ignore
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null && (
          <>
            <UserLocationMarker location={currentLocation} />
            <MapUpdater center={[currentLocation.latitude, currentLocation.longitude]} />
          </>
        )}

        {destination && (
          <>
            <Marker 
              position={[destination.latitude, destination.longitude]}
              icon={L.icon({
                ...DefaultIcon.options,
                className: 'hue-rotate-[120deg]' // Green marker for destination
              })}
            />
            <Circle
              center={[destination.latitude, destination.longitude]}
              radius={radius}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.2 }}
            />
          </>
        )}

        <LocationPicker onSelect={onDestinationSelect} />
      </MapContainer>
      
      {/* Recenter Controls */}
      <div className="absolute bottom-16 right-4 z-[1000] flex flex-col gap-2">
        {currentLocation && currentLocation.latitude !== null && currentLocation.longitude !== null && (
          <button 
            onClick={handleRecenter}
            className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-blue-500 active:scale-90 transition-transform"
            title="Re-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-locate-fixed"><line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
