"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Users,
  CalendarDays,
  History,
  Truck,
  LogOut,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";

interface User {
  name: string;
  role: string;
}

const nav = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard, roles: ["admin", "driver", "member"] },
  { href: "/route-planner", label: "ルート作成", icon: Route, roles: ["admin"] },
  { href: "/members", label: "檀家一覧", icon: Users, roles: ["admin"] },
  { href: "/events", label: "行事管理", icon: CalendarDays, roles: ["admin", "driver", "member"] },
  { href: "/routes", label: "ルート履歴", icon: History, roles: ["admin", "driver"] },
  { href: "/vehicles", label: "車両管理", icon: Truck, roles: ["admin"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pn-user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function logout() {
    localStorage.removeItem("pn-user");
    router.push("/login");
  }

  const filteredNav = nav.filter((item) => user && item.roles.includes(user.role));

  const roleLabel: Record<string, string> = {
    admin: "管理者",
    driver: "ドライバー",
    member: "檀家",
  };

  const roleColor: Record<string, string> = {
    admin: "bg-orange-100 text-orange-700",
    driver: "bg-blue-100 text-blue-700",
    member: "bg-emerald-100 text-emerald-700",
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <MapPin size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">送迎ナビ</h2>
            <p className="text-xs text-slate-400">真宗寺</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {filteredNav.map((item) => {
          const active = pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/routes");
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                active
                  ? "bg-orange-50 text-orange-700 font-semibold shadow-sm shadow-orange-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon size={20} className={active ? "text-orange-600" : "text-slate-400"} />
              <span className="text-[15px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role] || "bg-slate-100 text-slate-600"}`}>
                {roleLabel[user.role] || user.role}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl py-2.5 transition cursor-pointer"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      )}
    </aside>
  );
}
