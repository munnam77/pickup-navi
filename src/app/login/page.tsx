"use client";
import { useRouter } from "next/navigation";
import { MapPin, Truck, Shield, UserCircle } from "lucide-react";

const roles = [
  { id: "admin", label: "管理者としてログイン", sublabel: "住職・事務局 — 全機能をご利用いただけます", icon: Shield, color: "from-orange-500 to-red-600", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { id: "driver", label: "ドライバーとしてログイン", sublabel: "運転担当 — ルート確認・ナビ利用", icon: Truck, color: "from-blue-500 to-indigo-600", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { id: "member", label: "檀家様としてログイン", sublabel: "利用者 — 集合場所の確認", icon: UserCircle, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
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
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-200 mb-4">
            <MapPin size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">送迎ナビ</h1>
          <p className="text-base text-slate-500 mt-2">お寺の送迎ルート最適化システム</p>
        </div>

        {/* Role Cards */}
        <div className="space-y-4">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => login(r.id)}
              className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 ${r.border} ${r.bg} hover:shadow-lg transition-all duration-200 group cursor-pointer active:scale-[0.98]`}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform shrink-0`}>
                <r.icon size={26} className="text-white" />
              </div>
              <div className="text-left flex-1">
                <p className={`font-bold text-base ${r.text}`}>{r.label}</p>
                <p className="text-sm text-slate-500 mt-0.5">{r.sublabel}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          デモ環境 — タップしてログイン
        </p>
      </div>
    </div>
  );
}
