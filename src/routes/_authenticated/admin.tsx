import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, LayoutDashboard, Package, Users, Store, Wallet, Star, ShieldCheck,
  Loader2, Check, X, Trash2, TrendingUp, AlertTriangle, Crown, Lock,
} from "lucide-react";
import {
  amIAdmin, claimAdminIfNone, getAdminStats,
  adminListOrders, adminUpdateOrderStatus,
  adminListSellers, adminSetSellerVerified,
  adminListProducts, adminDeleteProduct,
  adminListWithdrawals, adminDecideWithdrawal,
  adminListReviews, adminSetReviewApproved,
} from "@/lib/admin.functions";
import { ETB } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

type Tab = "overview" | "orders" | "sellers" | "products" | "withdrawals" | "reviews";

function AdminDashboard() {
  const check = useServerFn(amIAdmin);
  const claim = useServerFn(claimAdminIfNone);
  const qc = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ["me-admin"], queryFn: () => check() });
  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-admin"] }),
  });
  const [tab, setTab] = useState<Tab>("overview");

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center bg-soft-clay"><Loader2 className="size-6 animate-spin text-heritage-gold" /></div>;
  }

  if (!me?.isAdmin) {
    return (
      <div className="min-h-screen bg-soft-clay grid place-items-center p-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 text-center">
          <Crown className="size-8 mx-auto text-heritage-gold mb-2" />
          <h1 className="font-display text-xl mb-1">Admin access</h1>
          <p className="text-sm text-muted-foreground mb-4">
            You are not an administrator. If no admin has been set up yet, you may claim the first admin role.
          </p>
          <button
            onClick={() => claimMut.mutate(undefined)}
            disabled={claimMut.isPending}
            className="w-full py-2.5 rounded-full bg-heritage-gold text-ethio-charcoal font-semibold text-sm disabled:opacity-60"
          >
            {claimMut.isPending ? "Claiming…" : "Claim admin role"}
          </button>
          {claimMut.data?.alreadyClaimed && !claimMut.data.granted && (
            <p className="text-xs text-heritage-red mt-3">Admin already assigned. Ask an existing admin to grant you access.</p>
          )}
          <Link to="/" className="block mt-4 text-xs text-muted-foreground underline">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-clay pb-16">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-4" /></Link>
            <ShieldCheck className="size-5 text-heritage-gold" />
            <h1 className="font-display text-lg">Admin dashboard</h1>
          </div>
          <Link
            to="/admin/roles"
            className="size-9 grid place-items-center rounded-full hover:bg-muted text-heritage-gold"
            title="Manage admin roles"
          >
            <Lock className="size-4" />
          </Link>
        </div>
        <nav className="mx-auto max-w-5xl px-4 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              ["overview", "Overview", LayoutDashboard],
              ["orders", "Orders", Package],
              ["sellers", "Sellers", Store],
              ["products", "Products", Package],
              ["withdrawals", "Withdrawals", Wallet],
              ["reviews", "Reviews", Star],
            ] as [Tab, string, any][]
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                tab === id ? "bg-ethio-charcoal text-soft-clay" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        {tab === "overview" && <OverviewPanel />}
        {tab === "orders" && <OrdersPanel />}
        {tab === "sellers" && <SellersPanel />}
        {tab === "products" && <ProductsPanel />}
        {tab === "withdrawals" && <WithdrawalsPanel />}
        {tab === "reviews" && <ReviewsPanel />}
      </main>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewPanel() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fetchStats() });
  if (isLoading || !data) return <PanelLoader />;
  const c = data.counts;
  const maxTrend = Math.max(...data.trend.map((t) => t.total), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Revenue" value={ETB(data.revenue)} icon={TrendingUp} accent="gold" />
        <StatCard label="Orders" value={String(c.orders)} sub={`${c.paidOrders} paid`} icon={Package} />
        <StatCard label="Users" value={String(c.users)} icon={Users} />
        <StatCard label="Sellers" value={String(c.sellers)} sub={`${c.verifiedSellers} verified`} icon={Store} />
        <StatCard label="Products" value={String(c.products)} sub={`${c.lowStock} low stock`} icon={Package} accent={c.lowStock > 0 ? "warn" : undefined} />
        <StatCard label="Pending payouts" value={String(c.pendingWithdrawals)} sub={ETB(data.pendingPayout)} icon={Wallet} accent={c.pendingWithdrawals > 0 ? "warn" : undefined} />
      </div>

      <section className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base">Revenue · last 14 days</h2>
          <span className="text-[10px] font-bold uppercase tracking-widest text-heritage-gold">GMV</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {data.trend.map((t) => (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-heritage-gold/80 rounded-t"
                style={{ height: `${Math.max(2, (t.total / maxTrend) * 100)}%` }}
                title={`${t.date}: ${ETB(t.total)}`}
              />
              <span className="text-[8px] text-muted-foreground">{t.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-display text-base mb-3">Recent orders</h2>
        <div className="space-y-2">
          {data.recentOrders.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">#{o.id.slice(0, 8)}</p>
                <p className="text-xs">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{ETB(Number(o.total))}</p>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{o.status} · {o.payment_method}</span>
              </div>
            </div>
          ))}
          {!data.recentOrders.length && <p className="text-sm text-muted-foreground">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: any; accent?: "gold" | "warn" }) {
  const ring = accent === "gold" ? "ring-heritage-gold/40" : accent === "warn" ? "ring-heritage-red/40" : "ring-border";
  return (
    <div className={`bg-card rounded-2xl p-4 ring-1 ${ring}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="size-4 text-heritage-gold" />
      </div>
      <p className="font-display text-xl">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ---------------- Orders ---------------- */

const ORDER_STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled"] as const;

function OrdersPanel() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const fetchOrders = useServerFn(adminListOrders);
  const updateStatus = useServerFn(adminUpdateOrderStatus);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: () => fetchOrders({ data: { status: statusFilter || undefined } }),
  });
  const mut = useMutation({
    mutationFn: (v: { orderId: string; status: (typeof ORDER_STATUSES)[number] }) => updateStatus({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setStatusFilter("")} className={`text-xs px-3 py-1 rounded-full ${statusFilter === "" ? "bg-ethio-charcoal text-soft-clay" : "bg-card border border-border"}`}>All</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1 rounded-full capitalize ${statusFilter === s ? "bg-ethio-charcoal text-soft-clay" : "bg-card border border-border"}`}>{s}</button>
        ))}
      </div>
      {isLoading && <PanelLoader />}
      {data.map((o: any) => (
        <div key={o.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-muted-foreground">#{o.id.slice(0, 8)}</p>
              <p className="font-semibold text-sm">{ETB(Number(o.total))} · {o.payment_method}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground truncate">{o.address}</p>
              <div className="mt-2 flex -space-x-2">
                {(o.order_items ?? []).slice(0, 5).map((i: any) => (
                  <img key={i.id} src={i.products?.img} alt="" className="size-8 rounded-full border-2 border-card object-cover" />
                ))}
              </div>
            </div>
            <select
              value={o.status}
              onChange={(e) => mut.mutate({ orderId: o.id, status: e.target.value as any })}
              className="text-xs border border-border rounded-full px-3 py-1 bg-background capitalize"
            >
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      ))}
      {!isLoading && !data.length && <EmptyState icon={Package} text="No orders match this filter." />}
    </div>
  );
}

