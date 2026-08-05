import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/* ---------------- SEARCH ---------------- */

const searchSchema = z.object({
  q: z.string().default(""),
  category: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  verifiedOnly: z.boolean().optional(),
});

export const searchProducts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => searchSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const productCols = "id,slug,seller_id,name,name_am,description,description_am,price,category,rating,review_count,stock,img,tags,commission_pct,created_at";
    const { data: rows } = await sb
      .from("products")
      .select(`${productCols}, sellers!inner(id,slug,name,verified,rating,region,commission_pct,dot_class,avatar,tagline,tagline_am)`) 
      .limit(200);
    const q = data.q.trim().toLowerCase();
    let hits = (rows ?? []).map((r) => ({ ...r, seller: (r as any).sellers }));

    if (q) {
      // typo-tolerant: substring OR trigram similarity via simple JS distance
      hits = hits.filter((p) => {
        const hay = `${p.name} ${p.name_am ?? ""} ${(p.tags ?? []).join(" ")} ${p.seller.name}`.toLowerCase();
        if (hay.includes(q)) return true;
        // typo tolerance: compare the query against individual words, not the
        // whole haystack (whole-string comparison matched almost everything).
        return q.length >= 4 && hay.split(/\s+/).some((w) => w.length >= 3 && trigramLike(w, q));
      });
    }
    if (data.category) hits = hits.filter((p) => p.category === data.category);
    if (typeof data.min === "number") hits = hits.filter((p) => Number(p.price) >= data.min!);
    if (typeof data.max === "number") hits = hits.filter((p) => Number(p.price) <= data.max!);
    if (data.verifiedOnly) hits = hits.filter((p) => p.seller.verified);

    const priceNums = (rows ?? []).map((r) => Number(r.price));
    const facets = {
      categories: (rows ?? []).reduce<Record<string, number>>((acc, p) => {
        acc[p.category] = (acc[p.category] ?? 0) + 1;
        return acc;
      }, {}),
      priceRange: priceNums.length ? [Math.min(...priceNums), Math.max(...priceNums)] as [number, number] : [0, 0] as [number, number],
      verified: (rows ?? []).filter((r) => (r as any).sellers?.verified).length,
    };

    // suggestions from name/tags matching prefix or trigram
    const terms = new Set<string>();
    (rows ?? []).forEach((r) => {
      terms.add(r.name.toLowerCase());
      (r.tags ?? []).forEach((t) => terms.add(t.toLowerCase()));
    });
    const suggestions = q
      ? Array.from(terms).filter((t) => t.includes(q) || (q.length >= 4 && trigramLike(t, q))).slice(0, 6)
      : ["yirgacheffe", "gabi", "meskel cross", "leather satchel"];

    return { hits, facets, suggestions };
  });

function trigramLike(a: string, b: string) {
  const grams = (s: string) => {
    const out = new Set<string>();
    const p = `  ${s}  `;
    for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));
    return out;
  };
  const A = grams(a), B = grams(b);
  let inter = 0;
  B.forEach((g) => { if (A.has(g)) inter++; });
  const union = new Set([...A, ...B]).size;
  return inter / Math.max(1, union) >= 0.4;
}

/* ---------------- PRODUCT + REVIEWS (public) ---------------- */

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const productCols = "id,slug,seller_id,name,name_am,description,description_am,price,category,rating,review_count,stock,img,tags,commission_pct,created_at";
    const { data: p } = await sb
      .from("products")
      .select(`${productCols}, sellers(id,slug,name,tagline,tagline_am,region,verified,rating,since,avatar,commission_pct,dot_class)`) 
      .or(`id.eq.${data.slug},slug.eq.${data.slug}`)
      .maybeSingle();
    return p;
  });

export const listReviews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ productId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows } = await sb
      .from("reviews")
      .select("id,rating,title,body,body_am,photo_urls,created_at,user_id")
      .eq("product_id", data.productId)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(50);
    return rows ?? [];
  });

