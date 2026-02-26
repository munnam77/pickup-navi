"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { Truck, Users, CheckCircle2, XCircle } from "lucide-react";

export default function VehiclesPage() {
  return (
    <AppShell>
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">車両管理</h1>
          <p className="text-sm text-slate-500 mt-1">{db.vehicles.length}台登録</p>
        </div>

        <div className="grid gap-4">
          {db.vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: v.color + "18" }}
                >
                  <Truck size={26} style={{ color: v.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900">{v.name}</h3>
                  <p className="text-sm text-slate-500">ドライバー: {v.driver}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-slate-900">{v.capacity}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-0.5 justify-center"><Users size={13} />定員</p>
                  </div>
                  <div className="text-center">
                    {v.wheelchairAccessible ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 size={28} className="text-emerald-500" />
                        <p className="text-sm text-emerald-600 mt-0.5 font-medium">車椅子対応</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <XCircle size={28} className="text-slate-300" />
                        <p className="text-sm text-slate-400 mt-0.5">非対応</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