/* ---------------- Sellers ---------------- */

function SellersPanel() {
  const fetchSellers = useServerFn(adminListSellers);
  const setVerified = useServerFn(adminSetSellerVerified);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-sellers"], queryFn: () => fetchSellers() });
  const mut = useMutation({
    mutationFn: (v: { sellerId: string; verified: boolean }) => setVerified({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
  return (
    <div className="space-y-3">
      {isLoading && <PanelLoader />}
      {data.map((s: any) => (
        <div key={s.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
          {s.avatar ? <img src={s.avatar} alt="" className="size-11 rounded-full object-cover" /> : <div className="size-11 rounded-full bg-muted grid place-items-center"><Store className="size-4" /></div>}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm truncate">{s.name}</p>
              {s.verified && <ShieldCheck className="size-3.5 text-heritage-gold" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{s.region ?? "—"} · commission {s.commission_pct}%</p>
          </div>
          <button
            onClick={() => mut.mutate({ sellerId: s.id, verified: !s.verified })}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${s.verified ? "bg-muted text-muted-foreground" : "bg-heritage-gold text-ethio-charcoal"}`}
          >
            {s.verified ? "Unverify" : "Verify"}
          </button>
        </div>
      ))}
      {!isLoading && !data.length && <EmptyState icon={Store} text="No sellers yet." />}
    </div>
  );
}

/* ---------------- Products ---------------- */

function ProductsPanel() {
  const fetchProducts = useServerFn(adminListProducts);
  const del = useServerFn(adminDeleteProduct);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => fetchProducts() });
  const mut = useMutation({
    mutationFn: (id: string) => del({ data: { productId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
  return (
    <div className="space-y-2">
      {isLoading && <PanelLoader />}
      {data.map((p: any) => (
        <div key={p.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
          <img src={p.img} alt="" className="size-12 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{p.name}</p>
            <p className="text-[11px] text-muted-foreground">{p.sellers?.name} · {p.category}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{ETB(Number(p.price))}</p>
            <p className={`text-[10px] ${p.stock < 5 ? "text-heritage-red" : "text-muted-foreground"}`}>Stock: {p.stock}</p>
          </div>
          <button
            onClick={() => { if (confirm(`Delete "${p.name}"?`)) mut.mutate(p.id); }}
            className="size-8 grid place-items-center rounded-full hover:bg-heritage-red/10 text-heritage-red"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {!isLoading && !data.length && <EmptyState icon={Package} text="No products yet." />}
    </div>
  );
}

/* ---------------- Withdrawals ---------------- */

function WithdrawalsPanel() {
  const fetchWithdrawals = useServerFn(adminListWithdrawals);
  const decide = useServerFn(adminDecideWithdrawal);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-withdrawals"], queryFn: () => fetchWithdrawals() });
  const mut = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected"; note?: string }) => decide({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => alert((e as Error).message),
  });
  return (
    <div className="space-y-3">
      {isLoading && <PanelLoader />}
      {data.map((w: any) => (
        <div key={w.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-sm">{w.sellers?.name ?? w.seller_id}</p>
              <p className="text-[11px] text-muted-foreground">Requested {new Date(w.created_at).toLocaleString()}</p>
              <p className="text-[11px] mt-1">Method: <span className="font-semibold capitalize">{w.method}</span></p>
              {w.account_details && <p className="text-[11px] text-muted-foreground truncate">Acct: {w.account_details}</p>}
              {w.admin_note && <p className="text-[11px] text-muted-foreground italic mt-1">Note: {w.admin_note}</p>}
            </div>
            <div className="text-right">
              <p className="font-display text-lg">{ETB(Number(w.amount))}</p>
              <StatusBadge status={w.status} />
            </div>
          </div>
          {w.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => mut.mutate({ id: w.id, decision: "approved" })}
                disabled={mut.isPending}
                className="flex-1 text-xs font-bold py-2 rounded-full bg-heritage-green text-soft-clay inline-flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Check className="size-3.5" /> Approve & pay out
              </button>
              <button
                onClick={() => {
                  const note = prompt("Rejection reason (optional):") ?? undefined;
                  mut.mutate({ id: w.id, decision: "rejected", note });
                }}
                disabled={mut.isPending}
                className="flex-1 text-xs font-bold py-2 rounded-full border border-border inline-flex items-center justify-center gap-1"
              >
                <X className="size-3.5" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
      {!isLoading && !data.length && <EmptyState icon={Wallet} text="No withdrawal requests." />}
    </div>
  );
}

/* ---------------- Reviews ---------------- */

function ReviewsPanel() {
  const fetchReviews = useServerFn(adminListReviews);
  const setApproved = useServerFn(adminSetReviewApproved);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => fetchReviews() });
  const mut = useMutation({
    mutationFn: (v: { id: string; approved: boolean }) => setApproved({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });
  return (
    <div className="space-y-3">
      {isLoading && <PanelLoader />}
      {data.map((r: any) => (
        <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-muted-foreground">{r.products?.name ?? "—"}</p>
            <span className="text-heritage-gold font-semibold text-sm">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span></span>
          </div>
          {r.title && <p className="text-sm font-semibold">{r.title}</p>}
          {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
          {r.photo_urls?.length ? (
            <div className="flex gap-2 mt-2">
              {r.photo_urls.slice(0, 4).map((u: string, i: number) => (
                <img key={i} src={u} alt="" className="size-14 rounded-lg object-cover border border-border" />
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            <button
              onClick={() => mut.mutate({ id: r.id, approved: !r.approved })}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${r.approved ? "bg-muted text-muted-foreground" : "bg-heritage-gold text-ethio-charcoal"}`}
            >
              {r.approved ? "Hide" : "Approve"}
            </button>
          </div>
        </div>
      ))}
      {!isLoading && !data.length && <EmptyState icon={Star} text="No reviews yet." />}
    </div>
  );
}

/* ---------------- Shared UI ---------------- */

function PanelLoader() {
  return <div className="py-10 grid place-items-center"><Loader2 className="size-5 animate-spin text-heritage-gold" /></div>;
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-14">
      <Icon className="size-8 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved" ? "bg-heritage-green/20 text-heritage-green" :
    status === "rejected" ? "bg-heritage-red/20 text-heritage-red" :
    "bg-heritage-gold/20 text-heritage-gold";
  return <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${cls}`}>{status}</span>;
}

// suppress lint for unused imports in cases where UI variants shift
void AlertTriangle;
