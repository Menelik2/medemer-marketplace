import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Menu,
  Heart,
  Home,
  ShoppingBag,
  User,
  Wallet,
  MapPin,
  Phone,
  Star,
  ArrowRight,
  BadgeCheck,
  Truck,
  Bell,
  Package,
} from "lucide-react";
import { PRODUCTS, SELLERS, CATEGORIES, leatherBag, courier } from "@/lib/catalog";

export const Route = createFileRoute("/")({
  component: Index,
});

type Lang = "en" | "am";
const categories = CATEGORIES;
const products = PRODUCTS.slice(0, 4).map((p) => {
  const seller = SELLERS.find((s) => s.id === p.sellerId)!;
  return {
    id: p.id,
    slug: p.slug,
    seller: seller.name,
    name: p.name,
    nameAm: p.nameAm,
    price: p.price,
    rating: p.rating,
    verified: seller.verified,
    img: p.img,
    dot: seller.dotClass,
  };
});

function Index() {
  const [lang, setLang] = useState<Lang>("en");
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({ "p-2": true });
  const t = (en: string, am: string) => (lang === "en" ? en : am);

  return (
    <div className="min-h-screen bg-soft-clay text-ethio-charcoal pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
          <div className="flex flex-col leading-none">
            <span className="font-display text-2xl font-bold tracking-tight text-heritage-red">
              ADDIX
            </span>
            <span
              className="text-[10px] uppercase tracking-[0.25em] text-heritage-gold font-semibold mt-0.5"
              style={{ fontFamily: "var(--font-amharic)" }}
            >
              አዲስ አበባ
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "en" ? "am" : "en")}
              className="text-[11px] font-semibold border border-border rounded-full px-3 py-1.5 hover:bg-muted transition-colors"
              aria-label="Toggle language"
            >
              <span className={lang === "en" ? "text-ethio-charcoal" : "opacity-40"}>EN</span>
              <span className="mx-1 opacity-30">/</span>
              <span
                className={lang === "am" ? "text-ethio-charcoal" : "opacity-40"}
                style={{ fontFamily: "var(--font-amharic)" }}
              >
                አማ
              </span>
            </button>
            <button className="relative size-9 grid place-items-center rounded-full hover:bg-muted transition-colors">
              <span className="absolute top-1.5 right-1.5 size-2 bg-heritage-red rounded-full ring-2 ring-background" />
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md">
        {/* Greeting */}
        <section className="px-4 pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            {t("Selam, Rahel", "ሰላም ራሔል")}
          </p>
          <h1 className="font-display text-3xl leading-tight mt-1">
            {t("Discover Ethiopian", "ኢትዮጵያዊ")}
            <br />
            <span className="italic text-heritage-gold">{t("craft & culture.", "ጥበብ ያግኙ።")}</span>
          </h1>
        </section>

        {/* Search */}
        <section className="px-4 mt-5">
          <Link
            to="/search"
            className="relative block bg-card border border-border rounded-2xl py-4 pl-12 pr-14 text-sm shadow-sm text-muted-foreground"
          >
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-4" />
            {t("Search market…", "ገበያ ውስጥ ፈልግ…")}
            <span className="absolute right-2 top-1/2 -translate-y-1/2 size-10 rounded-xl bg-ethio-charcoal text-soft-clay grid place-items-center">
              <ArrowRight className="size-4" />
            </span>
          </Link>
        </section>

        {/* Hero Banner */}
        <section className="px-4 mt-6">
          <div className="relative overflow-hidden rounded-3xl bg-heritage-green min-h-44 text-soft-clay">
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="relative z-10 p-6 pr-40">
              <span className="bg-heritage-gold text-ethio-charcoal text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                {t("Limited Offer", "ውስን ቅናሽ")}
              </span>
              <h2 className="font-display text-2xl leading-tight mt-3">
                {t("Genuine Leather", "እውነተኛ ቆዳ")}
                <br />
                {t("from Modjo", "ከሞጆ")}
              </h2>
              <p className="text-xs text-soft-clay/80 mt-2">
                {t("Use coupon", "ኮድ ይጠቀሙ")}{" "}
                <span className="font-mono font-bold text-soft-clay tracking-wider">
                  ETHIO20
                </span>
              </p>
            </div>
            <img
              src={leatherBag}
              alt="Ethiopian leather bag"
              width={400}
              height={400}
              loading="lazy"
              className="absolute right-[-30px] bottom-[-30px] w-44 h-44 rounded-2xl object-cover rotate-12 shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </section>

        {/* Wallet / Tracking Cards */}
        <section className="mt-6 pl-4 flex gap-3 overflow-x-auto no-scrollbar pb-2 pr-4">
          <div className="flex-shrink-0 bg-card p-4 rounded-2xl border border-border shadow-sm min-w-[160px]">
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="size-3.5 text-heritage-gold" />
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                {t("Seller Wallet", "የሻጭ ኪስ")}
              </p>
            </div>
            <p className="font-display text-xl font-bold">
              12,450 <span className="text-xs text-muted-foreground font-sans">ETB</span>
            </p>
            <p className="text-[10px] text-heritage-green font-semibold mt-1 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-heritage-green" />
              {t("Ready to withdraw", "ለማውጣት ዝግጁ")}
            </p>
          </div>
          <div className="flex-shrink-0 bg-card p-4 rounded-2xl border border-border shadow-sm min-w-[160px]">
            <div className="flex items-center gap-1.5 mb-2">
              <Truck className="size-3.5 text-heritage-red" />
              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                {t("Active Order", "የሚላክ ትዕዛዝ")}
              </p>
            </div>
            <p className="font-display text-xl font-bold text-heritage-red">
              {t("En Route", "በመንገድ ላይ")}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {t("Arriving in 14 mins", "በ14 ደቂቃ ውስጥ")}
            </p>
          </div>
          <div className="flex-shrink-0 bg-ethio-charcoal p-4 rounded-2xl min-w-[160px] text-soft-clay">
            <div className="flex items-center gap-1.5 mb-2">
              <BadgeCheck className="size-3.5 text-heritage-gold" />
              <p className="text-[10px] uppercase font-semibold tracking-wider opacity-60">
                {t("Verified Sellers", "የተረጋገጡ")}
              </p>
            </div>
            <p className="font-display text-xl font-bold">1,284</p>
            <p className="text-[10px] opacity-60 mt-1">
              {t("Across Ethiopia", "በመላው ኢትዮጵያ")}
            </p>
          </div>
        </section>

        {/* Categories */}
        <section className="px-4 mt-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="font-display text-xl">{t("Categories", "ምድቦች")}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("Curated by our editors", "በእኛ የተመረጡ")}
              </p>
            </div>
            <button className="text-heritage-gold text-xs font-semibold flex items-center gap-1">
              {t("All", "ሁሉም")} <ArrowRight className="size-3" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((c) => (
              <button
                key={c.en}
                className="group flex flex-col items-center gap-2"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-card border border-border shadow-sm group-hover:shadow-md transition-shadow">
                  <img
                    src={c.img}
                    alt={c.en}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide leading-tight text-center">
                  {t(c.en, c.am)}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="px-4 mt-8">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h3 className="font-display text-xl">
                {t("Featured Products", "ተለይተው የተዘጋጁ")}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("From verified local sellers", "ከተረጋገጡ ሻጮች")}
              </p>
            </div>
            <button className="text-heritage-gold text-xs font-semibold flex items-center gap-1">
              {t("View All", "ሁሉንም ተመልከት")} <ArrowRight className="size-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {products.map((p) => {
              const liked = !!wishlist[p.id];
              return (
                <article
                  key={p.id}
                  className="relative bg-card rounded-2xl p-3 border border-border shadow-sm hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() =>
                      setWishlist((w) => ({ ...w, [p.id]: !w[p.id] }))
                    }
                    className="absolute top-5 right-5 z-10 size-8 bg-background/90 backdrop-blur rounded-full grid place-items-center text-heritage-red shadow-sm hover:scale-110 transition-transform"
                    aria-label="Toggle wishlist"
                  >
                    <Heart
                      className="size-4"
                      fill={liked ? "currentColor" : "none"}
                    />
                  </button>
                  <Link to="/product/$id" params={{ id: p.slug }} className="block relative">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-soft-clay mb-3">
                      <img
                        src={p.img}
                        alt={p.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {p.verified && (
                      <div className="absolute bottom-5 left-2 bg-ethio-charcoal/80 backdrop-blur text-soft-clay text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                        <BadgeCheck className="size-2.5" />
                        {t("Verified", "የተረጋገጠ")}
                      </div>
                    )}
                  </Link>
                  <Link to="/product/$id" params={{ id: p.slug }} className="block">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`size-2 rounded-full ${p.dot}`} />
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                      {p.seller}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold mb-1 truncate">
                    {lang === "en" ? p.name : p.nameAm}
                  </h4>
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-heritage-gold">
                      {p.price.toLocaleString()}{" "}
                      <span className="text-[10px] text-muted-foreground font-sans font-normal">
                        ETB
                      </span>
                    </span>
                    <span className="text-[10px] flex items-center gap-0.5 text-heritage-gold font-semibold">
                      <Star className="size-3 fill-current" />
                      {p.rating}
                    </span>
                  </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        {/* Delivery Tracking Card */}
        <section className="px-4 mt-8">
          <div className="bg-ethio-charcoal rounded-3xl p-5 text-soft-clay relative overflow-hidden">
            <div className="absolute -top-16 -right-16 size-48 rounded-full bg-heritage-gold/10 blur-2xl" />
            <div className="relative flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-1.5 text-heritage-gold text-[10px] uppercase tracking-widest font-semibold mb-1">
                  <MapPin className="size-3" />
                  {t("Live GPS", "ቀጥታ GPS")}
                </div>
                <h4 className="font-display text-lg">
                  {t("Current Delivery", "የአሁን ማድረሻ")}
                </h4>
                <p className="text-xs text-soft-clay/50 mt-0.5">Order #ADX-9921</p>
              </div>
              <span className="bg-soft-clay/10 text-[10px] px-3 py-1.5 rounded-full border border-soft-clay/10 font-semibold">
                {t("14 min", "14 ደቂቃ")}
              </span>
            </div>

            <div className="relative flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={courier}
                  alt="Courier"
                  width={48}
                  height={48}
                  loading="lazy"
                  className="size-12 rounded-2xl object-cover border border-soft-clay/10"
                />
                <div className="absolute -bottom-1 -right-1 size-5 bg-heritage-green border-2 border-ethio-charcoal rounded-full grid place-items-center">
                  <BadgeCheck className="size-3 text-soft-clay" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Dawit Mengistu</p>
                <p className="text-[11px] text-soft-clay/50 truncate">
                  {t("Telebirr payment confirmed", "የቴሌብር ክፍያ ተረጋግጧል")}
                </p>
              </div>
              <button className="bg-heritage-gold px-4 py-2 rounded-xl text-ethio-charcoal text-xs font-bold flex items-center gap-1.5 shrink-0">
                <Phone className="size-3.5" />
                {t("Call", "ደውል")}
              </button>
            </div>
          </div>
        </section>

        {/* Payment Row */}
        <section className="px-4 mt-6">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
            {t("Trusted Payments", "የተረጋገጠ ክፍያ")}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {["Chapa", "Telebirr", t("Cash on Delivery", "በእጅ")].map((m, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl py-3 text-center text-xs font-semibold shadow-sm"
              >
                {m}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border z-40">
        <div className="mx-auto max-w-md px-6 py-3 pb-5 flex justify-between items-center">
          <NavItem to="/" icon={Home} label={t("Home", "ቤት")} active />
          <NavItem to="/search" icon={Search} label={t("Search", "ፍለጋ")} />
          <NavItem to="/_authenticated/orders" icon={Package} label={t("Orders", "ትዕዛዞች")} />
          <NavItem to="/_authenticated/wallet" icon={Wallet} label={t("Wallet", "ቦርሳ")} />
          <NavItem to="/_authenticated/notifications" icon={Bell} label={t("Alerts", "ማሳወቂያ")} />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  badge,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 transition-colors ${
        active ? "text-heritage-red" : "text-ethio-charcoal/40 hover:text-ethio-charcoal"
      }`}
    >
      <div className="relative">
        <Icon className="size-5" />
        {badge ? (
          <span className="absolute -top-1.5 -right-2 bg-heritage-red text-soft-clay text-[9px] size-4 rounded-full grid place-items-center font-bold">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
    </Link>
  );
}
