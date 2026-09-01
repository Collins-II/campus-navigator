"use client";

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export type CampusMapDestination = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tag?: string;
};

export type CampusMapRoom = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  available?: boolean;
  tag?: string;
};

export type UserLocationMarker = {
  lat: number;
  lng: number;
  accuracy: number;
};

const DEFAULT_DESTINATION: CampusMapDestination = {
  id: 'LB-001',
  name: 'Main Library (Nkoloso)',
  lat: -15.3925,
  lng: 28.3285,
  tag: 'Study hub',
};

const defaultRooms: CampusMapRoom[] = [
  { id: 'LB-001', name: 'Main Library (Nkoloso)', lat: -15.3925, lng: 28.3285, available: true, tag: 'Study hub' },
  { id: 'LEC-002', name: 'Science Theater Block A', lat: -15.3910, lng: 28.3300, available: true, tag: 'Lecture hall' },
  { id: 'AC-001', name: 'Engineering Building', lat: -15.3932, lng: 28.3271, available: true, tag: 'Academic' },
  { id: 'IN-001', name: 'Innovation Center', lat: -15.3908, lng: 28.3306, available: true, tag: 'Innovation hub' },
  { id: 'DN-001', name: 'Student Union Complex', lat: -15.3941, lng: 28.3262, available: false, tag: 'Dining' },
];

function MapFocus({ destination }: { destination: CampusMapDestination }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([destination.lat, destination.lng], 18, {
      duration: 1.2,
    });
  }, [destination, map]);

  return null;
}

// User location marker with accuracy circle
function UserLocationMarker({ location }: { location: UserLocationMarker }) {
  return (
    <>
      {/* Accuracy radius circle */}
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={location.accuracy / 25} // Scale radius for visibility
        pathOptions={{
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.1,
          weight: 1,
          dashArray: '4 4',
        }}
      />
      {/* User location dot */}
      <CircleMarker
        center={[location.lat, location.lng]}
        radius={8}
        pathOptions={{
          color: '#ffffff',
          fillColor: '#10b981',
          fillOpacity: 0.95,
          weight: 3,
        }}
      >
        <Popup>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900">Your Location</p>
            <p className="text-gray-600">Accuracy: ±{Math.round(location.accuracy)}m</p>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

export default function Map({
  destination = DEFAULT_DESTINATION,
  markers = defaultRooms,
  userLocation,
  showUserLocation = false,
}: {
  destination?: CampusMapDestination;
  markers?: CampusMapRoom[];
  userLocation?: UserLocationMarker;
  showUserLocation?: boolean;
}) {
  // Route from user location or default starting point to destination
  const routeStart = userLocation || { lat: -15.3912, lng: 28.3268 };
  const routePoints: [number, number][] = [
    [routeStart.lat, routeStart.lng],
    [destination.lat, destination.lng],
  ];

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-[26px] border border-gray-300 bg-white shadow-md">
      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={17}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFocus destination={destination} />

        {/* Route line */}
        <Polyline
          positions={routePoints}
          pathOptions={{
            color: '#10b981',
            weight: 4,
            opacity: 0.7,
            dashArray: '8 14',
          }}
        />

        {/* User location */}
        {showUserLocation && userLocation && <UserLocationMarker location={userLocation} />}

        {/* Campus location markers */}
        {markers.map((room) => (
          <CircleMarker
            key={room.id}
            center={[room.lat, room.lng]}
            radius={room.id === destination.id ? 16 : 12}
            pathOptions={{
              color: room.available === false ? '#f59e0b' : '#059669',
              fillColor: room.available === false ? '#f59e0b' : '#10b981',
              fillOpacity: room.id === destination.id ? 0.95 : 0.8,
              weight: room.id === destination.id ? 3 : 2,
            }}
          >
            <Popup>
              <div className="space-y-1 text-sm text-gray-900">
                <p className="font-semibold">{room.name}</p>
                <p className="text-gray-600">{room.available === false ? 'Busy right now' : 'Available now'}</p>
                {room.tag ? <p className="text-gray-700 font-medium">{room.tag}</p> : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
