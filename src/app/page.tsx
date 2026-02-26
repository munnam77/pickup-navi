"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const user = localStorage.getItem("pn-user");
    router.push(user ? "/dashboard" : "/login");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 animate-pulse" />
    </div>
  );
}
