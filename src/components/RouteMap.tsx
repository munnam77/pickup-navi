"use client";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix leaflet default icon issue in Next.js — MUST apply globally
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const templeIcon = L.divIcon({
  html: `<div style="background: linear-gradient(135deg, #F97316, #DC2626); width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">⛩</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
  className: "",
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

// Auto-fit bounds to show all markers
function FitBounds({ temple, routes }: RouteMapProps) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = [[temple.lat, temple.lng]];

    for (const route of routes) {
      for (const pp of route.pickupPoints) {
        points.push([pp.lat, pp.lng]);
      }
      for (const m of route.memberDetails) {
        points.push([m.lat, m.lng]);
      }
    }

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, temple, routes]);

  return null;
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

      <FitBounds temple={temple} routes={routes} />

      {/* Temple Marker */}
      <Marker position={[temple.lat, temple.lng]} icon={templeIcon}>
        <Popup>
          <strong>⛩️ {temple.name}</strong><br />目的地
        </Popup>
      </Marker>

      {/* Routes */}
      {routes.map((route, idx) => (
        <RouteLayer key={idx} route={route} temple={temple} routeIndex={idx} />
      ))}
    </MapContainer>
  );
}

function RouteLayer({ route, temple, routeIndex }: { route: RouteData; temple: { lat: number; lng: number }; routeIndex: number }) {
  // Build polyline: temple -> pickup points (in order) -> temple
  const linePoints: [number, number][] = [
    [temple.lat, temple.lng],
    ...route.pickupPoints.map((pp) => [pp.lat, pp.lng] as [number, number]),
    [temple.lat, temple.lng],
  ];

  return (
    <>
      {/* Route Line */}
      <Polyline positions={linePoints} color={route.color} weight={3} opacity={0.7} dashArray="8 4" />

      {/* Pickup Points with order numbers */}
      {route.pickupPoints.map((pp, i) => {
        const orderIcon = L.divIcon({
          html: `<div style="background: ${route.color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 13px; font-weight: 700; border: 2.5px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${routeIndex + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
          className: "",
        });

        return (
          <Marker
            key={`pp-${routeIndex}-${i}`}
            position={[pp.lat, pp.lng]}
            icon={orderIcon}
          >
            <Popup>
              <strong>📍 {pp.name}</strong><br />
              <span style={{ color: route.color }}>{route.vehicleName}</span><br />
              <span style={{ fontSize: "11px", color: "#6B7280" }}>{route.memberDetails.length}名が集合</span>
            </Popup>
          </Marker>
        );
      })}

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
