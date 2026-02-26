// K-means clustering for grouping members into vehicle-based pickup groups
// Nearest-neighbor TSP for route optimization within each cluster

interface Point {
  id: string;
  lat: number;
  lng: number;
}

interface Cluster {
  centroid: { lat: number; lng: number };
  points: Point[];
}

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a1 = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
}

export function kMeansClustering(points: Point[], k: number, maxIter = 20): Cluster[] {
  if (points.length === 0) return [];
  if (k >= points.length) return points.map((p) => ({ centroid: { lat: p.lat, lng: p.lng }, points: [p] }));

  // Initialize centroids using k-means++ style: spread them out
  const centroids: { lat: number; lng: number }[] = [];
  centroids.push({ lat: points[0].lat, lng: points[0].lng });

  for (let i = 1; i < k; i++) {
    let maxDist = -1;
    let bestPoint = points[0];
    for (const p of points) {
      const minDist = Math.min(...centroids.map((c) => distance(p, c)));
      if (minDist > maxDist) {
        maxDist = minDist;
        bestPoint = p;
      }
    }
    centroids.push({ lat: bestPoint.lat, lng: bestPoint.lng });
  }

  let clusters: Cluster[] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    clusters = centroids.map((c) => ({ centroid: { ...c }, points: [] }));

    for (const p of points) {
      let minDist = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < centroids.length; i++) {
        const d = distance(p, centroids[i]);
        if (d < minDist) {
          minDist = d;
          bestIdx = i;
        }
      }
      clusters[bestIdx].points.push(p);
    }

    // Update centroids
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].points.length === 0) continue;
      const newLat = clusters[i].points.reduce((s, p) => s + p.lat, 0) / clusters[i].points.length;
      const newLng = clusters[i].points.reduce((s, p) => s + p.lng, 0) / clusters[i].points.length;
      if (Math.abs(newLat - centroids[i].lat) > 0.0001 || Math.abs(newLng - centroids[i].lng) > 0.0001) {
        converged = false;
      }
      centroids[i] = { lat: newLat, lng: newLng };
      clusters[i].centroid = { lat: newLat, lng: newLng };
    }

    if (converged) break;
  }

  return clusters.filter((c) => c.points.length > 0);
}

// Nearest-neighbor TSP: start from temple, visit all pickup points, return to temple
export function optimizeRoute(
  start: { lat: number; lng: number },
  points: { lat: number; lng: number; name?: string }[]
): { ordered: typeof points; totalDistance: number; estimatedMinutes: number } {
  if (points.length === 0) return { ordered: [], totalDistance: 0, estimatedMinutes: 0 };

  const remaining = [...points];
  const ordered: typeof points = [];
  let current = start;
  let totalDist = 0;

  while (remaining.length > 0) {
    let minDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < remaining.length; i++) {
      const d = distance(current, remaining[i]);
      if (d < minDist) {
        minDist = d;
        bestIdx = i;
      }
    }
    totalDist += minDist;
    current = remaining[bestIdx];
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }

  // Add return to start
  totalDist += distance(current, start);

  // Estimate time: avg 25 km/h in city + 3 min per stop
  const estimatedMinutes = Math.round((totalDist / 25) * 60 + ordered.length * 3);

  return { ordered, totalDistance: Math.round(totalDist * 10) / 10, estimatedMinutes };
}

// Generate optimal pickup points from clustered member addresses
export function generatePickupPoints(
  members: { id: string; lat: number; lng: number; name: string }[],
  numVehicles: number,
  temple: { lat: number; lng: number }
) {
  const clusters = kMeansClustering(members, numVehicles);

  return clusters.map((cluster, idx) => {
    const pickupPoint = {
      lat: cluster.centroid.lat,
      lng: cluster.centroid.lng,
      name: `集合ポイント${idx + 1}`,
    };

    const routeResult = optimizeRoute(temple, [pickupPoint]);

    return {
      clusterIndex: idx,
      members: cluster.points.map((p) => p.id),
      pickupPoint,
      estimatedTime: routeResult.estimatedMinutes,
      distance: routeResult.totalDistance,
    };
  });
}

export { distance };
