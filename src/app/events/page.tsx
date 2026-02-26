"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { CalendarDays, Users, Clock, CheckCircle2, AlertCircle, Route, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  upcoming: { label: "予定", color: "text-blue-700", bg: "bg-blue-50" },
  planned: { label: "計画中", color: "text-amber-700", bg: "bg-amber-50" },
  completed: { label: "完了", color: "text-emerald-700", bg: "bg-emerald-50" },
};

export default function EventsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = db.events.filter((e) => statusFilter === "all" || e.status === statusFilter);

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">行事管理</h1>
            <p className="text-sm text-slate-500 mt-1">{db.events.length}件の行事</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {["all", "upcoming", "planned", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`text-sm px-4 py-2 rounded-xl transition cursor-pointer ${
                statusFilter === f
                  ? "bg-orange-100 text-orange-700 font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "all" ? "すべて" : statusLabels[f]?.label || f}
            </button>
          ))}
        </div>

        {/* Event Cards */}
        <div className="space-y-4">
          {filtered.map((e) => {
            const st = statusLabels[e.status] || statusLabels.upcoming;
            const hasRoute = db.savedRoutes.some((r) => r.eventId === e.id);
            const savedRoute = db.savedRoutes.find((r) => r.eventId === e.id);

            return (
              <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                    <CalendarDays size={22} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900">{e.name}</h3>
                      <span className={`text-sm px-2.5 py-0.5 rounded-full font-medium ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                      <span className="text-sm px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {e.type}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={15} />{e.date} {e.time}</span>
                      <span className="flex items-center gap-1"><Users size={15} />{e.attendees.length}名参加</span>
                    </div>
                    {e.notes && <p className="text-sm text-slate-400 mt-1">{e.notes}</p>}
                  </div>
                  <div className="shrink-0">
                    {hasRoute ? (
                      <button
                        onClick={() => router.push(`/routes/${savedRoute?.id}`)}
                        className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition cursor-pointer font-semibold"
                      >
                        <CheckCircle2 size={15} />ルート確認 <ChevronRight size={14} />
                      </button>
                    ) : e.status !== "completed" ? (
                      <button
                        onClick={() => router.push(`/route-planner?event=${e.id}`)}
                        className="flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 px-4 py-2.5 rounded-xl hover:bg-orange-100 transition cursor-pointer font-semibold"
                      >
                        <Route size={15} />ルート作成
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-slate-400">
                        <AlertCircle size={15} />ルートなし
                      </span>
                    )}
                  </div>
                </div>

                {/* Attendee Preview */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    {e.attendees.slice(0, 8).map((aid) => {
                      const member = db.members.find((m) => m.id === aid);
                      return (
                        <div
                          key={aid}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 -ml-1 first:ml-0 border-2 border-white"
                          title={member?.name}
                        >
                          {member?.name?.[0] || "?"}
                        </div>
                      );
                    })}
                    {e.attendees.length > 8 && (
                      <span className="text-sm text-slate-400 ml-2">+{e.attendees.length - 8}名</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center bg-white rounded-xl border border-slate-200">
              <CalendarDays size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-base text-slate-400">該当する行事がありません</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
