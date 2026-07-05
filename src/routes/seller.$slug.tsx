import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Phone, MessageCircle, Star, MapPin, TrendingUp } from "lucide-react";
import { ETB, getSeller, sellerProducts } from "@/lib/catalog";

export const Route = createFileRoute("/seller/$slug")({
  loader: ({ params }) => {
    const seller = getSeller(params.slug);
    if (!seller) throw notFound();
    const products = sellerProducts(seller.id);
    const grossVolume = products.reduce((sum, p) => sum + p.price * (p.reviewCount / 4), 0);
    return { seller, products, grossVolume };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Seller not found" }, { name: "robots", content: "noindex" }] };
    const { seller } = loaderData;
    return {
      meta: [
        { title: `${seller.name} — ADDIX Seller` },
        { name: "description", content: seller.tagline },
        { property: "og:title", content: seller.name },
        { property: "og:description", content: seller.tagline },
      ],
    };
  },
  component: SellerPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center text-center p-6">
      <div>
        <h1 className="font-display text-2xl mb-2">Seller not found</h1>
        <Link to="/" className="text-heritage-gold font-semibold text-sm">← Back home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center p-6 text-sm text-muted-foreground">{error.message}</div>
  ),
});

function SellerPage() {
  const { seller, products, grossVolume } = Route.useLoaderData();
  const commissionEarned = Math.round((grossVolume * seller.commissionPct) / 100);
  const sellerEarnings = Math.round(grossVolume - commissionEarned);

  return (
    <div className="min-h-screen bg-soft-clay pb-16">
      {/* Cover */}
      <div className="relative h-40 bg-heritage-green overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "18px 18px" }}
        />
        <Link to="/" className="absolute top-4 left-4 size-10 grid place-items-center rounded-full bg-background/80 backdrop-blur">
          <ArrowLeft className="size-4" />
        </Link>
      </div>

      <main className="mx-auto max-w-md px-4 -mt-14 relative">
        {/* Profile card */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <img src={seller.avatar} alt={seller.name} className="size-20 rounded-2xl object-cover border-4 border-card shadow-lg -mt-10 shrink-0" />
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-xl leading-tight truncate">{seller.name}</h1>
                {seller.verified && <BadgeCheck className="size-4 text-heritage-gold shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground truncate">{seller.tagline}</p>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-heritage-gold font-semibold">
                  <Star className="size-3 fill-current" /> {seller.rating}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {seller.region}
                </span>
                <span>Since {seller.since}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={`tel:${seller.phone.replace(/\s/g, "")}`} className="h-10 rounded-xl bg-ethio-charcoal text-soft-clay text-xs font-bold grid grid-cols-[auto_1fr] items-center gap-1.5 px-3">
              <Phone className="size-3.5" /> <span className="text-center">Call</span>
            </a>
            <button className="h-10 rounded-xl bg-heritage-gold text-ethio-charcoal text-xs font-bold flex items-center justify-center gap-1.5">
              <MessageCircle className="size-3.5" /> Message
            </button>
          </div>
        </div>

        {/* Commission-aware stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Products" value={String(products.length)} />
          <Stat label="Earnings" value={ETB(sellerEarnings)} accent />
          <Stat label={`Commission ${seller.commissionPct}%`} value={ETB(commissionEarned)} muted />
        </div>

        {/* Products */}
        <section className="mt-6">
          <div className="flex items-end justify-between mb-3">
            <h2 className="font-display text-lg">Storefront</h2>
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
              <TrendingUp className="size-3 text-heritage-green" /> Live inventory
            </span>
          </div>

          <ul className="space-y-3">
            {products.map((p) => {
              const commissionOnItem = Math.round((p.price * p.commissionPct) / 100);
              const payout = p.price - commissionOnItem;
              return (
                <li key={p.id}>
                  <Link
                    to="/product/$id"
                    params={{ id: p.slug }}
                    className="flex gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition"
                  >
                    <img src={p.img} alt={p.name} loading="lazy" className="size-20 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div>
                          <span className="font-display font-bold text-heritage-gold text-sm">{ETB(p.price)}</span>
                          <p className="text-[10px] text-muted-foreground">
                            Payout <span className="font-semibold text-ethio-charcoal">{ETB(payout)}</span>
                            <span className="mx-1">·</span>
                            Fee {ETB(commissionOnItem)}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          p.stock < 10 ? "bg-heritage-red/10 text-heritage-red" : "bg-heritage-green/10 text-heritage-green"
                        }`}>
                          {p.stock < 10 ? `Only ${p.stock}` : "In stock"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div className={`rounded-2xl p-3 border border-border shadow-sm ${accent ? "bg-ethio-charcoal text-soft-clay" : "bg-card"}`}>
      <p className={`text-[9px] uppercase tracking-widest font-semibold ${accent ? "opacity-60" : "text-muted-foreground"}`}>{label}</p>
      <p className={`font-display text-sm font-bold mt-1 ${muted ? "text-muted-foreground" : accent ? "text-heritage-gold" : ""}`}>{value}</p>
    </div>
  );
}
