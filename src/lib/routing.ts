// K-means clustering for grouping members into vehicle-based pickup groups
// Nearest-neighbor TSP for route optimization within each cluster
// Capacity-aware clustering to respect vehicle seat limits

interface Point {
  id: string;
  lat: number;
  lng: number;
}

interface Cluster {
  centroid: { lat: number; lng: number };
  points: Point[];
}

export function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const a1 = sinLat * sinLat + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(a1), Math.sqrt(1 - a1));
}

// Walking distance in meters between two coordinates
export function walkingDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.round(distance(a, b) * 1000 * 1.3); // 1.3x multiplier for road vs straight-line
}

// Walking time in minutes (assumes 4 km/h walking speed for elderly)
export function walkingTimeMinutes(meters: number): number {
  return Math.round(meters / (4000 / 60)); // 4km/h = ~67m/min
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

// Capacity-aware clustering: respects vehicle seat limits
export function capacityAwareClustering(
  points: Point[],
  vehicleCapacities: number[]
): Cluster[] {
  const k = vehicleCapacities.length;
  let clusters = kMeansClustering(points, k);

  // Sort clusters by size (largest first) and capacities (largest first)
  const sortedCapacities = [...vehicleCapacities].sort((a, b) => b - a);
  clusters.sort((a, b) => b.points.length - a.points.length);

  // Rebalance: if any cluster exceeds its vehicle capacity, move excess to nearest under-capacity cluster
  for (let pass = 0; pass < 3; pass++) {
    let rebalanced = false;
    for (let i = 0; i < clusters.length; i++) {
      const cap = sortedCapacities[i] || sortedCapacities[sortedCapacities.length - 1];
      while (clusters[i].points.length > cap) {
        // Find the point farthest from centroid
        let farthestIdx = 0;
        let farthestDist = 0;
        for (let j = 0; j < clusters[i].points.length; j++) {
          const d = distance(clusters[i].points[j], clusters[i].centroid);
          if (d > farthestDist) {
            farthestDist = d;
            farthestIdx = j;
          }
        }
        const point = clusters[i].points.splice(farthestIdx, 1)[0];

        // Find nearest under-capacity cluster
        let bestCluster = -1;
        let bestDist = Infinity;
        for (let j = 0; j < clusters.length; j++) {
          if (j === i) continue;
          const jCap = sortedCapacities[j] || sortedCapacities[sortedCapacities.length - 1];
          if (clusters[j].points.length >= jCap) continue;
          const d = distance(point, clusters[j].centroid);
          if (d < bestDist) {
            bestDist = d;
            bestCluster = j;
          }
        }

        if (bestCluster >= 0) {
          clusters[bestCluster].points.push(point);
          rebalanced = true;
        } else {
          // No room anywhere — put it back
          clusters[i].points.push(point);
          break;
        }
      }
    }

    // Recalculate centroids after rebalance
    if (rebalanced) {
      for (const c of clusters) {
        if (c.points.length === 0) continue;
        c.centroid = {
          lat: c.points.reduce((s, p) => s + p.lat, 0) / c.points.length,
          lng: c.points.reduce((s, p) => s + p.lng, 0) / c.points.length,
        };
      }
    } else {
      break;
    }
  }

  return clusters.filter((c) => c.points.length > 0);
}

// Nearest-neighbor TSP: start from temple, visit only PICKUP POINTS, return to temple
// Does NOT visit member homes — members WALK to pickup points
export function optimizeRoute(
  start: { lat: number; lng: number },
  pickupPoints: { lat: number; lng: number; name?: string }[]
): { ordered: typeof pickupPoints; totalDistance: number; estimatedMinutes: number } {
  if (pickupPoints.length === 0) return { ordered: [], totalDistance: 0, estimatedMinutes: 0 };

  const remaining = [...pickupPoints];
  const ordered: typeof pickupPoints = [];
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

  // Add return to temple
  totalDist += distance(current, start);

  // Estimate time: avg 25 km/h in city + 5 min per stop (loading elderly passengers)
  const estimatedMinutes = Math.round((totalDist / 25) * 60 + ordered.length * 5);

  return { ordered, totalDistance: Math.round(totalDist * 10) / 10, estimatedMinutes };
}

// Snap a centroid to the nearest real pickup location
export function snapToNearestLocation(
  centroid: { lat: number; lng: number },
  locations: { id: string; name: string; lat: number; lng: number }[],
  usedLocationIds: string[] = []
): { id: string; name: string; lat: number; lng: number } {
  const available = locations.filter((l) => !usedLocationIds.includes(l.id));
  if (available.length === 0) return { id: "fallback", name: "集合場所", ...centroid };

  let best = available[0];
  let bestDist = distance(centroid, available[0]);
  for (let i = 1; i < available.length; i++) {
    const d = distance(centroid, available[i]);
    if (d < bestDist) {
      bestDist = d;
      best = available[i];
    }
  }
  return best;
}

// Mobility-aware walking distance thresholds (meters)
export const WALKING_THRESHOLDS: Record<string, number> = {
  wheelchair: 100,
  walker: 200,
  cane: 300,
  normal: 500,
};

// Calculate walking info for each member to their assigned pickup point
export function memberWalkingInfo(
  members: { id: string; lat: number; lng: number; name: string; mobility?: string }[],
  pickupPoint: { lat: number; lng: number }
): { id: string; name: string; distanceMeters: number; walkingMinutes: number; warning: boolean }[] {
  return members.map((m) => {
    const meters = walkingDistanceMeters(m, pickupPoint);
    const threshold = WALKING_THRESHOLDS[m.mobility || "normal"] || 500;
    return {
      id: m.id,
      name: m.name,
      distanceMeters: meters,
      walkingMinutes: walkingTimeMinutes(meters),
      warning: meters > threshold,
    };
  });
}
