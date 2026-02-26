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
} from "lucide-react";
import { useRouter } from "next/navigation";

const upcomingEvents = db.events.filter((e) => e.status === "upcoming" || e.status === "planned");
const completedRoutes = db.savedRoutes.filter((r) => r.status === "completed");
const mobilityMembers = db.members.filter((m) => m.mobility !== "normal");

export default function DashboardPage() {
  const router = useRouter();

  const stats = [
    { label: "登録檀家数", value: db.members.length, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "今後の行事", value: upcomingEvents.length, icon: CalendarDays, color: "text-orange-600 bg-orange-50" },
    { label: "車両台数", value: db.vehicles.length, icon: Truck, color: "text-emerald-600 bg-emerald-50" },
    { label: "作成済ルート", value: completedRoutes.length, icon: Route, color: "text-violet-600 bg-violet-50" },
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
                const hasRoute = db.savedRoutes.some((r) => r.eventId === e.id);
                return (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <CalendarDays size={18} className="text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.date} {e.time} · {e.attendees.length}名</p>
                    </div>
                    {hasRoute ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} />ルート済
                      </span>
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

          {/* Mobility Alerts */}
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
              {completedRoutes.map((r) => (
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

function History(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
    </svg>
  );
}