/* ---------------- ORDERS ---------------- */

const createOrderSchema = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1) })).min(1),
  paymentMethod: z.enum(["chapa", "telebirr", "cod"]),
  couponCode: z.string().optional().nullable(),
  address: z.string().min(3),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const COUPONS: Record<string, { type: "percent" | "flat"; value: number }> = {
  ETHIO20: { type: "percent", value: 20 },
  ADDIS100: { type: "flat", value: 100 },
  FREESHIP: { type: "flat", value: 0 },
};
const DELIVERY_FEE = 60;

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createOrderSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ids = data.items.map((i) => i.productId);
    const { data: prods, error: pErr } = await supabase
      .from("products")
      .select("id,price,commission_pct,seller_id,stock")
      .in("id", ids);
    if (pErr || !prods?.length) throw new Error("Products not found");

    let subtotal = 0;
    const itemsPayload = data.items.map((it) => {
      const p = prods.find((x) => x.id === it.productId);
      if (!p) throw new Error("Missing product " + it.productId);
      const line = Number(p.price) * it.quantity;
      subtotal += line;
      const platform_fee = Math.round((line * Number(p.commission_pct)) / 100);
      return {
        product_id: p.id,
        seller_id: p.seller_id,
        quantity: it.quantity,
        unit_price: Number(p.price),
        commission_pct: Number(p.commission_pct),
        platform_fee,
        seller_payout: line - platform_fee,
      };
    });

    let discount = 0;
    const coupon = data.couponCode && COUPONS[data.couponCode] ? data.couponCode : null;
    if (coupon) {
      const c = COUPONS[coupon];
      discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
    }
    const delivery = coupon === "FREESHIP" ? 0 : DELIVERY_FEE;
    const total = Math.max(0, subtotal - discount) + delivery;
    const status = data.paymentMethod === "cod" ? "pending" : "paid";

    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        subtotal, discount, delivery_fee: delivery, total,
        coupon_code: coupon,
        payment_method: data.paymentMethod,
        status,
        address: data.address, city: data.city ?? null, phone: data.phone ?? null,
      })
      .select()
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Order failed");

    const { error: iErr } = await supabase
      .from("order_items")
      .insert(itemsPayload.map((i) => ({ ...i, order_id: order.id })));
    if (iErr) throw new Error(iErr.message);

    // Wallet earnings via service role (RLS doesn't allow buyer to insert wallet rows)
    if (status === "paid") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("wallet_transactions").insert(
        itemsPayload.map((i) => ({
          seller_id: i.seller_id,
          order_id: order.id,
          kind: "earning",
          amount: i.seller_payout,
          note: "Order " + order.id.slice(0, 8),
        })),
      );
    }

    return { orderId: order.id, total, status };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("orders")
      .select("*, order_items(*, products(name,name_am,img,slug))")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const getOrderTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase.from("orders").select("*").eq("id", data.orderId).maybeSingle();
    const { data: updates } = await context.supabase
      .from("delivery_updates").select("*").eq("order_id", data.orderId).order("created_at", { ascending: true });
    return { order, updates: updates ?? [] };
  });

/* ---------------- REVIEWS ---------------- */

const reviewSchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
  bodyAm: z.string().max(2000).optional(),
  photoUrls: z.array(z.string().url()).max(5).default([]),
});

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => reviewSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Verify delivered order exists
    const { data: verified } = await context.supabase
      .from("order_items")
      .select("order_id, orders!inner(status,user_id)")
      .eq("product_id", data.productId)
      .eq("orders.user_id", context.userId)
      .eq("orders.status", "delivered")
      .limit(1);
    if (!verified?.length) throw new Error("Only verified purchasers with a delivered order can review.");

    const { error } = await context.supabase.from("reviews").insert({
      product_id: data.productId,
      user_id: context.userId,
      order_id: verified[0].order_id,
      rating: data.rating,
      title: data.title ?? null,
      body: data.body ?? null,
      body_am: data.bodyAm ?? null,
      photo_urls: data.photoUrls,
      approved: true, // auto-approve
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- NOTIFICATIONS ---------------- */

export const listMyNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications").select("*").order("created_at", { ascending: false }).limit(30);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("notifications").update({ read: true }).eq("id", data.id);
    return { ok: true };
  });

