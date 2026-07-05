import { createFileRoute, Link, notFound, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Heart, BadgeCheck, Star, Minus, Plus, ShoppingBag, Tag, Check, X, Store,
} from "lucide-react";
import { COUPONS, DELIVERY_FEE, ETB, getProduct, getSeller, PRODUCTS } from "@/lib/catalog";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    const seller = getSeller(product.sellerId)!;
    return { product, seller };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product not found" }, { name: "robots", content: "noindex" }] };
    const { product } = loaderData;
    return {
      meta: [
        { title: `${product.name} — ADDIX` },
        { name: "description", content: product.description },
        { property: "og:title", content: product.name },
        { property: "og:description", content: product.description },
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div>
        <h1 className="font-display text-2xl mb-2">Product not found</h1>
        <Link to="/" className="text-heritage-gold font-semibold text-sm">← Back home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-sm text-muted-foreground">{error.message}</div>
  ),
});

function ProductPage() {
  const { product, seller } = Route.useLoaderData();
  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const subtotal = product.price * qty;
  const discount = useMemo(() => {
    if (!applied) return 0;
    const c = COUPONS[applied];
    if (!c) return 0;
    return c.type === "percent" ? Math.round((subtotal * c.value) / 100) : c.value;
  }, [applied, subtotal]);
  const delivery = applied === "FREESHIP" ? 0 : DELIVERY_FEE;
  const total = Math.max(0, subtotal - discount) + delivery;

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (COUPONS[code]) {
      setApplied(code);
      setCouponError(null);
    } else {
      setApplied(null);
      setCouponError("Invalid coupon");
    }
  };

  const related = PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-soft-clay pb-40">
      {/* Hero image */}
      <div className="relative">
        <img src={product.img} alt={product.name} className="w-full aspect-square object-cover" />
        <div className="absolute inset-x-0 top-0 p-4 flex items-center justify-between">
          <Link to="/" className="size-10 grid place-items-center rounded-full bg-background/80 backdrop-blur shadow-sm">
            <ArrowLeft className="size-4" />
          </Link>
          <button
            onClick={() => setLiked((v) => !v)}
            className="size-10 grid place-items-center rounded-full bg-background/80 backdrop-blur shadow-sm text-heritage-red"
            aria-label="Wishlist"
          >
            <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
          </button>
        </div>
        {product.stock < 10 && (
          <span className="absolute bottom-3 left-4 bg-heritage-red text-soft-clay text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
            Only {product.stock} left
          </span>
        )}
      </div>

      <main className="mx-auto max-w-md px-4 -mt-6 relative">
        {/* Card */}
        <div className="bg-card rounded-3xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                {product.category}
              </p>
              <h1 className="font-display text-2xl leading-tight">{product.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-amharic)" }}>
                {product.nameAm}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-2xl font-bold text-heritage-gold">{product.price.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">ETB</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-heritage-gold font-semibold">
              <Star className="size-3.5 fill-current" /> {product.rating}
            </span>
            <span className="text-muted-foreground">{product.reviewCount.toLocaleString()} reviews</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-heritage-green font-semibold">In stock</span>
          </div>

          <p className="text-sm text-ethio-charcoal/80 leading-relaxed">{product.description}</p>
        </div>

        {/* Seller card */}
        <Link
          to="/seller/$slug"
          params={{ slug: seller.slug }}
          className="mt-4 flex items-center gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition"
        >
          <img src={seller.avatar} alt={seller.name} className="size-12 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate">{seller.name}</p>
              {seller.verified && <BadgeCheck className="size-3.5 text-heritage-gold shrink-0" />}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{seller.region} · since {seller.since}</p>
          </div>
          <span className="text-xs font-bold text-heritage-gold flex items-center gap-1">
            <Store className="size-3.5" /> Visit
          </span>
        </Link>

        {/* Coupon */}
        <div className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag className="size-3.5 text-heritage-red" />
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Coupon</p>
          </div>
          {applied ? (
            <div className="flex items-center justify-between bg-heritage-green/10 border border-heritage-green/20 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-heritage-green" />
                <div>
                  <p className="text-sm font-semibold">{applied}</p>
                  <p className="text-[10px] text-heritage-green font-semibold">{COUPONS[applied].label}</p>
                </div>
              </div>
              <button onClick={() => setApplied(null)} className="size-6 grid place-items-center text-muted-foreground">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="ETHIO20"
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={applyCoupon} className="px-4 py-2.5 bg-ethio-charcoal text-soft-clay rounded-xl text-xs font-bold">
                Apply
              </button>
            </div>
          )}
          {couponError && <p className="text-[11px] text-heritage-red mt-2">{couponError}</p>}
          <p className="text-[10px] text-muted-foreground mt-2">Try ETHIO20, ADDIS100 or FREESHIP</p>
        </div>

        {/* Price breakdown */}
        <div className="mt-4 bg-card border border-border rounded-2xl p-4 shadow-sm text-sm space-y-2">
          <Row label={`Subtotal (${qty}×)`} value={ETB(subtotal)} />
          {discount > 0 && <Row label="Discount" value={`− ${ETB(discount)}`} accent />}
          <Row label="Delivery" value={delivery === 0 ? "Free" : ETB(delivery)} />
          <div className="border-t border-border pt-2 mt-2 flex justify-between font-display text-lg font-bold">
            <span>Total</span>
            <span className="text-heritage-gold">{ETB(total)}</span>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-8">
            <h3 className="font-display text-lg mb-3">More from this category</h3>
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => (
                <Link
                  key={p.id}
                  to="/product/$id"
                  params={{ id: p.slug }}
                  className="bg-card border border-border rounded-2xl p-2 shadow-sm"
                >
                  <img src={p.img} alt={p.name} className="w-full aspect-square rounded-xl object-cover mb-2" />
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                  <p className="text-xs font-bold text-heritage-gold">{ETB(p.price)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-xl border-t border-border z-40">
        <div className="mx-auto max-w-md px-4 py-3 pb-5 flex items-center gap-3">
          <div className="flex items-center border border-border rounded-full bg-card">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="size-10 grid place-items-center">
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center font-bold text-sm">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="size-10 grid place-items-center">
              <Plus className="size-4" />
            </button>
          </div>
          <button
            onClick={() => { setAdded(true); setTimeout(() => setAdded(false), 1400); }}
            className="flex-1 h-11 rounded-full bg-heritage-red text-soft-clay text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {added ? (<><Check className="size-4" /> Added</>) : (<><ShoppingBag className="size-4" /> Add to cart</>)}
          </button>
          <Link
            to="/checkout"
            search={{ productId: product.slug, qty, coupon: applied ?? undefined }}
            className="h-11 px-4 rounded-full bg-ethio-charcoal text-soft-clay text-sm font-bold grid place-items-center"
          >
            Buy
          </Link>
        </div>
      </div>
    </div>
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
