"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { formatDemoDate } from "@/lib/demo";
import {
  Users,
  CalendarDays,
  Truck,
  Route,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  History,
  Navigation,
  Footprints,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const upcomingEvents = db.events.filter((e) => e.status === "upcoming" || e.status === "planned");
const mobilityMembers = db.members.filter((m) => m.mobility !== "normal");

interface RouteEntry {
  id: string;
  eventId: string;
  eventName: string;
  date: string;
  routes: { vehicleId: string; members: string[]; pickupPoints: { name: string; lat: number; lng: number }[]; estimatedTime: number; distance: number }[];
  totalMembers: number;
  status: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [allRoutes, setAllRoutes] = useState<RouteEntry[]>(db.savedRoutes as RouteEntry[]);
  const [userRole, setUserRole] = useState<string>("admin");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("pn-saved-routes") || "[]") as RouteEntry[];
    const dbEventIds = new Set(db.savedRoutes.map((r) => r.eventId));
    const lsOnly = stored.filter((r) => !dbEventIds.has(r.eventId));
    setAllRoutes([...lsOnly, ...(db.savedRoutes as RouteEntry[])]);

    const user = JSON.parse(localStorage.getItem("pn-user") || "{}");
    setUserRole(user.role || "admin");
    setUserName(user.name || "");
  }, []);

  // For member role: find their pickup info from saved routes
  const memberPickupInfo = userRole === "member" ? (() => {
    // Find the member in db by matching login name
    const member = db.members.find((m) => m.name === userName);
    if (!member) return [];

    return upcomingEvents.map((event) => {
      const route = allRoutes.find((r) => r.eventId === event.id);
      if (!route) return { event, pickupPoint: null, vehicle: null };

      const vehicleRoute = route.routes.find((rt) => rt.members.includes(member.id));
      if (!vehicleRoute) return { event, pickupPoint: null, vehicle: null };

      const vehicle = db.vehicles.find((v) => v.id === vehicleRoute.vehicleId);
      const pickupPoint = vehicleRoute.pickupPoints[0];

      return { event, pickupPoint, vehicle };
    });
  })() : [];

  const stats = [
    { label: "登録檀家数", value: db.members.length, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "今後の行事", value: upcomingEvents.length, icon: CalendarDays, color: "text-orange-600 bg-orange-50" },
    { label: "車両台数", value: db.vehicles.length, icon: Truck, color: "text-emerald-600 bg-emerald-50" },
    { label: "作成済ルート", value: allRoutes.length, icon: Route, color: "text-violet-600 bg-violet-50" },
  ];

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="text-sm text-slate-500">{formatDemoDate()} · {db.temple.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
              <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                <s.icon size={18} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <CalendarDays size={18} className="text-orange-600" />
                今後の行事
              </h2>
              <button
                onClick={() => router.push("/events")}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
              >
                すべて表示 <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((e) => {
                const savedRoute = allRoutes.find((r) => r.eventId === e.id);
                return (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <CalendarDays size={18} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.date} {e.time} · {e.attendees.length}名</p>
                    </div>
                    {savedRoute ? (
                      <button
                        onClick={() => router.push(`/routes/${savedRoute.id}`)}
                        className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100 transition cursor-pointer"
                      >
                        <CheckCircle2 size={12} />ルート確認
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/route-planner?event=${e.id}`)}
                        className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full hover:bg-orange-100 transition cursor-pointer"
                      >
                        <Route size={12} />ルート作成
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member Pickup Info (member role only) */}
          {userRole === "member" && memberPickupInfo.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Navigation size={18} className="text-blue-600" />
                あなたの送迎情報
              </h2>
              <div className="space-y-3">
                {memberPickupInfo.map((info) => (
                  <div key={info.event.id} className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="font-medium text-sm text-slate-900 mb-2">{info.event.name}</p>
                    <p className="text-xs text-slate-500 mb-3">{info.event.date} {info.event.time}</p>
                    {info.pickupPoint && info.vehicle ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">集合場所: {info.pickupPoint.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck size={14} style={{ color: info.vehicle.color }} />
                          <span className="text-sm text-slate-700">車両: {info.vehicle.name}（{info.vehicle.driver}）</span>
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${info.pickupPoint.lat},${info.pickupPoint.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-white px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-50 transition mt-1"
                        >
                          <Footprints size={12} />
                          集合場所への道順を開く
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">まだルートが作成されていません</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobility Alerts (admin/driver only) */}
          {userRole !== "member" && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-amber-600" />
                配慮が必要な檀家様
              </h2>
              <div className="space-y-3">
                {mobilityMembers.map((m) => {
                  const mobilityLabel: Record<string, { label: string; color: string }> = {
                    wheelchair: { label: "車椅子", color: "bg-red-50 text-red-700" },
                    walker: { label: "歩行器", color: "bg-amber-50 text-amber-700" },
                    cane: { label: "杖", color: "bg-blue-50 text-blue-700" },
                  };
                  const info = mobilityLabel[m.mobility] || { label: m.mobility, color: "bg-slate-50 text-slate-700" };
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                        {m.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-900">{m.name}（{m.age}歳）</p>
                        <p className="text-xs text-slate-500">{m.notes || m.address}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>
                        {info.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Routes */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <History size={18} className="text-violet-600" />
                最近のルート
              </h2>
              <button
                onClick={() => router.push("/routes")}
                className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-0.5 cursor-pointer"
              >
                すべて表示 <ChevronRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {allRoutes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition"
                  onClick={() => router.push(`/routes/${r.id}`)}
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Route size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-slate-900">{r.eventName}</p>
                    <p className="text-xs text-slate-500">{r.date} · {r.totalMembers}名 · {r.routes.length}台</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Clock size={12} />{r.routes.reduce((s, rt) => s + rt.estimatedTime, 0)}分</span>
                    <span className="flex items-center gap-1"><MapPin size={12} />{r.routes.reduce((s, rt) => s + rt.distance, 0).toFixed(1)}km</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
