"use client";
import AppShell from "@/components/AppShell";
import db from "@/data/db.json";
import { capacityAwareClustering, optimizeRoute, distance, memberWalkingInfo } from "@/lib/routing";
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

// Nearby landmark names for generated pickup points
const landmarkNames = [
  "駅前ロータリー", "区役所前", "公園北口", "交差点角", "バス停前",
  "商店街入口", "郵便局前", "コンビニ駐車場", "病院正門前", "スーパー前",
  "図書館前", "小学校前", "神社前", "銀行前", "薬局前",
  "ガソリンスタンド前", "歩道橋下", "交番前", "消防署前", "マンション前",
];

export default function RoutePlannerPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 animate-pulse" />
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

  function generateRoutes() {
    if (!event || attendees.length === 0 || activeVehicles.length === 0) return;

    const points = attendees
      .filter((m): m is NonNullable<typeof m> => m !== null && m !== undefined)
      .map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, name: m.name }));

    // Capacity-aware clustering: respects vehicle seat limits
    const vehicleCapacities = activeVehicles.map((v) => v.capacity);
    const clusters = capacityAwareClustering(points, vehicleCapacities);

    // If wheelchair members exist, ensure they go to accessible vehicles
    const accessibleVehicleIds = activeVehicles.filter((v) => v.wheelchairAccessible).map((v) => v.id);

    const routes: GeneratedRoute[] = clusters.map((cluster, idx) => {
      const vehicleId = activeVehicles[idx]?.id || activeVehicles[0].id;
      const memberIds = cluster.points.map((p) => p.id);

      // Generate pickup point name
      const pickupName = landmarkNames[idx % landmarkNames.length];

      const pickupPoint = {
        name: pickupName,
        lat: cluster.centroid.lat,
        lng: cluster.centroid.lng,
      };

      // Optimize route: temple -> pickup points ONLY -> return to temple
      // Vehicle does NOT visit member homes — members WALK to pickup points
      const routeResult = optimizeRoute(
        { lat: db.temple.lat, lng: db.temple.lng },
        [pickupPoint]
      );

      // Calculate walking distance for each member to their pickup point
      const memberDetails = cluster.points.map((p) => {
        const member = db.members.find((m) => m.id === p.id);
        return { id: p.id, lat: p.lat, lng: p.lng, name: member?.name || "" };
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
            // Recalculate walking info for moved member
            const wmData = db.members.find((m) => m.id === wm.id);
            if (wmData && accessibleRoute.pickupPoints[0]) {
              const wi = memberWalkingInfo([{ id: wmData.id, lat: wmData.lat, lng: wmData.lng, name: wmData.name }], accessibleRoute.pickupPoints[0]);
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
    setSaved(true);
  }

  // Total warnings across all routes
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
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">ルート作成</h1>
          <p className="text-sm text-slate-500">行事を選択し、車両を割り当てて最適ルートを自動生成</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Event Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Route size={16} className="text-orange-600" />
                行事を選択
              </h3>
              <select
                value={selectedEvent}
                onChange={(e) => { setSelectedEvent(e.target.value); setGenerated(null); setSaved(false); }}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              >
                <option value="">行事を選択してください</option>
                {db.events.filter((e) => e.status !== "completed").map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}（{e.date}・{e.attendees.length}名）
                  </option>
                ))}
              </select>

              {event && (
                <div className="mt-3 p-3 rounded-lg bg-orange-50">
                  <p className="text-xs text-orange-700 font-medium">{event.name}</p>
                  <p className="text-xs text-orange-600 mt-0.5">{event.date} {event.time} · {event.attendees.length}名参加</p>
                </div>
              )}
            </div>

            {/* Vehicle Selection */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <button
                onClick={() => setShowVehicles(!showVehicles)}
                className="w-full flex items-center justify-between text-sm font-semibold text-slate-900 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Truck size={16} className="text-blue-600" />
                  使用車両（{selectedVehicles.length}台）
                </span>
                {showVehicles ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showVehicles && (
                <div className="mt-3 space-y-2">
                  {db.vehicles.map((v) => (
                    <label key={v.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVehicles.includes(v.id)}
                        onChange={(e) => {
                          setSelectedVehicles((prev) =>
                            e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id)
                          );
                          setGenerated(null);
                        }}
                        className="accent-orange-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{v.name}</p>
                        <p className="text-xs text-slate-500">{v.capacity}名 · {v.driver}{v.wheelchairAccessible ? " · ♿対応" : ""}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Capacity warning */}
              {event && activeVehicles.length > 0 && (
                <div className="mt-2">
                  {(() => {
                    const totalCap = activeVehicles.reduce((s, v) => s + v.capacity, 0);
                    const needed = attendees.length;
                    if (totalCap < needed) {
                      return (
                        <div className="p-2 rounded-lg bg-red-50 text-xs text-red-700">
                          ⚠️ 定員不足: {totalCap}名分の座席に対して{needed}名の参加者がいます
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {wheelchairMembers.length > 0 && !hasAccessibleVehicle && (
                <div className="mt-2 p-2 rounded-lg bg-red-50 text-xs text-red-700">
                  ⚠️ 車椅子の檀家様がいますが、車椅子対応車両が選択されていません
                </div>
              )}
            </div>

            {/* Attendee Summary */}
            {event && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  参加者（{attendees.length}名）
                </h3>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {attendees.map((m) => m && (
                    <div key={m.id} className="flex items-center gap-2 text-xs py-1">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {m.name[0]}
                      </div>
                      <span className="text-slate-700 flex-1">{m.name}</span>
                      {m.mobility !== "normal" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          {m.mobility === "wheelchair" ? "♿" : m.mobility === "walker" ? "🚶" : "🦯"}
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
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${
                !event || activeVehicles.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-lg hover:shadow-orange-200"
              }`}
            >
              {generated ? <RotateCcw size={16} /> : <Play size={16} />}
              {generated ? "再生成" : "最適ルート生成"}
            </button>

            {generated && !saved && (
              <button
                onClick={saveRoute}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                <CheckCircle2 size={16} />
                このルートを保存
              </button>
            )}

            {saved && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" />
                <p className="text-sm font-medium text-emerald-700">ルートを保存しました</p>
                <button
                  onClick={() => router.push("/routes")}
                  className="text-xs text-emerald-600 hover:underline mt-1 cursor-pointer"
                >
                  ルート履歴を確認 →
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Map + Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="h-[420px]">
                <RouteMap
                  temple={db.temple}
                  routes={mapRoutes}
                />
              </div>
            </div>

            {/* Generated Route Details */}
            {generated && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <Users size={16} className="mx-auto text-blue-500 mb-1" />
                    <p className="text-lg font-bold text-slate-900">{generated.reduce((s, r) => s + r.members.length, 0)}</p>
                    <p className="text-[11px] text-slate-500">乗車人数</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <Truck size={16} className="mx-auto text-emerald-500 mb-1" />
                    <p className="text-lg font-bold text-slate-900">{generated.length}</p>
                    <p className="text-[11px] text-slate-500">使用車両</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <Clock size={16} className="mx-auto text-orange-500 mb-1" />
                    <p className="text-lg font-bold text-slate-900">{generated.reduce((s, r) => Math.max(s, r.estimatedTime), 0)}</p>
                    <p className="text-[11px] text-slate-500">最長時間（分）</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <Footprints size={16} className={`mx-auto mb-1 ${totalWarnings > 0 ? "text-amber-500" : "text-emerald-500"}`} />
                    <p className={`text-lg font-bold ${totalWarnings > 0 ? "text-amber-600" : "text-slate-900"}`}>
                      {totalWarnings > 0 ? `${totalWarnings}名` : "OK"}
                    </p>
                    <p className="text-[11px] text-slate-500">{totalWarnings > 0 ? "500m超の方" : "全員徒歩圏内"}</p>
                  </div>
                </div>

                {/* Per-Vehicle Detail */}
                {generated.map((rt, idx) => {
                  const vehicle = db.vehicles.find((v) => v.id === rt.vehicleId);
                  const members = rt.members.map((mid) => db.members.find((m) => m.id === mid)).filter(Boolean);
                  const overCapacity = vehicle && rt.members.length > vehicle.capacity;

                  return (
                    <div key={rt.vehicleId} className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: (vehicle?.color || "#6B7280") + "18" }}
                        >
                          <Truck size={16} style={{ color: vehicle?.color || "#6B7280" }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {vehicle?.name}
                            {overCapacity && (
                              <span className="ml-2 text-xs text-red-600 font-normal">⚠️ 定員超過</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {rt.estimatedTime}分 · {rt.distance}km · {rt.members.length}/{vehicle?.capacity || "?"}名
                          </p>
                        </div>
                      </div>

                      {/* Pickup Point */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {rt.pickupPoints.map((pp, i) => (
                          <span key={i} className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                            <Navigation size={10} />{pp.name}
                          </span>
                        ))}
                      </div>

                      {/* Walking Distance Table */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <h4 className="text-[11px] font-medium text-slate-500 mb-2 flex items-center gap-1">
                          <Footprints size={12} />
                          各檀家様の徒歩距離
                        </h4>
                        <div className="space-y-1">
                          {rt.walkingInfo.map((w) => {
                            const member = db.members.find((m) => m.id === w.id);
                            return (
                              <div key={w.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${w.warning ? "bg-amber-50" : ""}`}>
                                <span className="text-slate-700 flex-1">{w.name}</span>
                                {member?.mobility !== "normal" && (
                                  <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700">
                                    {member?.mobility === "wheelchair" ? "♿" : member?.mobility === "walker" ? "🚶" : "🦯"}
                                  </span>
                                )}
                                <span className={`font-mono ${w.warning ? "text-amber-600 font-medium" : "text-slate-500"}`}>
                                  {w.distanceMeters}m
                                </span>
                                <span className={`${w.warning ? "text-amber-600" : "text-slate-400"}`}>
                                  約{w.walkingMinutes}分
                                </span>
                                {w.warning && <AlertTriangle size={12} className="text-amber-500" />}
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
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Route size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">行事と車両を選択し、「最適ルート生成」ボタンを押してください</p>
                <p className="text-xs text-slate-400 mt-1">K-meansクラスタリング + 巡回セールスマン問題で最適化します</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
