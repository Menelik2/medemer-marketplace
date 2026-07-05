import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, BadgeCheck, Star, ArrowLeft, X } from "lucide-react";
import { CATEGORIES, ETB, searchCatalog, type Category, type SearchFilters } from "@/lib/catalog";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — ADDIX Marketplace" },
      { name: "description", content: "Search Ethiopian marketplace with category, price and verified-seller filters." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [priceMax, setPriceMax] = useState(6000);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filters: SearchFilters = { q, category, max: priceMax, verifiedOnly };
  const { hits, suggestions, facets } = useMemo(() => searchCatalog(filters), [q, category, priceMax, verifiedOnly]);
  const activeCount = [category, verifiedOnly, priceMax < 6000].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-soft-clay pb-16">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search market…"
              className="w-full bg-card border border-border rounded-2xl py-3 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 size-6 grid place-items-center text-muted-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters((s) => !s)} className="relative size-9 grid place-items-center rounded-full hover:bg-muted">
            <SlidersHorizontal className="size-4" />
            {activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-heritage-red text-soft-clay text-[9px] font-bold grid place-items-center">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mx-auto max-w-md px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setQ(s)}
                className="text-xs px-3 py-1.5 rounded-full bg-muted border border-border whitespace-nowrap font-medium hover:bg-accent/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {showFilters && (
          <div className="mx-auto max-w-md px-4 pb-4 border-t border-border pt-4 space-y-4 animate-in fade-in">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Category</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={!category} onClick={() => setCategory(undefined)}>All</FilterChip>
                {CATEGORIES.map((c) => (
                  <FilterChip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)}>
                    {c.en} <span className="opacity-40">({facets.categories[c.key] ?? 0})</span>
                  </FilterChip>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Max price</p>
                <p className="text-xs font-semibold text-heritage-gold">{ETB(priceMax)}</p>
              </div>
              <input
                type="range"
                min={facets.priceRange[0]}
                max={facets.priceRange[1]}
                step={100}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-heritage-gold"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-heritage-red size-4" />
              <span className="text-sm font-medium flex items-center gap-1">
                <BadgeCheck className="size-3.5 text-heritage-gold" />
                Verified sellers only
                <span className="text-muted-foreground text-xs">({facets.verified})</span>
              </span>
            </label>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-3">
          <span className="font-semibold text-ethio-charcoal">{hits.length}</span> results
        </p>

        {hits.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No products match those filters.</div>
        ) : (
          <ul className="space-y-3">
            {hits.map((p) => (
              <li key={p.id}>
                <Link
                  to="/product/$id"
                  params={{ id: p.slug }}
                  className="flex gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm hover:shadow-md transition"
                >
                  <img src={p.img} alt={p.name} loading="lazy" className="size-20 rounded-xl object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`size-2 rounded-full ${p.seller.dotClass}`} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{p.seller.name}</span>
                      {p.seller.verified && <BadgeCheck className="size-3 text-heritage-gold shrink-0" />}
                    </div>
                    <h3 className="text-sm font-semibold truncate">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-display font-bold text-heritage-gold">{ETB(p.price)}</span>
                      <span className="text-[10px] flex items-center gap-0.5 text-heritage-gold font-semibold">
                        <Star className="size-3 fill-current" />
                        {p.rating}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition ${
        active
          ? "bg-ethio-charcoal text-soft-clay border-ethio-charcoal"
          : "bg-card border-border text-ethio-charcoal hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
