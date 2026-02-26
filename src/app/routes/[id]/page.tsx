"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, MapPin, Users, Truck, Navigation, Phone, Printer, Footprints, AlertTriangle, ExternalLink } from "lucide-react";
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

function googleMapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 animate-pulse" />
          <p className="text-sm text-slate-400">読み込み中...</p>
        </div>
      </AppShell>
    );
  }

  if (!route) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto text-center py-20">
          <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-base text-slate-500">ルートが見つかりません</p>
          <button onClick={() => router.push("/routes")} className="mt-4 text-base text-orange-600 hover:underline cursor-pointer font-medium">
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
            aria-label="ルート一覧に戻る"
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition cursor-pointer shrink-0"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">{route.eventName}</h1>
            <p className="text-sm text-slate-500">{route.date} · {route.totalMembers}名 · {route.routes.length}台</p>
          </div>
          <button
            onClick={() => window.print()}
            aria-label="このルートを印刷する"
            className="flex items-center gap-1.5 text-sm text-slate-600 bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer print:hidden font-medium shrink-0"
          >
            <Printer size={16} />
            印刷する
          </button>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6 print:hidden">
          <div className="h-[300px] lg:h-[400px]">
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
        <div className="space-y-5">
          {route.routes.map((rt, idx) => {
            const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
            const members = rt.members.map((mid) => db.members.find((m) => m.id === mid)).filter(Boolean);

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
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: (vehicle?.color || vehicleColors[idx]) + "18" }}
                  >
                    <Truck size={22} style={{ color: vehicle?.color || vehicleColors[idx] }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900">{vehicle?.name || `車両${idx + 1}`}</h3>
                    <p className="text-sm text-slate-500">運転手: {vehicle?.driver || "未割当"}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><Users size={15} />{rt.members.length}名</span>
                    <span className="flex items-center gap-1"><Clock size={15} />{rt.estimatedTime}分</span>
                    <span className="hidden sm:flex items-center gap-1"><MapPin size={15} />{rt.distance}km</span>
                  </div>
                </div>

                {/* Pickup Points with Google Maps — prominent buttons for drivers */}
                <div className="mb-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-3">集合ポイント</h4>
                  <div className="space-y-2">
                    {rt.pickupPoints.map((pp, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: vehicle?.color || vehicleColors[idx] }}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-base font-medium text-slate-900 flex-1">{pp.name}</span>
                        <a
                          href={googleMapsUrl(pp.lat, pp.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition font-bold print:hidden shrink-0"
                        >
                          <ExternalLink size={14} />
                          ナビを開く
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Walking Distance Info */}
                {walkingInfo.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
                      <Footprints size={14} />
                      各檀家様の徒歩距離
                    </h4>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      {walkingInfo.map((w) => {
                        const member = db.members.find((m) => m.id === w.id);
                        return (
                          <div key={w.id} className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg ${w.warning ? "bg-amber-50 border border-amber-200" : ""}`}>
                            <span className="text-slate-800 flex-1 font-medium">{w.name}</span>
                            {member?.mobility !== "normal" && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                {member?.mobility === "wheelchair" ? "♿" : member?.mobility === "walker" ? "🚶" : "🦯"}
                              </span>
                            )}
                            <span className={`font-mono ${w.warning ? "text-amber-600 font-bold" : "text-slate-500"}`}>
                              {w.distanceMeters}m
                            </span>
                            <span className={`${w.warning ? "text-amber-600" : "text-slate-400"}`}>
                              約{w.walkingMinutes}分
                            </span>
                            {w.warning && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Members */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3">乗車メンバー</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {members.map((m) => m && (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                          {m.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-500 truncate">{m.address}</p>
                        </div>
                        <a href={`tel:${m.phone}`} aria-label={`${m.name}に電話する`} className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition print:hidden shrink-0">
                          <Phone size={16} />
                        </a>
                        <span className="hidden print:inline text-xs text-slate-500">{m.phone}</span>
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
