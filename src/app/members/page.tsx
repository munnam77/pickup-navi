"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { Users, Search, Phone, MapPin, Accessibility, Filter } from "lucide-react";
import { useState } from "react";

const mobilityLabels: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: "通常", color: "text-slate-600", bg: "bg-slate-100" },
  wheelchair: { label: "車椅子", color: "text-red-700", bg: "bg-red-50" },
  walker: { label: "歩行器", color: "text-amber-700", bg: "bg-amber-50" },
  cane: { label: "杖", color: "text-blue-700", bg: "bg-blue-50" },
};

export default function MembersPage() {
  const [search, setSearch] = useState("");
  const [mobilityFilter, setMobilityFilter] = useState<string>("all");

  const filtered = db.members.filter((m) => {
    const matchesSearch = m.name.includes(search) || m.address.includes(search) || m.phone.includes(search);
    const matchesMobility = mobilityFilter === "all" || m.mobility === mobilityFilter;
    return matchesSearch && matchesMobility;
  });

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto animate-fadeIn">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">檀家一覧</h1>
            <p className="text-sm text-slate-500">{db.members.length}名登録</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="名前・住所・電話番号で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-slate-400" />
            {["all", "wheelchair", "walker", "cane", "normal"].map((f) => (
              <button
                key={f}
                onClick={() => setMobilityFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full transition cursor-pointer ${
                  mobilityFilter === f
                    ? "bg-orange-100 text-orange-700 font-medium"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "all" ? "すべて" : mobilityLabels[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {/* Member List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">名前</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">年齢</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">住所</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">電話</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">移動能力</th>
                  <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">備考</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const mob = mobilityLabels[m.mobility] || mobilityLabels.normal;
                  return (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                            {m.name[0]}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{m.age}歳</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{m.address}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone size={13} className="text-slate-400" />
                          {m.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${mob.bg} ${mob.color}`}>
                          {mob.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{m.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              該当する檀家様が見つかりません
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
