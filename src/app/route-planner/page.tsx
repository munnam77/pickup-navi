"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { capacityAwareClustering, optimizeRoute, memberWalkingInfo, snapToNearestLocation } from "@/lib/routing";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Route,
  Users,
  Truck,
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Footprints,
} from "lucide-react";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });

interface GeneratedRoute {
  vehicleId: string;
  members: string[];
  pickupPoints: { name: string; lat: number; lng: number }[];
  estimatedTime: number;
  distance: number;
  walkingInfo: { id: string; name: string; distanceMeters: number; walkingMinutes: number; warning: boolean }[];
}

// Curated pickup locations from db.json (real landmarks)
const pickupLocations = db.pickupLocations || [];

export default function RoutePlannerPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 animate-pulse" />
          <p className="text-sm text-slate-400">読み込み中...</p>
        </div>
      </AppShell>
    }>
      <RoutePlannerContent />
    </Suspense>
  );
}

function RoutePlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("event");

  const [selectedEvent, setSelectedEvent] = useState(eventId || "");
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>(db.vehicles.map((v) => v.id));
  const [generated, setGenerated] = useState<GeneratedRoute[] | null>(null);
  const [showVehicles, setShowVehicles] = useState(false);
  const [saved, setSaved] = useState(false);

  const event = db.events.find((e) => e.id === selectedEvent);
  const attendees = event ? event.attendees.map((aid) => db.members.find((m) => m.id === aid)).filter(Boolean) : [];
  const activeVehicles = db.vehicles.filter((v) => selectedVehicles.includes(v.id));

  // Check wheelchair members need accessible vehicles
  const wheelchairMembers = attendees.filter((m) => m && m.mobility === "wheelchair");
  const hasAccessibleVehicle = activeVehicles.some((v) => v.wheelchairAccessible);

  // Determine current step for guided flow
  const currentStep = !selectedEvent ? 1 : !generated ? 2 : !saved ? 3 : 4;

  function generateRoutes() {
    if (!event || attendees.length === 0 || activeVehicles.length === 0) return;

    const points = attendees
      .filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined)
      .map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, name: m.name }));

    const vehicleCapacities = activeVehicles.map((v) => v.capacity);
    const clusters = capacityAwareClustering(points, vehicleCapacities);

    const accessibleVehicleIds = activeVehicles.filter((v) => v.wheelchairAccessible).map((v) => v.id);

    const usedLocationIds: string[] = [];
    const routes: GeneratedRoute[] = clusters.map((cluster, idx) => {
      const vehicleId = activeVehicles[idx]?.id || activeVehicles[0].id;
      const memberIds = cluster.points.map((p) => p.id);

      const snapped = snapToNearestLocation(cluster.centroid, pickupLocations, usedLocationIds);
      usedLocationIds.push(snapped.id);

      const pickupPoint = {
        name: snapped.name,
        lat: snapped.lat,
        lng: snapped.lng,
      };

      const routeResult = optimizeRoute(
        { lat: db.temple.lat, lng: db.temple.lng },
        [pickupPoint]
      );

      const memberDetails = cluster.points.map((p) => {
        const member = db.members.find((m) => m.id === p.id);
        return { id: p.id, lat: p.lat, lng: p.lng, name: member?.name || "", mobility: member?.mobility || "normal" };
      });
      const walkingInfo = memberWalkingInfo(memberDetails, pickupPoint);

      return {
        vehicleId,
        members: memberIds,
        pickupPoints: [pickupPoint],
        estimatedTime: routeResult.estimatedMinutes,
        distance: routeResult.totalDistance,
        walkingInfo,
      };
    });

    // Ensure wheelchair members are in accessible vehicles
    if (wheelchairMembers.length > 0 && accessibleVehicleIds.length > 0) {
      for (const wm of wheelchairMembers) {
        if (!wm) continue;
        const currentRoute = routes.find((r) => r.members.includes(wm.id));
        if (currentRoute && !accessibleVehicleIds.includes(currentRoute.vehicleId)) {
          const accessibleRoute = routes.find((r) => accessibleVehicleIds.includes(r.vehicleId));
          if (accessibleRoute) {
            currentRoute.members = currentRoute.members.filter((id) => id !== wm.id);
            currentRoute.walkingInfo = currentRoute.walkingInfo.filter((w) => w.id !== wm.id);
            accessibleRoute.members.push(wm.id);
            const wmData = db.members.find((m) => m.id === wm.id);
            if (wmData && accessibleRoute.pickupPoints[0]) {
              const wi = memberWalkingInfo([{ id: wmData.id, lat: wmData.lat, lng: wmData.lng, name: wmData.name, mobility: wmData.mobility }], accessibleRoute.pickupPoints[0]);
              accessibleRoute.walkingInfo.push(...wi);
            }
          }
        }
      }
    }

    setGenerated(routes);
    setSaved(false);
  }

  function saveRoute() {
    if (!generated || !event) return;
    const savedRoute = {
      id: `r-${Date.now()}`,
      eventId: event.id,
      eventName: event.name,
      date: event.date,
      routes: generated.map((rt) => ({
        vehicleId: rt.vehicleId,
        members: rt.members,
        pickupPoints: rt.pickupPoints,
        estimatedTime: rt.estimatedTime,
        distance: rt.distance,
        walkingInfo: rt.walkingInfo,
      })),
      totalMembers: generated.reduce((s, r) => s + r.members.length, 0),
      status: "active" as const,
    };
    const stored = JSON.parse(localStorage.getItem("pn-saved-routes") || "[]");
    const filtered = stored.filter((r: { eventId: string }) => r.eventId !== event.id);
    filtered.push(savedRoute);
    localStorage.setItem("pn-saved-routes", JSON.stringify(filtered));
    setSaved(true);
  }

  const totalWarnings = generated?.reduce((s, r) => s + r.walkingInfo.filter((w) => w.warning).length, 0) || 0;

  const mapRoutes = useMemo(() => {
    if (!generated) return [];
    return generated.map((rt, idx) => {
      const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
      return {
        ...rt,
        color: vehicle?.color || ["#3B82F6", "#8B5CF6", "#10B981"][idx],
        vehicleName: vehicle?.name || `車両${idx + 1}`,
        memberDetails: rt.members
          .map((mid) => db.members.find((m) => m.id === mid))
          .filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined),
      };
    });
  }, [generated]);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto animate-fadeIn">
        {/* Header with step indicator */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">ルート作成</h1>
          <p className="text-sm text-slate-500 mt-1">3つのステップで最適ルートを自動生成します</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-4">
            {[
              { num: 1, label: "行事を選択" },
              { num: 2, label: "ルート生成" },
              { num: 3, label: "確認・保存" },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  currentStep > step.num
                    ? "bg-emerald-500 text-white"
                    : currentStep === step.num
                    ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                    : "bg-slate-200 text-slate-500"
                }`}>
                  {currentStep > step.num ? <CheckCircle2 size={16} /> : step.num}
                </div>
                <span className={`text-sm font-medium hidden sm:inline ${
                  currentStep >= step.num ? "text-slate-900" : "text-slate-400"
                }`}>{step.label}</span>
                {step.num < 3 && <div className={`w-8 h-0.5 ${currentStep > step.num ? "bg-emerald-400" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Event Selection */}
            <div className={`bg-white rounded-xl border-2 p-4 transition-all ${
              currentStep === 1 ? "border-orange-300 shadow-md shadow-orange-50" : "border-slate-200"
            }`}>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">1</div>
                行事を選択
              </h3>
              <select
                value={selectedEvent}
                onChange={(e) => { setSelectedEvent(e.target.value); setGenerated(null); setSaved(false); }}
                className="w-full px-3 py-3 rounded-xl border border-slate-200 text-base bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              >
                <option value="">▼ 行事を選択してください</option>
                {db.events.filter((e) => e.status !== "completed").map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}（{e.date}・{e.attendees.length}名）
                  </option>
                ))}
              </select>

              {event && (
                <div className="mt-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <p className="text-sm text-orange-700 font-bold">{event.name}</p>
                  <p className="text-sm text-orange-600 mt-0.5">{event.date} {event.time} · {event.attendees.length}名参加</p>
                </div>
              )}
            </div>

            {/* Vehicle Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <button
                onClick={() => setShowVehicles(!showVehicles)}
                className="w-full flex items-center justify-between text-sm font-bold text-slate-900 cursor-pointer py-1"
              >
                <span className="flex items-center gap-2">
                  <Truck size={18} className="text-blue-600" />
                  使用車両（{selectedVehicles.length}台選択中）
                </span>
                {showVehicles ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {showVehicles && (
                <div className="mt-3 space-y-2">
                  {db.vehicles.map((v) => (
                    <label key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVehicles.includes(v.id)}
                        onChange={(e) => {
                          setSelectedVehicles((prev) =>
                            e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id)
                          );
                          setGenerated(null);
                        }}
                        className="accent-orange-600 w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{v.name}</p>
                        <p className="text-sm text-slate-500">{v.capacity}名 · {v.driver}{v.wheelchairAccessible ? " · ♿対応" : ""}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {event && activeVehicles.length > 0 && (() => {
                const totalCap = activeVehicles.reduce((s, v) => s + v.capacity, 0);
                const needed = attendees.length;
                if (totalCap < needed) {
                  return (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                      ⚠️ 定員不足: {totalCap}名分の座席に対して{needed}名の参加者
                    </div>
                  );
                }
                return null;
              })()}

              {wheelchairMembers.length > 0 && !hasAccessibleVehicle && (
                <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                  ⚠️ 車椅子の方がいますが、車椅子対応車両が未選択です
                </div>
              )}
            </div>

            {/* Attendee Summary */}
            {event && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Users size={18} className="text-emerald-600" />
                  参加者（{attendees.length}名）
                </h3>
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {attendees.map((m) => m && (
                    <div key={m.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-slate-50">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {m.name[0]}
                      </div>
                      <span className="text-slate-700 flex-1">{m.name}</span>
                      {m.mobility !== "normal" && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                          {m.mobility === "wheelchair" ? "♿車椅子" : m.mobility === "walker" ? "歩行器" : "杖"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={generateRoutes}
              disabled={!event || activeVehicles.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition cursor-pointer active:scale-[0.98] ${
                !event || activeVehicles.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-200"
              }`}
            >
              {generated ? <RotateCcw size={18} /> : <Play size={18} />}
              {generated ? "再生成する" : "最適ルートを生成する"}
            </button>

            {generated && !saved && (
              <button
                onClick={saveRoute}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer active:scale-[0.98]"
              >
                <CheckCircle2 size={18} />
                このルートを保存する
              </button>
            )}

            {saved && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-5 text-center">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-base font-bold text-emerald-700">ルートを保存しました</p>
                <button
                  onClick={() => router.push("/routes")}
                  className="text-sm text-emerald-600 hover:underline mt-2 cursor-pointer font-medium"
                >
                  ルート履歴を確認する →
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Map + Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-[350px] lg:h-[420px]">
                <RouteMap
                  temple={db.temple}
                  routes={mapRoutes}
                />
              </div>
            </div>

            {/* Generated Route Details */}
            {generated && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <Users size={18} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">{generated.reduce((s, r) => s + r.members.length, 0)}</p>
                    <p className="text-sm text-slate-500">乗車人数</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <Truck size={18} className="mx-auto text-emerald-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">{generated.length}</p>
                    <p className="text-sm text-slate-500">使用車両</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <Clock size={18} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-2xl font-bold text-slate-900">{generated.reduce((s, r) => Math.max(s, r.estimatedTime), 0)}</p>
                    <p className="text-sm text-slate-500">最長時間（分）</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                    <Footprints size={18} className={`mx-auto mb-1 ${totalWarnings > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                    <p className={`text-2xl font-bold ${totalWarnings > 0 ? "text-amber-600" : "text-slate-900"}`}>
                      {totalWarnings > 0 ? `${totalWarnings}名` : "OK"}
                    </p>
                    <p className="text-sm text-slate-500">{totalWarnings > 0 ? "徒歩注意" : "全員徒歩圏内"}</p>
                  </div>
                </div>

                {/* Per-Vehicle Detail */}
                {generated.map((rt, idx) => {
                  const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
                  const members = rt.members.map((mid) => db.members.find((m) => m.id === mid)).filter(Boolean);
                  const overCapacity = vehicle && rt.members.length > vehicle.capacity;

                  return (
                    <div key={rt.vehicleId} className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: (vehicle?.color || "#6B7280") + "18" }}
                        >
                          <Truck size={18} style={{ color: vehicle?.color || "#6B7280" }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-bold text-slate-900">
                            {vehicle?.name}
                            {overCapacity && (
                              <span className="ml-2 text-sm text-red-600 font-medium">⚠️ 定員超過</span>
                            )}
                          </p>
                          <p className="text-sm text-slate-500">
                            {rt.estimatedTime}分 · {rt.distance}km · {rt.members.length}/{vehicle?.capacity || "?"}名
                          </p>
                        </div>
                      </div>

                      {/* Pickup Point */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {rt.pickupPoints.map((pp, i) => (
                          <span key={i} className="text-sm px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1.5 font-medium">
                            <Navigation size={12} />{pp.name}
                          </span>
                        ))}
                      </div>

                      {/* Walking Distance Table */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-slate-600 mb-3 flex items-center gap-1.5">
                          <Footprints size={14} />
                          各檀家様の徒歩距離
                        </h4>
                        <div className="space-y-1.5">
                          {rt.walkingInfo.map((w) => {
                            const member = db.members.find((m) => m.id === w.id);
                            return (
                              <div key={w.id} className={`flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg ${w.warning ? "bg-amber-50 border border-amber-200" : ""}`}>
                                <span className="text-slate-700 flex-1 font-medium">{w.name}</span>
                                {member?.mobility !== "normal" && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                    {member?.mobility === "wheelchair" ? "♿" : member?.mobility === "walker" ? "🚶" : "🦯"}
                                  </span>
                                )}
                                <span className={`font-mono text-sm ${w.warning ? "text-amber-600 font-bold" : "text-slate-500"}`}>
                                  {w.distanceMeters}m
                                </span>
                                <span className={`text-sm ${w.warning ? "text-amber-600" : "text-slate-400"}`}>
                                  約{w.walkingMinutes}分
                                </span>
                                {w.warning && <AlertTriangle size={14} className="text-amber-500" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!generated && (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
                <Route size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-base font-medium text-slate-500">
                  {!selectedEvent
                    ? "まず左の「行事を選択」から行事を選んでください"
                    : "「最適ルートを生成する」ボタンを押してください"
                  }
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  檀家様の住所をもとに、最適な集合場所と走行ルートを自動計算します
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
