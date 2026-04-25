import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "../lib/api";
import { useAuth } from "../lib/auth-context";

interface Plan {
  id: string;
  label: string;
  amount: number;
  amountFormatted: string;
  duration: number;
}

interface PlansResponse {
  plans: Plan[];
  features: { free: string[]; premium: string[] };
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.Razorpay));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reason?: string;
}

export function UpgradeModal({ open, onClose, onSuccess, reason }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<PlansResponse["features"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setInfo("");
    setLoading(true);
    fetchApi("/payment/plans")
      .then((response) => {
        const data: PlansResponse = response.data;
        setPlans(data.plans);
        setFeatures(data.features);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Could not load plans.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const startPayment = async (planId: string) => {
    setError("");
    setInfo("");
    setActivePlan(planId);
    try {
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        throw new Error("Could not load the secure payment window. Check your network and try again.");
      }

      let orderResponse: any;
      try {
        orderResponse = await fetchApi("/payment/create-order", {
          method: "POST",
          body: JSON.stringify({ plan: planId }),
        });
      } catch (e) {
        const apiError = e as Error & { status?: number };
        if (apiError.status === 401) {
          throw new Error("Your session expired. Please sign in again to continue.");
        }
        throw apiError;
      }

      if (!orderResponse?.success || !orderResponse?.data?.orderId) {
        throw new Error(orderResponse?.message || "Failed to create payment order.");
      }

      const order = orderResponse.data;

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "Todo List Premium",
        description: order.plan,
        prefill: {
          name: order.user?.name || user?.name,
          email: order.user?.email || user?.email,
        },
        theme: { color: "#10b981" },
        modal: {
          ondismiss: () => setActivePlan(null),
        },
        handler: async (response: any) => {
          try {
            await fetchApi("/payment/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planId,
              }),
            });
            setInfo("Premium activated! Enjoy unlimited todos.");
            queryClient.invalidateQueries({ queryKey: ["todos"] });
            setActivePlan(null);
            if (onSuccess) onSuccess();
            setTimeout(onClose, 1500);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setActivePlan(null);
          }
        },
      });

      rzp.on("payment.failed", (response: any) => {
        setError(response?.error?.description || "Payment failed. Please try again.");
        setActivePlan(null);
      });

      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setActivePlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/60 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/70 bg-white p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 rounded-full border border-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
        >
          Close
        </button>

        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Upgrade</p>
        <h2 className="mt-2 text-3xl font-black text-emerald-950">Unlock unlimited tasks</h2>
        {reason && <p className="mt-2 text-emerald-900/75">{reason}</p>}

        {features && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-800">Free includes</h3>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900/80">
                {features.free.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-800">Premium adds</h3>
              <ul className="mt-3 space-y-2 text-sm text-amber-900/85">
                {features.premium.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {loading && plans.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm font-semibold text-emerald-800">
              Loading plans...
            </div>
          ) : (
            plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={!!activePlan}
                onClick={() => startPayment(plan.id)}
                className="group flex flex-col rounded-2xl border border-emerald-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{plan.label}</span>
                <span className="mt-3 text-3xl font-black text-emerald-950">{plan.amountFormatted}</span>
                <span className="mt-1 text-xs text-emerald-900/70">{plan.duration} days of premium</span>
                <span className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm group-hover:-translate-y-0.5">
                  {activePlan === plan.id ? "Opening checkout..." : "Choose plan"}
                </span>
              </button>
            ))
          )}
        </div>

        {info && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            {info}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <p className="mt-5 text-xs text-emerald-900/55">
          Payments are processed securely by Razorpay. Your premium plan activates as soon as the payment succeeds.
        </p>
      </div>
    </div>
  );
}
