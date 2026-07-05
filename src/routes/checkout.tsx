import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ArrowLeft, ChevronRight, MapPin, Wallet, Smartphone, Truck, Check,
  BadgeCheck, Loader2, Copy, Phone,
} from "lucide-react";
import { COUPONS, DELIVERY_FEE, ETB, resolveImg } from "@/lib/catalog";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createOrder, getProductBySlug } from "@/lib/marketplace.functions";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  productId: fallback(z.string(), "yirgacheffe-grade-a").default("yirgacheffe-grade-a"),
  qty: fallback(z.number().int().min(1).max(99), 1).default(1),
  coupon: z.string().optional(),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Checkout — ADDIX" },
      { name: "description", content: "Complete your purchase with Chapa, Telebirr or Cash on Delivery." },
    ],
  }),
  component: CheckoutPage,
});

type Method = "chapa" | "telebirr" | "cod";
type Step = "review" | "pay" | "confirmed";

function CheckoutPage() {
  const { productId, qty, coupon } = Route.useSearch();
  const navigate = useNavigate();
  const fetchProduct = useServerFn(getProductBySlug);
  const createOrderFn = useServerFn(createOrder);
  const { data: p } = useQuery({ queryKey: ["product", productId], queryFn: () => fetchProduct({ data: { slug: productId } }) });
  const seller = (p as any)?.sellers;

  const [step, setStep] = useState<Step>("review");
  const [method, setMethod] = useState<Method>("telebirr");
  const [processing, setProcessing] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [address, setAddress] = useState({ name: "Rahel Bekele", phone: "+251 91 234 5678", area: "Bole, Addis Ababa" });
  const orderId = useMemo(() => "ADX-" + Math.floor(1000 + Math.random() * 9000), []);

  useEffect(() => {
    // prompt sign-in
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
    });
  }, [navigate]);

  if (!p || !seller) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <Loader2 className="size-6 animate-spin text-heritage-gold" />
      </div>
    );
  }
  const product = { ...p, img: resolveImg(p.img, p.category), price: Number(p.price) };

  const subtotal = product.price * qty;
  const appliedCoupon = coupon && COUPONS[coupon] ? coupon : null;
  const discount = appliedCoupon
    ? COUPONS[appliedCoupon].type === "percent"
      ? Math.round((subtotal * COUPONS[appliedCoupon].value) / 100)
      : COUPONS[appliedCoupon].value
    : 0;
  const delivery = appliedCoupon === "FREESHIP" ? 0 : DELIVERY_FEE;
  const total = Math.max(0, subtotal - discount) + delivery;

  const pay = async () => {
    setProcessing(true);
    setConfirmError(null);
    try {
      const res = await createOrderFn({
        data: {
          items: [{ productId: product.id, quantity: qty }],
          paymentMethod: method,
          couponCode: appliedCoupon,
          address: `${address.name}, ${address.area}`,
          city: "Addis Ababa",
          phone: address.phone,
        },
      });
      setConfirmedOrderId(res.orderId);
      setStep("confirmed");
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-soft-clay pb-32">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (step === "review" ? navigate({ to: "/" }) : setStep("review"))}
            className="size-9 grid place-items-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </button>
          <h1 className="font-display text-lg">
            {step === "confirmed" ? "Order Confirmed" : "Checkout"}
          </h1>
        </div>
        <Stepper step={step} />
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        {step === "confirmed" ? (
          <Confirmation orderId={confirmedOrderId ?? orderId} method={method} total={total} address={address} product={product} sellerName={seller.name} />
        ) : (
          <>
            {/* Item summary */}
            <section className="bg-card border border-border rounded-2xl p-3 shadow-sm flex gap-3">
              <img src={product.img} alt={product.name} className="size-16 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider truncate">{seller.name}</p>
                  {seller.verified && <BadgeCheck className="size-3 text-heritage-gold shrink-0" />}
                </div>
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <p className="text-xs text-muted-foreground">Qty {qty}</p>
              </div>
              <p className="font-display font-bold text-heritage-gold text-sm">{ETB(subtotal)}</p>
            </section>

            {/* Delivery address */}
            <section className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-3">
                <MapPin className="size-3.5 text-heritage-red" />
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Deliver to</p>
              </div>
              <div className="space-y-2">
                <input
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  value={address.area}
                  onChange={(e) => setAddress({ ...address, area: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </section>

            {/* Payment method */}
            <section className="mt-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2 px-1">Payment method</p>
              <div className="space-y-2">
                <MethodCard active={method === "telebirr"} onClick={() => setMethod("telebirr")} icon={Smartphone} title="Telebirr" desc="Pay from your Telebirr wallet" tag="Instant" />
                <MethodCard active={method === "chapa"} onClick={() => setMethod("chapa")} icon={Wallet} title="Chapa" desc="Card, bank transfer, mobile money" tag="Secure" />
                <MethodCard active={method === "cod"} onClick={() => setMethod("cod")} icon={Truck} title="Cash on Delivery" desc="Pay the courier in cash" tag="+60 ETB" />
              </div>
            </section>

            {/* Breakdown */}
            <section className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-sm text-sm space-y-2">
              <Row label={`Subtotal (${qty}×)`} value={ETB(subtotal)} />
              {discount > 0 && <Row label={`Coupon ${appliedCoupon}`} value={`− ${ETB(discount)}`} accent />}
              <Row label="Delivery" value={delivery === 0 ? "Free" : ETB(delivery)} />
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-display text-lg font-bold">
                <span>Total</span>
                <span className="text-heritage-gold">{ETB(total)}</span>
              </div>
            </section>

            {step === "pay" && (method === "chapa" || method === "telebirr") && (
              <section className="mt-4 bg-ethio-charcoal text-soft-clay rounded-2xl p-5 shadow-lg">
                <p className="text-[10px] uppercase tracking-widest opacity-60 font-semibold mb-2">
                  {method === "telebirr" ? "Telebirr" : "Chapa"} — awaiting payment
                </p>
                <p className="font-display text-2xl font-bold text-heritage-gold">{ETB(total)}</p>
                <div className="mt-4 flex items-center justify-between bg-soft-clay/10 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-[10px] opacity-60 uppercase tracking-widest">Reference</p>
                    <p className="text-sm font-mono">{orderId}</p>
                  </div>
                  <button className="size-8 grid place-items-center rounded-lg bg-soft-clay/10" aria-label="Copy">
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <p className="text-[11px] opacity-60 mt-3">
                  {method === "telebirr"
                    ? "Confirm the prompt on your Telebirr app to complete payment."
                    : "You'll be redirected to Chapa's secure checkout."}
                </p>
              </section>
            )}

            {confirmError && (
              <p className="mt-3 text-xs text-heritage-red text-center">{confirmError}</p>
            )}
          </>
        )}
      </main>

      {step !== "confirmed" && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-xl border-t border-border z-40">
          <div className="mx-auto max-w-md px-4 py-3 pb-5 flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Total</p>
              <p className="font-display text-lg font-bold text-heritage-gold leading-none">{ETB(total)}</p>
            </div>
            <button
              onClick={() => (step === "review" ? setStep("pay") : pay())}
              disabled={processing}
              className="ml-auto h-11 px-6 rounded-full bg-heritage-red text-soft-clay text-sm font-bold flex items-center gap-2 disabled:opacity-70"
            >
              {processing ? (
                <><Loader2 className="size-4 animate-spin" /> Processing…</>
              ) : step === "review" ? (
                <>Continue <ChevronRight className="size-4" /></>
              ) : method === "cod" ? (
                <>Confirm order <Check className="size-4" /></>
              ) : (
                <>Pay now <Check className="size-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "review", label: "Review" },
    { key: "pay", label: "Payment" },
    { key: "confirmed", label: "Tracking" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="mx-auto max-w-md px-4 pb-3 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1">
          <div className={`size-6 rounded-full grid place-items-center text-[10px] font-bold ${
            i <= idx ? "bg-heritage-red text-soft-clay" : "bg-muted text-muted-foreground"
          }`}>
            {i < idx ? <Check className="size-3" /> : i + 1}
          </div>
          <span className={`text-[11px] font-semibold ${i <= idx ? "text-ethio-charcoal" : "text-muted-foreground"}`}>{s.label}</span>
          {i < steps.length - 1 && <div className={`flex-1 h-px ${i < idx ? "bg-heritage-red" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );
}

function MethodCard({
  active, onClick, icon: Icon, title, desc, tag,
}: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; tag: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition text-left ${
        active ? "border-heritage-red bg-heritage-red/5 ring-2 ring-heritage-red/20" : "border-border bg-card"
      }`}
    >
      <div className={`size-10 rounded-xl grid place-items-center ${active ? "bg-heritage-red text-soft-clay" : "bg-muted"}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
        active ? "bg-heritage-red text-soft-clay" : "bg-muted text-muted-foreground"
      }`}>{tag}</span>
    </button>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={accent ? "text-heritage-green font-semibold" : "font-semibold"}>{value}</span>
    </div>
  );
}

function Confirmation({
  orderId, method, total, address, product, sellerName,
}: {
  orderId: string; method: Method; total: number;
  address: { name: string; phone: string; area: string };
  product: { name: string; img: string };
  sellerName: string;
}) {
  const stages = [
    { label: "Payment confirmed", done: true, time: "Just now" },
    { label: `${sellerName} is preparing your order`, done: true, time: "In minutes" },
    { label: "Courier assigned & GPS live", done: true, time: "Est. 8 min" },
    { label: "Out for delivery", done: false, time: "Est. 14 min" },
    { label: "Delivered — signature required", done: false, time: "Est. 22 min" },
  ];
  return (
    <div>
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm text-center">
        <div className="mx-auto size-14 rounded-full bg-heritage-green/10 grid place-items-center mb-3">
          <Check className="size-6 text-heritage-green" strokeWidth={3} />
        </div>
        <h2 className="font-display text-xl">
          {method === "cod" ? "Order placed" : "Payment received"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {method === "cod"
            ? "Pay the courier in cash on delivery."
            : method === "telebirr"
            ? "Telebirr payment confirmed."
            : "Chapa payment confirmed."}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-left">
          <Info label="Order" value={`#${orderId}`} />
          <Info label="Total" value={ETB(total)} />
          <Info label="Deliver to" value={address.area} />
          <Info label="Phone" value={address.phone} />
        </div>
      </div>

      {/* Tracking timeline */}
      <section className="mt-4 bg-ethio-charcoal text-soft-clay rounded-3xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 text-heritage-gold text-[10px] uppercase tracking-widest font-semibold">
            <MapPin className="size-3" /> Live tracking
          </div>
          <span className="text-[10px] px-2 py-1 rounded-full bg-soft-clay/10 border border-soft-clay/10 font-semibold">
            ETA 14 min
          </span>
        </div>
        <ol className="space-y-4 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-soft-clay/15">
          {stages.map((s) => (
            <li key={s.label} className="relative pl-7">
              <span className={`absolute left-0 top-0.5 size-[18px] rounded-full grid place-items-center ${
                s.done ? "bg-heritage-green" : "bg-soft-clay/10 border border-soft-clay/20"
              }`}>
                {s.done && <Check className="size-2.5 text-soft-clay" strokeWidth={3} />}
              </span>
              <p className={`text-sm ${s.done ? "font-semibold" : "text-soft-clay/60"}`}>{s.label}</p>
              <p className="text-[10px] text-soft-clay/50 mt-0.5">{s.time}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={`tel:${address.phone.replace(/\s/g, "")}`} className="h-11 rounded-full bg-heritage-gold text-ethio-charcoal font-bold text-sm flex items-center justify-center gap-2">
          <Phone className="size-4" /> Call courier
        </a>
        <Link to="/" className="h-11 rounded-full bg-card border border-border text-ethio-charcoal font-bold text-sm flex items-center justify-center">
          Done
        </Link>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted rounded-xl px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className="text-xs font-semibold truncate">{value}</p>
    </div>
  );
}
