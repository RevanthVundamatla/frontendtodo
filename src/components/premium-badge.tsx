import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "../lib/api";

interface PremiumStatusData {
  isPremium?: boolean;
  plan?: string | null;
  planName?: string | null;
  expiresAt?: string | null;
  premiumExpiresAt?: string | null;
  daysRemaining?: number | null;
  remainingFree?: number | null;
  totalTodos?: number | null;
}

const PLAN_LABELS: Record<string, string> = {
  monthly: "1 Month",
  quarterly: "3 Months",
  yearly: "1 Year",
};

function daysBetween(future: string): number {
  const ms = new Date(future).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function PremiumBadge({ enabled }: { enabled: boolean }) {
  const query = useQuery({
    queryKey: ["payment", "status"],
    queryFn: async () => {
      const response = await fetchApi("/payment/status");
      return (response?.data ?? response) as PremiumStatusData;
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  if (!enabled) return null;

  if (query.isLoading) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
        Loading plan...
      </span>
    );
  }

  if (query.isError || !query.data) {
    return null;
  }

  const data = query.data;

  if (!data.isPremium) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
        Free plan
      </span>
    );
  }

  const planKey = (data.plan || "").toLowerCase();
  const planLabel = data.planName || PLAN_LABELS[planKey] || "Premium";
  const expires = data.expiresAt || data.premiumExpiresAt;
  const days =
    typeof data.daysRemaining === "number"
      ? data.daysRemaining
      : expires
      ? daysBetween(expires)
      : null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-800 shadow-sm">
      <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">Premium</span>
      <span>{planLabel}</span>
      {days !== null && (
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-amber-900">
          {days} {days === 1 ? "day" : "days"} left
        </span>
      )}
    </span>
  );
}