/* ---------------- WALLET / WITHDRAWALS ---------------- */

export const myWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // sellers owned by this user
    const { data: sellers } = await context.supabase.from("sellers").select("id,name,slug").eq("owner_id", context.userId);
    const sellerIds = (sellers ?? []).map((s) => s.id);
    if (!sellerIds.length) return { sellers: [], txs: [], balance: 0, withdrawals: [] };
    const { data: txs } = await context.supabase
      .from("wallet_transactions").select("*").in("seller_id", sellerIds).order("created_at", { ascending: false });
    const { data: withdrawals } = await context.supabase
      .from("withdrawal_requests").select("*").in("seller_id", sellerIds).order("created_at", { ascending: false });
    const balance = (txs ?? []).reduce((sum, t) => sum + (t.kind === "withdrawal" ? -Number(t.amount) : Number(t.amount)), 0);
    return { sellers: sellers ?? [], txs: txs ?? [], balance, withdrawals: withdrawals ?? [] };
  });

export const requestWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      sellerId: z.string(),
      amount: z.number().positive(),
      method: z.string(),
      accountDetails: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("withdrawal_requests").insert({
      seller_id: data.sellerId,
      amount: data.amount,
      method: data.method,
      account_details: data.accountDetails ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- DELIVERY simulation (buyer-facing demo) ---------------- */

export const simulateDeliveryProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    // Load own order (RLS ensures ownership)
    const { data: order } = await context.supabase.from("orders").select("id,status").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const seq: Array<{ status: string; note: string; lat: number; lng: number }> = [
      { status: "shipped",    note: "Courier picked up your order",       lat: 9.0230, lng: 38.7469 },
      { status: "in_transit", note: "Courier is en route",                  lat: 9.0100, lng: 38.7600 },
      { status: "delivered",  note: "Delivered — signature captured",       lat: 9.0057, lng: 38.7636 },
    ];
    for (const s of seq) {
      await supabaseAdmin.from("delivery_updates").insert({
        order_id: order.id, status: s.status, note: s.note, lat: s.lat, lng: s.lng,
      });
    }
    await supabaseAdmin.from("orders").update({ status: "delivered" }).eq("id", order.id);
    return { ok: true };
  });

/* ---------------- DELIVERY: validated update (admin/courier) ---------------- */

const DELIVERY_STATUSES = ["picked_up", "shipped", "in_transit", "out_for_delivery", "delivered", "failed"] as const;

const deliveryUpdateSchema = z.object({
  orderId: z.string().uuid("Invalid order id"),
  status: z.enum(DELIVERY_STATUSES),
  note: z.string().trim().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photoUrl: z.string().url().max(2048).optional(),
  signatureUrl: z.string().url().max(2048).optional(),
});

export const postDeliveryUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deliveryUpdateSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Only admins may post real delivery updates. RLS also enforces this on the table.
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden: courier/admin role required");

    // Ensure the order exists before writing an update.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders").select("id,status").eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");

    // 'delivered' requires proof — signature and/or photo.
    if (data.status === "delivered" && !data.signatureUrl && !data.photoUrl) {
      throw new Error("Delivery proof required: attach a photo or signature.");
    }

    const { error } = await supabaseAdmin.from("delivery_updates").insert({
      order_id: data.orderId,
      status: data.status,
      note: data.note ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      photo_url: data.photoUrl ?? null,
      signature_url: data.signatureUrl ?? null,
    });
    if (error) throw new Error(error.message);

    // Mirror terminal statuses onto the order row.
    if (data.status === "delivered" || data.status === "shipped") {
      await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.orderId);
    }
    return { ok: true };
  });