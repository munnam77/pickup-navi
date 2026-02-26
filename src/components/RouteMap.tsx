"use client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue in Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const templeIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -40],
  shadowSize: [48, 48],
});

interface RouteData {
  color: string;
  vehicleName: string;
  pickupPoints: { name: string; lat: number; lng: number }[];
  memberDetails: { id: string; name: string; lat: number; lng: number; address: string }[];
}

interface RouteMapProps {
  temple: { name: string; lat: number; lng: number };
  routes: RouteData[];
}

export default function RouteMap({ temple, routes }: RouteMapProps) {
  return (
    <MapContainer
      center={[temple.lat, temple.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Temple Marker */}
      <Marker position={[temple.lat, temple.lng]} icon={templeIcon}>
        <Popup>
          <strong>⛩️ {temple.name}</strong><br />目的地
        </Popup>
      </Marker>

      {/* Routes */}
      {routes.map((route, idx) => (
        <RouteLayer key={idx} route={route} temple={temple} />
      ))}
    </MapContainer>
  );
}

function RouteLayer({ route, temple }: { route: RouteData; temple: { lat: number; lng: number } }) {
  // Build polyline: temple -> pickup points -> temple
  const linePoints: [number, number][] = [
    [temple.lat, temple.lng],
    ...route.pickupPoints.map((pp) => [pp.lat, pp.lng] as [number, number]),
    [temple.lat, temple.lng],
  ];

  return (
    <>
      {/* Route Line */}
      <Polyline positions={linePoints} color={route.color} weight={3} opacity={0.7} dashArray="8 4" />

      {/* Pickup Points */}
      {route.pickupPoints.map((pp, i) => (
        <CircleMarker
          key={`pp-${i}`}
          center={[pp.lat, pp.lng]}
          radius={10}
          fillColor={route.color}
          fillOpacity={0.8}
          color="white"
          weight={2}
        >
          <Popup>
            <strong>📍 {pp.name}</strong><br />
            <span style={{ color: route.color }}>{route.vehicleName}</span>
          </Popup>
        </CircleMarker>
      ))}

      {/* Member Locations */}
      {route.memberDetails.map((m) => (
        <CircleMarker
          key={m.id}
          center={[m.lat, m.lng]}
          radius={5}
          fillColor={route.color}
          fillOpacity={0.5}
          color={route.color}
          weight={1}
        >
          <Popup>
            <strong>{m.name}</strong><br />
            <span style={{ fontSize: "11px" }}>{m.address}</span>
          </Popup>
        </CircleMarker>
      ))}
    </>
  );
}
