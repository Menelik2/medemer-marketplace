import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Heart, BadgeCheck, Star, Minus, Plus, ShoppingBag, Tag, Check, X, Store, MessageSquare, Loader2, Camera, ShieldCheck,
} from "lucide-react";
import { COUPONS, DELIVERY_FEE, ETB, resolveImg } from "@/lib/catalog";
import { getProductBySlug, listReviews, submitReview } from "@/lib/marketplace.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — ADDIX" },
      { name: "description", content: "ADDIX product details." },
    ],
  }),
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
  const { id } = Route.useParams();
  const fetchProduct = useServerFn(getProductBySlug);
  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => fetchProduct({ data: { slug: id } }),
  });

  const [qty, setQty] = useState(1);
  const [liked, setLiked] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const price = Number(p?.price ?? 0);
  const subtotal = price * qty;
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

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-heritage-gold" /></div>;
  }
  if (!p) {
    return (
      <div className="min-h-screen grid place-items-center text-center p-6">
        <div>
          <h1 className="font-display text-2xl mb-2">Product not found</h1>
          <p className="text-xs text-muted-foreground mb-4">This item may have been removed.</p>
          <Link to="/" className="text-heritage-gold font-semibold text-sm">← Back home</Link>
        </div>
      </div>
    );
  }
  const seller = (p as any).sellers;
  const product = {
    ...p,
    img: resolveImg(p.img, p.category),
    nameAm: p.name_am ?? "",
    reviewCount: p.review_count,
    price,
    stock: p.stock ?? 0,
  };

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
              <p className="font-display text-2xl font-bold text-heritage-gold">{Number(product.price).toLocaleString()}</p>
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
          <img src={resolveImg(seller.avatar, product.category)} alt={seller.name} className="size-12 rounded-xl object-cover" />
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

        {/* Reviews */}
        <ReviewsSection productId={product.id} />
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

function ReviewsSection({ productId }: { productId: string }) {
  const fetchReviews = useServerFn(listReviews);
  const submit = useServerFn(submitReview);
  const qc = useQueryClient();
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => fetchReviews({ data: { productId } }),
  });
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [bodyAm, setBodyAm] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      setError(null);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) throw new Error("Please sign in to review.");
      const urls: string[] = [];
      for (const f of files) {
        const path = `${sess.session.user.id}/${Date.now()}-${f.name.replace(/[^a-z0-9.]/gi, "_")}`;
        const { error } = await supabase.storage.from("review-photos").upload(path, f, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from("review-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      return submit({ data: { productId, rating, title: title || undefined, body: body || undefined, bodyAm: bodyAm || undefined, photoUrls: urls } });
    },
    onSuccess: () => {
      setOk(true);
      setOpen(false);
      setTitle(""); setBody(""); setBodyAm(""); setFiles([]);
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg flex items-center gap-1.5">
          <MessageSquare className="size-4 text-heritage-red" /> Reviews
          <span className="text-xs text-muted-foreground font-sans">({reviews.length})</span>
        </h3>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-heritage-gold text-ethio-charcoal"
        >
          {open ? "Cancel" : "Write review"}
        </button>
      </div>

      {ok && !open && (
        <div className="mb-3 bg-heritage-green/10 border border-heritage-green/20 rounded-2xl p-3 text-xs flex items-center gap-2">
          <Check className="size-4 text-heritage-green" />
          Thanks — your review is live. · አመሰግናለሁ
        </div>
      )}

      {open && (
        <form
          onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
          className="bg-card border border-border rounded-2xl p-4 shadow-sm mb-4 space-y-3"
        >
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n} type="button" onClick={() => setRating(n)}
                className="p-1"
                aria-label={`Rate ${n}`}
              >
                <Star className={`size-5 ${n <= rating ? "text-heritage-gold fill-current" : "text-muted-foreground"}`} />
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-2">Verified purchaser only · የተረጋገጠ ገዢ</span>
          </div>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
          />
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your review in English"
            rows={3}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
          />
          <textarea
            value={bodyAm} onChange={(e) => setBodyAm(e.target.value)}
            placeholder="ግምገማዎ በአማርኛ (አማራጭ)"
            rows={2}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
            style={{ fontFamily: "var(--font-amharic)" }}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Camera className="size-4" />
            <span>Photos ({files.length}/5)</span>
            <input
              type="file" accept="image/*" multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
              className="hidden"
            />
          </label>
          {error && <p className="text-xs text-heritage-red">{error}</p>}
          <button disabled={mut.isPending} className="w-full h-11 rounded-full bg-heritage-red text-soft-clay font-bold text-sm flex items-center justify-center gap-2">
            {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Submit review
          </button>
        </form>
      )}

      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-1 mb-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`size-3.5 ${n <= r.rating ? "text-heritage-gold fill-current" : "text-muted-foreground/40"}`} />
              ))}
              <span className="ml-auto text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {r.title && <p className="text-sm font-semibold">{r.title}</p>}
            {r.body && <p className="text-xs text-ethio-charcoal/80 mt-1">{r.body}</p>}
            {r.body_am && (
              <p className="text-xs text-ethio-charcoal/80 mt-1" style={{ fontFamily: "var(--font-amharic)" }}>{r.body_am}</p>
            )}
            {!!r.photo_urls?.length && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {r.photo_urls.map((u) => (
                  <img key={u} src={u} alt="" className="size-16 rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        ))}
        {!reviews.length && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No reviews yet. Be the first verified purchaser to leave one.
          </p>
        )}
      </div>
    </section>
  );
}
