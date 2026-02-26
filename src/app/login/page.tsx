"use client";
import { useRouter } from "next/navigation";
import { MapPin, Truck, Shield } from "lucide-react";

const roles = [
  { id: "admin", label: "管理者", sublabel: "住職・事務局", icon: Shield, color: "from-orange-500 to-red-600", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { id: "driver", label: "ドライバー", sublabel: "運転担当", icon: Truck, color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { id: "member", label: "檀家様", sublabel: "利用者", icon: MapPin, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
];

export default function LoginPage() {
  const router = useRouter();

  function login(role: string) {
    const users: Record<string, { name: string; role: string }> = {
      admin: { name: "佐瀬住職", role: "admin" },
      driver: { name: "鳥居運転手", role: "driver" },
      member: { name: "田中花子", role: "member" },
    };
    localStorage.setItem("pn-user", JSON.stringify(users[role]));
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-50 p-4">
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-200 mb-4">
            <MapPin size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">送迎ナビ</h1>
          <p className="text-sm text-slate-500 mt-1">お寺の送迎ルート最適化システム</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => login(r.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border ${r.border} ${r.bg} hover:shadow-md transition-all duration-200 group cursor-pointer`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                <r.icon size={22} className="text-white" />
              </div>
              <div className="text-left flex-1">
                <p className={`font-semibold ${r.text}`}>{r.label}</p>
                <p className="text-xs text-slate-500">{r.sublabel}</p>
              </div>
              <span className="text-xs text-slate-400 group-hover:text-slate-600 transition">ログイン →</span>
            </button>
          ))}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          デモ環境 — ワンクリックでログイン
        </p>
      </div>
    </div>
  );
}
