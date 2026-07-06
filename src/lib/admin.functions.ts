import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verify the caller has the 'admin' role. Throws otherwise. */
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

/* -------- Bootstrap: first user can claim admin if none exists -------- */

export const claimAdminIfNone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) {
      // If already admin, that's fine; otherwise deny
      const { data: mine } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("role", "admin").eq("user_id", context.userId).maybeSingle();
      return { granted: !!mine, alreadyClaimed: true };
    }
    const { error } = await supabaseAdmin
      .from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true, alreadyClaimed: false };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    return { isAdmin: !!data };
  });

/* -------- Overview stats -------- */

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [ordersRes, sellersRes, productsRes, usersRes, withdrawalsRes] = await Promise.all([
      sb.from("orders").select("id,total,status,created_at,payment_method").order("created_at", { ascending: false }),
      sb.from("sellers").select("id,verified"),
      sb.from("products").select("id,stock"),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("withdrawal_requests").select("id,status,amount"),
    ]);
    const orders = ordersRes.data ?? [];
    const revenue = orders.filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + Number(o.total), 0);
    const paidCount = orders.filter((o: any) => o.status === "paid" || o.status === "shipped" || o.status === "delivered").length;
    const pendingWithdrawals = (withdrawalsRes.data ?? []).filter((w: any) => w.status === "pending");
    const pendingPayout = pendingWithdrawals.reduce((s: number, w: any) => s + Number(w.amount), 0);
    // Revenue trend by day (last 14)
    const byDay: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    orders.forEach((o: any) => {
      const k = String(o.created_at).slice(0, 10);
      if (k in byDay) byDay[k] += Number(o.total);
    });

    return {
      counts: {
        orders: orders.length,
        paidOrders: paidCount,
        sellers: (sellersRes.data ?? []).length,
        verifiedSellers: (sellersRes.data ?? []).filter((s: any) => s.verified).length,
        products: (productsRes.data ?? []).length,
        lowStock: (productsRes.data ?? []).filter((p: any) => (p.stock ?? 0) < 5).length,
        users: usersRes.count ?? 0,
        pendingWithdrawals: pendingWithdrawals.length,
      },
      revenue,
      pendingPayout,
      trend: Object.entries(byDay).map(([date, total]) => ({ date, total })),
      recentOrders: orders.slice(0, 8),
    };
  });

/* -------- Orders management -------- */

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from("orders")
      .select("*, order_items(*, products(name,img,slug)), profiles!orders_user_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) q = q.eq("status", data.status as any);
    const { data: rows } = await q;
    return rows ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    orderId: z.string().uuid(),
    status: z.enum(["pending", "paid", "shipped", "delivered", "cancelled"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("orders").update({ status: data.status }).eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Sellers management -------- */

export const adminListSellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from("sellers").select("*").order("created_at", { ascending: false });
    return data ?? [];
  });

export const adminSetSellerVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ sellerId: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("sellers").update({ verified: data.verified }).eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Products moderation -------- */

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("products").select("id,name,price,stock,category,img,seller_id,sellers(name,verified)")
      .order("created_at", { ascending: false }).limit(200);
    return data ?? [];
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Withdrawals -------- */

export const adminListWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("withdrawal_requests")
      .select("*, sellers(name,slug)")
      .order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const adminDecideWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const { data: wr } = await sb.from("withdrawal_requests").select("*").eq("id", data.id).maybeSingle();
    if (!wr) throw new Error("Withdrawal not found");
    if (wr.status !== "pending") throw new Error("Already processed");

    const { error: uErr } = await sb.from("withdrawal_requests").update({
      status: data.decision as any,
      admin_note: data.note ?? null,
    }).eq("id", data.id);
    if (uErr) throw new Error(uErr.message);

    if (data.decision === "approved") {
      // Debit wallet
      const { error: tErr } = await sb.from("wallet_transactions").insert({
        seller_id: wr.seller_id, kind: "withdrawal", amount: wr.amount,
        note: `Withdrawal ${data.id.slice(0, 8)} via ${wr.method}`,
      });
      if (tErr) throw new Error(tErr.message);
    }
    return { ok: true };
  });

/* -------- Reviews moderation -------- */

export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from("reviews").select("id,rating,title,body,photo_urls,approved,created_at,product_id,products(name)")
      .order("created_at", { ascending: false }).limit(100);
    return data ?? [];
  });

export const adminSetReviewApproved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("reviews").update({ approved: data.approved }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });