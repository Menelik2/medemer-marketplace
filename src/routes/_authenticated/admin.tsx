import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, LayoutDashboard, Package, Users, Store, Wallet, Star, ShieldCheck,
  Loader2, Check, X, Trash2, TrendingUp, AlertTriangle, Crown, Lock,
  BarChart3, Pencil, Search as SearchIcon, Plus,
} from "lucide-react";
import {
  amIAdmin, claimAdminIfNone, getAdminStats,
  adminListOrders, adminUpdateOrderStatus,
  adminListSellers, adminSetSellerVerified,
  adminBulkUpdateOrderStatus, adminBulkSetSellerVerified,
  adminListProducts, adminDeleteProduct, adminUpdateProduct, adminCreateProduct,
  adminListUsers, getAdminAnalytics,
  adminListWithdrawals, adminDecideWithdrawal,
  adminListReviews, adminSetReviewApproved,
} from "@/lib/admin.functions";
import { ETB } from "@/lib/catalog";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminDashboard,
});

type Tab = "overview" | "orders" | "sellers" | "products" | "customers" | "analytics" | "withdrawals" | "reviews";

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
              ["customers", "Customers", Users],
              ["analytics", "Analytics", BarChart3],
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
        {tab === "customers" && <CustomersPanel />}
        {tab === "analytics" && <AnalyticsPanel />}
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
  const bulkUpdate = useServerFn(adminBulkUpdateOrderStatus);
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<(typeof ORDER_STATUSES)[number]>("paid");
  const bulkMut = useMutation({
    mutationFn: (v: { orderIds: string[]; status: (typeof ORDER_STATUSES)[number] }) => bulkUpdate({ data: v }),
    onSuccess: (r) => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      alert(`Updated ${r.count} order(s).`);
    },
    onError: (e) => alert((e as Error).message),
  });
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allIds = data.map((o: any) => o.id);
  const allSelected = allIds.length > 0 && allIds.every((id: string) => selected.has(id));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setStatusFilter("")} className={`text-xs px-3 py-1 rounded-full ${statusFilter === "" ? "bg-ethio-charcoal text-soft-clay" : "bg-card border border-border"}`}>All</button>
        {ORDER_STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1 rounded-full capitalize ${statusFilter === s ? "bg-ethio-charcoal text-soft-clay" : "bg-card border border-border"}`}>{s}</button>
        ))}
      </div>
      {data.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 flex-wrap sticky top-[104px] z-30">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => setSelected(e.target.checked ? new Set(allIds) : new Set())}
            />
            {selected.size ? `${selected.size} selected` : "Select all"}
          </label>
          <div className="flex-1" />
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as any)}
            disabled={!selected.size}
            className="text-xs border border-border rounded-full px-3 py-1 bg-background capitalize disabled:opacity-50"
          >
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            disabled={!selected.size || bulkMut.isPending}
            onClick={() => {
              if (!confirm(`Set ${selected.size} order(s) to "${bulkStatus}"?`)) return;
              bulkMut.mutate({ orderIds: [...selected], status: bulkStatus });
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-heritage-gold text-ethio-charcoal disabled:opacity-50"
          >
            {bulkMut.isPending ? "Updating…" : "Apply"}
          </button>
        </div>
      )}
      {isLoading && <PanelLoader />}
      {data.map((o: any) => (
        <div key={o.id} className={`bg-card border rounded-2xl p-4 ${selected.has(o.id) ? "border-heritage-gold" : "border-border"}`}>
          <div className="flex items-start justify-between gap-3">
            <input
              type="checkbox"
              checked={selected.has(o.id)}
              onChange={() => toggle(o.id)}
              className="mt-1"
            />
            <div className="min-w-0 flex-1">
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
  const bulkVerify = useServerFn(adminBulkSetSellerVerified);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-sellers"], queryFn: () => fetchSellers() });
  const mut = useMutation({
    mutationFn: (v: { sellerId: string; verified: boolean }) => setVerified({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulkMut = useMutation({
    mutationFn: (v: { sellerIds: string[]; verified: boolean }) => bulkVerify({ data: v }),
    onSuccess: (r) => {
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      alert(`Updated ${r.count} seller(s).`);
    },
    onError: (e) => alert((e as Error).message),
  });
  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const allIds = data.map((s: any) => s.id);
  const allSelected = allIds.length > 0 && allIds.every((id: string) => selected.has(id));
  return (
    <div className="space-y-3">
      {data.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-2 flex-wrap sticky top-[104px] z-30">
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => setSelected(e.target.checked ? new Set(allIds) : new Set())}
            />
            {selected.size ? `${selected.size} selected` : "Select all"}
          </label>
          <div className="flex-1" />
          <button
            disabled={!selected.size || bulkMut.isPending}
            onClick={() => {
              if (!confirm(`Approve ${selected.size} seller(s)?`)) return;
              bulkMut.mutate({ sellerIds: [...selected], verified: true });
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-heritage-gold text-ethio-charcoal disabled:opacity-50"
          >
            Approve
          </button>
          <button
            disabled={!selected.size || bulkMut.isPending}
            onClick={() => {
              if (!confirm(`Revoke verification for ${selected.size} seller(s)?`)) return;
              bulkMut.mutate({ sellerIds: [...selected], verified: false });
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-foreground disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      )}
      {isLoading && <PanelLoader />}
      {data.map((s: any) => (
        <div key={s.id} className={`bg-card border rounded-2xl p-4 flex items-center gap-3 ${selected.has(s.id) ? "border-heritage-gold" : "border-border"}`}>
          <input
            type="checkbox"
            checked={selected.has(s.id)}
            onChange={() => toggle(s.id)}
          />
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
  const update = useServerFn(adminUpdateProduct);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => fetchProducts() });
  const mut = useMutation({
    mutationFn: (id: string) => del({ data: { productId: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
  const editMut = useMutation({
    mutationFn: (v: { productId: string; price?: number; stock?: number; name?: string }) => update({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => alert((e as Error).message),
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      {isLoading && <PanelLoader />}
      {data.map((p: any) => (
        <ProductRow
          key={p.id}
          p={p}
          editing={editingId === p.id}
          onEdit={() => setEditingId(p.id)}
          onCancel={() => setEditingId(null)}
          onSave={(v) => {
            editMut.mutate({ productId: p.id, ...v });
            setEditingId(null);
          }}
          onDelete={() => { if (confirm(`Delete "${p.name}"?`)) mut.mutate(p.id); }}
        />
      ))}
      {!isLoading && !data.length && <EmptyState icon={Package} text="No products yet." />}
    </div>
  );
}

function ProductRow({
  p, editing, onEdit, onCancel, onSave, onDelete,
}: {
  p: any;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (v: { name?: string; price?: number; stock?: number }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));

  if (!editing) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
        <img src={p.img} alt="" className="size-12 rounded-lg object-cover" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{p.name}</p>
          <p className="text-[11px] text-muted-foreground">{p.sellers?.name} · {p.category}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{ETB(Number(p.price))}</p>
          <p className={`text-[10px] ${p.stock < 5 ? "text-heritage-red" : "text-muted-foreground"}`}>Stock: {p.stock}</p>
        </div>
        <button onClick={onEdit} className="size-8 grid place-items-center rounded-full hover:bg-muted text-heritage-gold" title="Edit">
          <Pencil className="size-4" />
        </button>
        <button onClick={onDelete} className="size-8 grid place-items-center rounded-full hover:bg-heritage-red/10 text-heritage-red" title="Delete">
          <Trash2 className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <div className="bg-card border-2 border-heritage-gold/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-3">
        <img src={p.img} alt="" className="size-12 rounded-lg object-cover" />
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Price (ETB)</span>
          <input
            type="number" min="0" step="0.01"
            value={price} onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Stock</span>
          <input
            type="number" min="0" step="1"
            value={stock} onChange={(e) => setStock(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
        <button
          onClick={() => onSave({ name, price: Number(price), stock: Number(stock) })}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-heritage-gold text-ethio-charcoal"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* ---------------- Customers ---------------- */

function CustomersPanel() {
  const [query, setQuery] = useState("");
  const listUsers = useServerFn(adminListUsers);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-users", query],
    queryFn: () => listUsers({ data: { query: query || undefined } }),
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-2">
        <SearchIcon className="size-4 text-muted-foreground" />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by display name…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      {isLoading && <PanelLoader />}
      {data.map((u: any) => (
        <div key={u.id} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{u.displayName ?? u.id.slice(0, 8)}</p>
              {u.isAdmin && (
                <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-heritage-gold text-ethio-charcoal">Admin</span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Joined {new Date(u.createdAt).toLocaleDateString()} · {u.roles.join(", ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold">{ETB(Number(u.totalSpent))}</p>
            <p className="text-[11px] text-muted-foreground">{u.ordersCount} orders</p>
          </div>
        </div>
      ))}
      {!isLoading && !data.length && <EmptyState icon={Users} text="No customers match this search." />}
    </div>
  );
}

/* ---------------- Analytics ---------------- */

function AnalyticsPanel() {
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fetchAnalytics() });
  if (isLoading || !data) return <PanelLoader />;
  const t = data.totals;
  const catMax = Math.max(...data.categoryRevenue.map((c: any) => c.revenue), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total GMV" value={ETB(t.totalGMV)} icon={TrendingUp} accent="gold" />
        <StatCard label="Avg order" value={ETB(t.avgOrderValue)} icon={Wallet} />
        <StatCard label="Conversion" value={`${(t.conversion * 100).toFixed(1)}%`} sub={`${t.paidOrders}/${t.allOrders}`} icon={BarChart3} />
        <StatCard label="Paid orders" value={String(t.paidOrders)} icon={Check} />
      </div>

      <section className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-display text-base mb-3">Revenue by category</h2>
        <div className="space-y-2">
          {data.categoryRevenue.map((c: any) => (
            <div key={c.category}>
              <div className="flex justify-between text-xs mb-1">
                <span className="capitalize">{c.category}</span>
                <span className="font-semibold">{ETB(Number(c.revenue))}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-heritage-gold" style={{ width: `${(Number(c.revenue) / catMax) * 100}%` }} />
              </div>
            </div>
          ))}
          {!data.categoryRevenue.length && <p className="text-sm text-muted-foreground">No revenue yet.</p>}
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-display text-base mb-3">Top sellers</h2>
          <div className="space-y-2">
            {data.topSellers.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  <span className="text-muted-foreground text-[11px] mr-2">#{i + 1}</span>
                  {s.name} {s.verified && <ShieldCheck className="size-3 inline text-heritage-gold" />}
                </span>
                <span className="font-semibold">{ETB(Number(s.gmv))}</span>
              </div>
            ))}
            {!data.topSellers.length && <p className="text-sm text-muted-foreground">No sales yet.</p>}
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-display text-base mb-3">Best-selling products</h2>
          <div className="space-y-2">
            {data.topProducts.map((p: any, i: number) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-[11px] w-5">#{i + 1}</span>
                {p.img && <img src={p.img} alt="" className="size-7 rounded object-cover" />}
                <span className="flex-1 truncate">{p.name}</span>
                <span className="font-semibold">{p.qty} sold</span>
              </div>
            ))}
            {!data.topProducts.length && <p className="text-sm text-muted-foreground">No sales yet.</p>}
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-display text-base mb-3">Payment mix</h2>
          <div className="space-y-1.5">
            {data.paymentMix.map((m: any) => (
              <div key={m.method} className="flex justify-between text-sm">
                <span className="capitalize">{m.method.replace(/_/g, " ")}</span>
                <span className="font-semibold">{m.count}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-display text-base mb-3">Order status</h2>
          <div className="space-y-1.5">
            {data.statusFunnel.map((s: any) => (
              <div key={s.status} className="flex justify-between text-sm">
                <span className="capitalize">{s.status}</span>
                <span className="font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
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
