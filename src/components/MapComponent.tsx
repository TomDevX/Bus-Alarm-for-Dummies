import { MapContainer, TileLayer, Marker, useMapEvents, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';
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
  currentLocation: { latitude: number; longitude: number; heading?: number | null } | null;
  destination: { latitude: number; longitude: number } | null;
  onDestinationSelect: (lat: number, lng: number) => void;
  radius: number;
  language: Language;
}

// Custom Google Maps style blue dot with beam
const createUserIcon = (heading: number | null | undefined) => {
  const rotation = heading || 0;
  const showBeam = heading !== undefined && heading !== null;
  
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="relative flex items-center justify-center" style="width: 64px; height: 64px;">
        <!-- Directional Beam -->
        ${showBeam ? `
          <div class="absolute w-32 h-32 origin-bottom transition-transform duration-500" 
               style="transform: translateY(-16px) rotate(${rotation}deg); bottom: 50%;">
            <div class="w-full h-full bg-gradient-to-t from-blue-500/40 to-transparent" 
                 style="clip-path: polygon(50% 100%, 15% 0%, 85% 0%);"></div>
          </div>
        ` : ''}
        
        <!-- Outer Pulse -->
        <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
        
        <!-- Main Dot Container -->
        <div class="relative w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
          <!-- The Blue Dot -->
          <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-inner"></div>
        </div>
      </div>
    `,
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
};

const UserLocationMarker = ({ location }: { location: MapProps['currentLocation'] }) => {
  if (!location) return null;
  return (
    <Marker 
      position={[location.latitude, location.longitude]} 
      icon={createUserIcon(location.heading)}
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
  const defaultCenter: [number, number] = currentLocation 
    ? [currentLocation.latitude, currentLocation.longitude] 
    : [10.762622, 106.660172]; // Default to HCMC

  return (
    <div className="h-full w-full relative overflow-hidden rounded-2xl shadow-inner bg-slate-200">
      <style>{`
        .custom-user-marker {
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping {
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {currentLocation && (
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
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-xs font-medium text-slate-600 border border-slate-200 text-center whitespace-nowrap">
        {t.direction_hint}
      </div>
    </div>
  );
}
