"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Route, Clock, MapPin, Users, Truck, Navigation, Phone } from "lucide-react";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const route = db.savedRoutes.find((r) => r.id === params.id);

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
          <div>
            <h1 className="text-xl font-bold text-slate-900">{route.eventName}</h1>
            <p className="text-sm text-slate-500">{route.date} · {route.totalMembers}名 · {route.routes.length}台</p>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="h-[400px]">
            <RouteMap
              temple={db.temple}
              routes={route.routes.map((rt, idx) => ({
                ...rt,
                color: db.vehicles.find((v) => v.id === rt.vehicleId)?.color || vehicleColors[idx],
                vehicleName: db.vehicles.find((v) => v.id === rt.vehicleId)?.name || `車両${idx + 1}`,
                memberDetails: rt.members.map((mid) => db.members.find((m) => m.id === mid)!).filter(Boolean),
              }))}
            />
          </div>
        </div>

        {/* Vehicle Routes */}
        <div className="space-y-4">
          {route.routes.map((rt, idx) => {
            const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
            const members = rt.members.map((mid) => db.members.find((m) => m.id === mid)).filter(Boolean);

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

                {/* Pickup Points */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-slate-500 mb-2">集合ポイント</h4>
                  <div className="flex flex-wrap gap-2">
                    {rt.pickupPoints.map((pp, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ backgroundColor: (vehicle?.color || vehicleColors[idx]) + "12", color: vehicle?.color || vehicleColors[idx] }}
                      >
                        <Navigation size={11} />
                        {pp.name}
                      </span>
                    ))}
                  </div>
                </div>

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
                        <a href={`tel:${m.phone}`} className="text-slate-400 hover:text-blue-600 transition">
                          <Phone size={14} />
                        </a>
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
