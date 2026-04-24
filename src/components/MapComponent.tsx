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

// Custom arrow icon for current location
const createUserIcon = (heading: number | null | undefined) => {
  const rotation = heading || 0;
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="transform: rotate(${rotation}deg); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-bottom: 20px solid #3b82f6;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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
    : [0, 0];

  return (
    <div className="h-full w-full relative overflow-hidden rounded-2xl shadow-inner bg-slate-200">
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
