"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { Users, Search, Phone, MapPin, Filter } from "lucide-react";
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
            <h1 className="text-2xl font-bold text-slate-900">檀家一覧</h1>
            <p className="text-sm text-slate-500 mt-1">{db.members.length}名登録</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="名前・住所・電話番号で検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={16} className="text-slate-400 shrink-0" />
            {["all", "wheelchair", "walker", "cane", "normal"].map((f) => (
              <button
                key={f}
                onClick={() => setMobilityFilter(f)}
                className={`text-sm px-3 py-2 rounded-xl transition cursor-pointer ${
                  mobilityFilter === f
                    ? "bg-orange-100 text-orange-700 font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f === "all" ? "すべて" : mobilityLabels[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-2 lg:hidden">
          {filtered.map((m) => {
            const mob = mobilityLabels[m.mobility] || mobilityLabels.normal;
            return (
              <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base text-slate-900">{m.name}</p>
                      <span className="text-sm text-slate-500">({m.age}歳)</span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{m.address}</p>
                  </div>
                  <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${mob.bg} ${mob.color} shrink-0`}>
                    {mob.label}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 text-sm text-blue-600 font-medium">
                    <Phone size={14} />{m.phone}
                  </a>
                  {m.notes && <span className="text-sm text-slate-400 truncate ml-2">{m.notes}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hidden lg:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left text-sm font-semibold text-slate-600 px-4 py-3">名前</th>
                  <th className="text-left text-sm font-semibold text-slate-600 px-4 py-3">年齢</th>
                  <th className="text-left text-sm font-semibold text-slate-600 px-4 py-3">住所</th>
                  <th className="text-left text-sm font-semibold text-slate-600 px-4 py-3">電話</th>
                  <th className="text-left text-sm font-semibold text-slate-600 px-4 py-3">移動能力</th>
                  <th className="text-left text-sm font-semibold text-slate-600 px-4 py-3">備考</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const mob = mobilityLabels[m.mobility] || mobilityLabels.normal;
                  return (
                    <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                            {m.name[0]}
                          </div>
                          <span className="text-sm font-semibold text-slate-900">{m.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{m.age}歳</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[220px]">{m.address}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                          <Phone size={14} />
                          {m.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${mob.bg} ${mob.color}`}>
                          {mob.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-[150px] truncate">{m.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Users size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="text-base text-slate-400">該当する檀家様が見つかりません</p>
            {search && (
              <button onClick={() => setSearch("")} className="text-sm text-orange-600 hover:underline mt-2 cursor-pointer">
                検索をクリアする
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
