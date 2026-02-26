export const DEMO_DATE = "2026-02-26";

export function formatDemoDate(): string {
  const d = new Date(DEMO_DATE + "T00:00:00");
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
}

export function getDemoNow(): Date {
  return new Date(DEMO_DATE + "T11:00:00");
}
