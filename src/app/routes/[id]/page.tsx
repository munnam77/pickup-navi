"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Users, Truck, Navigation, Phone, ExternalLink, Printer, Footprints, AlertTriangle } from "lucide-react";
import { walkingDistanceMeters, walkingTimeMinutes, WALKING_THRESHOLDS } from "@/lib/routing";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

interface SavedRoute {
  id: string;
  eventId: string;
  eventName: string;
  date: string;
  routes: {
    vehicleId: string;
    members: string[];
    pickupPoints: { name: string; lat: number; lng: number }[];
    estimatedTime: number;
    distance: number;
    walkingInfo?: { id: string; name: string; distanceMeters: number; walkingMinutes: number; warning: boolean }[];
  }[];
  totalMembers: number;
  status: string;
}

function googleMapsUrl(lat: number, lng: number, name: string) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`;
}

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check db.json first, then localStorage
    const dbRoute = db.savedRoutes.find((r) => r.id === params.id);
    if (dbRoute) {
      setRoute(dbRoute as SavedRoute);
    } else {
      const stored = JSON.parse(localStorage.getItem("pn-saved-routes") || "[]");
      const lsRoute = stored.find((r: SavedRoute) => r.id === params.id);
      if (lsRoute) setRoute(lsRoute);
    }
    setLoading(false);
  }, [params.id]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 animate-pulse" />
        </div>
      </AppShell>
    );
  }

  if (!route) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <p className="text-slate-400">ルートが見つかりません</p>
          <button onClick={() => router.push("/routes")} className="mt-4 text-orange-600 hover:underline text-sm cursor-pointer">
            ← ルート一覧に戻る
          </button>
        </div>
      </AppShell>
    );
  }

  const vehicleColors = ["#3B82F6", "#8B5CF6", "#10B981"];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/routes")}
            className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{route.eventName}</h1>
            <p className="text-sm text-slate-500">{route.date} · {route.totalMembers}名 · {route.routes.length}台</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition cursor-pointer print:hidden"
          >
            <Printer size={14} />
            印刷
          </button>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 print:hidden">
          <div className="h-[400px]">
            <RouteMap
              temple={db.temple}
              routes={route.routes.map((rt, idx) => ({
                ...rt,
                color: db.vehicles.find((v) => v.id === rt.vehicleId)?.color || vehicleColors[idx],
                vehicleName: db.vehicles.find((v) => v.id === rt.vehicleId)?.name || `車両${idx + 1}`,
                memberDetails: rt.members.map((mid) => db.members.find((m) => m.id === mid)).filter((m): m is NonNullable<typeof m> => m != null),
              }))}
            />
          </div>
        </div>

        {/* Vehicle Routes */}
        <div className="space-y-4">
          {route.routes.map((rt, idx) => {
            const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
            const members = rt.members.map((mid) => db.members.find((m) => m.id === mid)).filter(Boolean);

            // Calculate walking info if not stored
            const walkingInfo = rt.walkingInfo || members.map((m) => {
              if (!m || !rt.pickupPoints[0]) return null;
              const meters = walkingDistanceMeters(m, rt.pickupPoints[0]);
              const threshold = WALKING_THRESHOLDS[m.mobility || "normal"] || 500;
              return {
                id: m.id,
                name: m.name,
                distanceMeters: meters,
                walkingMinutes: walkingTimeMinutes(meters),
                warning: meters > threshold,
              };
            }).filter(Boolean) as { id: string; name: string; distanceMeters: number; walkingMinutes: number; warning: boolean }[];

            return (
              <div key={rt.vehicleId} className="bg-white rounded-xl border border-slate-200 p-5">
                {/* Vehicle Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: (vehicle?.color || vehicleColors[idx]) + "18" }}
                  >
                    <Truck size={20} style={{ color: vehicle?.color || vehicleColors[idx] }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{vehicle?.name || `車両${idx + 1}`}</h3>
                    <p className="text-xs text-slate-500">ドライバー: {vehicle?.driver || "未割当"}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users size={13} />{rt.members.length}名</span>
                    <span className="flex items-center gap-1"><Clock size={13} />{rt.estimatedTime}分</span>
                    <span className="flex items-center gap-1"><MapPin size={13} />{rt.distance}km</span>
                  </div>
                </div>

                {/* Pickup Points with Google Maps links */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-500 mb-2">集合ポイント</h4>
                  <div className="flex flex-wrap gap-2">
                    {rt.pickupPoints.map((pp, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                          style={{ backgroundColor: (vehicle?.color || vehicleColors[idx]) + "12", color: vehicle?.color || vehicleColors[idx] }}
                        >
                          <Navigation size={11} />
                          {pp.name}
                        </span>
                        <a
                          href={googleMapsUrl(pp.lat, pp.lng, pp.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 transition print:hidden"
                        >
                          <ExternalLink size={11} />
                          地図
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Walking Distance Info */}
                {walkingInfo.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                      <Footprints size={12} />
                      各檀家様の徒歩距離
                    </h4>
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                      {walkingInfo.map((w) => {
                        const member = db.members.find((m) => m.id === w.id);
                        return (
                          <div key={w.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${w.warning ? "bg-amber-50" : ""}`}>
                            <span className="text-slate-700 flex-1">{w.name}</span>
                            {member?.mobility !== "normal" && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                                {member?.mobility === "wheelchair" ? "♿" : member?.mobility === "walker" ? "🚶" : "🦯"}
                              </span>
                            )}
                            <span className={`font-mono ${w.warning ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                              {w.distanceMeters}m
                            </span>
                            <span className={`${w.warning ? "text-amber-600" : "text-slate-400"}`}>
                              約{w.walkingMinutes}分
                            </span>
                            {w.warning && <AlertTriangle size={12} className="text-amber-500" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <h4 className="text-xs font-medium text-slate-500 mb-2">乗車メンバー</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {members.map((m) => m && (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {m.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{m.name}</p>
                          <p className="text-[11px] text-slate-500 truncate">{m.address}</p>
                        </div>
                        <a href={`tel:${m.phone}`} className="text-slate-400 hover:text-blue-600 transition print:hidden">
                          <Phone size={14} />
                        </a>
                        <span className="hidden print:inline text-[11px] text-slate-500">{m.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
