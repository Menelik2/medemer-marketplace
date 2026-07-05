import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Package, Truck, Check, Loader2, Play } from "lucide-react";
import { getOrderTracking, listMyOrders, simulateDeliveryProgress } from "@/lib/marketplace.functions";
import { ETB } from "@/lib/catalog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  const fetchOrders = useServerFn(listMyOrders);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => fetchOrders(),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-soft-clay pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="font-display text-lg">My Orders</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !orders.length && (
          <div className="text-center py-16">
            <Package className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No orders yet.</p>
            <Link to="/" className="inline-block mt-3 text-heritage-gold font-semibold text-sm">Browse products →</Link>
          </div>
        )}
        {orders.map((o: any) => (
          <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button onClick={() => setOpenId(openId === o.id ? null : o.id)} className="w-full p-4 text-left">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">#{o.id.slice(0, 8)}</p>
                <StatusPill status={o.status} />
              </div>
              <p className="text-sm font-semibold">{ETB(Number(o.total))}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              <div className="mt-2 flex -space-x-2">
                {(o.order_items ?? []).slice(0, 4).map((i: any) => (
                  <img key={i.id} src={i.products?.img ?? ""} alt="" className="size-9 rounded-full border-2 border-card object-cover" />
                ))}
              </div>
            </button>
            {openId === o.id && <OrderTracking orderId={o.id} />}
          </div>
        ))}
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-muted", text: "text-muted-foreground" },
    paid: { bg: "bg-heritage-gold/20", text: "text-heritage-gold" },
    shipped: { bg: "bg-heritage-green/20", text: "text-heritage-green" },
    delivered: { bg: "bg-heritage-green text-soft-clay", text: "" },
    cancelled: { bg: "bg-heritage-red/20", text: "text-heritage-red" },
  };
  const c = map[status] ?? map.pending;
  return <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>{status}</span>;
}

function OrderTracking({ orderId }: { orderId: string }) {
  const fetchTracking = useServerFn(getOrderTracking);
  const simulate = useServerFn(simulateDeliveryProgress);
  const qc = useQueryClient();
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["tracking", orderId],
    queryFn: () => fetchTracking({ data: { orderId } }),
  });
  const mut = useMutation({
    mutationFn: () => simulate({ data: { orderId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tracking", orderId] });
      await qc.invalidateQueries({ queryKey: ["my-orders"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      router.invalidate();
    },
  });

  return (
    <div className="border-t border-border bg-ethio-charcoal text-soft-clay p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-heritage-gold text-[10px] uppercase tracking-widest font-semibold">
          <MapPin className="size-3" /> Live tracking
        </div>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-heritage-gold text-ethio-charcoal flex items-center gap-1 disabled:opacity-60"
        >
          {mut.isPending ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
          Simulate delivery
        </button>
      </div>
      {!data?.updates?.length && <p className="text-[11px] opacity-60">No updates yet. Tap "Simulate delivery" to see the courier flow.</p>}
      <ol className="space-y-3 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-soft-clay/15">
        {data?.updates?.map((u: any) => (
          <li key={u.id} className="relative pl-7">
            <span className="absolute left-0 top-0.5 size-[18px] rounded-full grid place-items-center bg-heritage-green">
              {u.status === "delivered" ? <Check className="size-2.5 text-soft-clay" strokeWidth={3} /> : <Truck className="size-2.5 text-soft-clay" />}
            </span>
            <p className="text-sm font-semibold">{u.note ?? u.status}</p>
            <p className="text-[10px] text-soft-clay/60 mt-0.5">
              {new Date(u.created_at).toLocaleTimeString()} · {u.lat}, {u.lng}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}