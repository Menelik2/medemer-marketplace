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
      .select("*, order_items(*, products(name,img,slug))")
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

export const adminUpdateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      productId: z.string().uuid(),
      price: z.number().nonnegative().optional(),
      stock: z.number().int().min(0).optional(),
      name: z.string().min(1).max(200).optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, any> = {};
    if (data.price !== undefined) patch.price = data.price;
    if (data.stock !== undefined) patch.stock = data.stock;
    if (data.name !== undefined) patch.name = data.name;
    if (!Object.keys(patch).length) return { ok: true };
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------- Customers / users -------- */

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().max(100).optional() }).parse(d ?? {})
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    let q = sb.from("profiles").select("id,display_name,created_at").order("created_at", { ascending: false }).limit(200);
    if (data.query) q = q.ilike("display_name", `%${data.query}%`);
    const { data: profiles } = await q;
    const ids = (profiles ?? []).map((p: any) => p.id);
    if (!ids.length) return [];

    const [rolesRes, ordersRes] = await Promise.all([
      sb.from("user_roles").select("user_id,role").in("user_id", ids),
      sb.from("orders").select("user_id,total,status").in("user_id", ids),
    ]);
    const roleMap: Record<string, string[]> = {};
    (rolesRes.data ?? []).forEach((r: any) => {
      (roleMap[r.user_id] ||= []).push(r.role);
    });
    const orderMap: Record<string, { count: number; spent: number }> = {};
    (ordersRes.data ?? []).forEach((o: any) => {
      const e = (orderMap[o.user_id] ||= { count: 0, spent: 0 });
      e.count += 1;
      if (o.status !== "cancelled") e.spent += Number(o.total);
    });

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      displayName: p.display_name,
      createdAt: p.created_at,
      roles: roleMap[p.id] ?? ["customer"],
      isAdmin: (roleMap[p.id] ?? []).includes("admin"),
      ordersCount: orderMap[p.id]?.count ?? 0,
      totalSpent: orderMap[p.id]?.spent ?? 0,
    }));
  });

/* -------- Analytics & reports -------- */

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;
    const [ordersRes, itemsRes, productsRes, sellersRes] = await Promise.all([
      sb.from("orders").select("id,total,status,payment_method,created_at").order("created_at", { ascending: false }).limit(1000),
      sb.from("order_items").select("product_id,seller_id,qty,price,order_id"),
      sb.from("products").select("id,name,category,price,img"),
      sb.from("sellers").select("id,name,slug,verified"),
    ]);
    const orders = ordersRes.data ?? [];
    const items = itemsRes.data ?? [];
    const products = productsRes.data ?? [];
    const sellers = sellersRes.data ?? [];

    const paidOrderIds = new Set(
      orders.filter((o: any) => o.status !== "cancelled" && o.status !== "pending").map((o: any) => o.id)
    );
    const paidItems = items.filter((i: any) => paidOrderIds.has(i.order_id));

    // Top sellers by GMV
    const bySeller: Record<string, number> = {};
    paidItems.forEach((i: any) => {
      bySeller[i.seller_id] = (bySeller[i.seller_id] ?? 0) + Number(i.price) * Number(i.qty);
    });
    const topSellers = Object.entries(bySeller)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, gmv]) => {
        const s = sellers.find((x: any) => x.id === id);
        return { id, name: s?.name ?? "Unknown", slug: s?.slug, verified: !!s?.verified, gmv };
      });

    // Category revenue
    const byCategory: Record<string, number> = {};
    paidItems.forEach((i: any) => {
      const p = products.find((x: any) => x.id === i.product_id);
      const cat = p?.category ?? "Uncategorized";
      byCategory[cat] = (byCategory[cat] ?? 0) + Number(i.price) * Number(i.qty);
    });
    const categoryRevenue = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([category, revenue]) => ({ category, revenue }));

    // Payment method mix
    const byMethod: Record<string, number> = {};
    orders.forEach((o: any) => {
      const key = o.payment_method || "unknown";
      byMethod[key] = (byMethod[key] ?? 0) + 1;
    });

    // Order status funnel
    const statusFunnel: Record<string, number> = {};
    orders.forEach((o: any) => {
      statusFunnel[o.status] = (statusFunnel[o.status] ?? 0) + 1;
    });

    // Best selling products (by qty)
    const byProduct: Record<string, number> = {};
    paidItems.forEach((i: any) => {
      byProduct[i.product_id] = (byProduct[i.product_id] ?? 0) + Number(i.qty);
    });
    const topProducts = Object.entries(byProduct)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, qty]) => {
        const p = products.find((x: any) => x.id === id);
        return { id, name: p?.name ?? "Unknown", img: p?.img, qty };
      });

    const totalGMV = paidItems.reduce((s: number, i: any) => s + Number(i.price) * Number(i.qty), 0);
    const avgOrderValue = paidOrderIds.size ? totalGMV / paidOrderIds.size : 0;
    const conversion = orders.length ? paidOrderIds.size / orders.length : 0;

    return {
      totals: {
        totalGMV,
        avgOrderValue,
        conversion,
        paidOrders: paidOrderIds.size,
        allOrders: orders.length,
      },
      topSellers,
      topProducts,
      categoryRevenue,
      paymentMix: Object.entries(byMethod).map(([k, v]) => ({ method: k, count: v })),
      statusFunnel: Object.entries(statusFunnel).map(([k, v]) => ({ status: k, count: v })),
    };
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