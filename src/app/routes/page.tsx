"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { Route, Clock, MapPin, Users, Truck, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface RouteEntry {
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
  }[];
  totalMembers: number;
  status: string;
}

export default function RoutesPage() {
  const router = useRouter();
  const [allRoutes, setAllRoutes] = useState<RouteEntry[]>(db.savedRoutes as RouteEntry[]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("pn-saved-routes") || "[]") as RouteEntry[];
    // Merge: db.json routes + localStorage routes (no duplicates by eventId)
    const dbEventIds = new Set(db.savedRoutes.map((r) => r.eventId));
    const lsOnly = stored.filter((r) => !dbEventIds.has(r.eventId));
    setAllRoutes([...lsOnly, ...(db.savedRoutes as RouteEntry[])]);
  }, []);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">ルート履歴</h1>
          <p className="text-sm text-slate-500">{allRoutes.length}件のルート</p>
        </div>

        <div className="space-y-4">
          {allRoutes.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition cursor-pointer"
              onClick={() => router.push(`/routes/${r.id}`)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Route size={22} className="text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{r.eventName}</h3>
                  <p className="text-sm text-slate-500">{r.date}</p>
                </div>
                {r.status === "active" && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">新規</span>
                )}
                <ChevronRight size={20} className="text-slate-400" />
              </div>

              {/* Route Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Users size={16} className="mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{r.totalMembers}</p>
                  <p className="text-[11px] text-slate-500">乗車人数</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Truck size={16} className="mx-auto text-emerald-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{r.routes.length}</p>
                  <p className="text-[11px] text-slate-500">使用車両</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <Clock size={16} className="mx-auto text-orange-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{r.routes.reduce((s, rt) => s + rt.estimatedTime, 0)}</p>
                  <p className="text-[11px] text-slate-500">合計時間（分）</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <MapPin size={16} className="mx-auto text-violet-500 mb-1" />
                  <p className="text-lg font-bold text-slate-900">{r.routes.reduce((s, rt) => s + rt.distance, 0).toFixed(1)}</p>
                  <p className="text-[11px] text-slate-500">合計距離（km）</p>
                </div>
              </div>

              {/* Vehicle Breakdown */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                {r.routes.map((rt) => {
                  const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
                  return (
                    <span
                      key={rt.vehicleId}
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: (vehicle?.color || "#6B7280") + "18", color: vehicle?.color || "#6B7280" }}
                    >
                      {vehicle?.name} · {rt.members.length}名 · {rt.estimatedTime}分
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {allRoutes.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
              ルート履歴がありません
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
