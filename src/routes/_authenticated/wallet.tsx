import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Wallet as WalletIcon, ArrowDownToLine, Loader2, Send } from "lucide-react";
import { myWallet, requestWithdrawal } from "@/lib/marketplace.functions";
import { ETB } from "@/lib/catalog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const fetchWallet = useServerFn(myWallet);
  const withdraw = useServerFn(requestWithdrawal);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["wallet"], queryFn: () => fetchWallet() });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("telebirr");
  const [details, setDetails] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: (v: { sellerId: string; amount: number; method: string; accountDetails: string }) => withdraw({ data: v }),
    onSuccess: () => {
      setMsg("Withdrawal requested.");
      setAmount("");
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e) => setMsg((e as Error).message),
  });

  return (
    <div className="min-h-screen bg-soft-clay pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
          <Link to="/" className="size-9 grid place-items-center rounded-full hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="font-display text-lg">Wallet</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pt-4">
        <div className="bg-ethio-charcoal text-soft-clay rounded-3xl p-6 shadow-lg">
          <div className="flex items-center gap-1.5 text-heritage-gold text-[10px] uppercase tracking-widest font-semibold">
            <WalletIcon className="size-3" /> Available balance
          </div>
          <p className="font-display text-4xl font-bold text-heritage-gold mt-2">
            {isLoading ? "…" : ETB(data?.balance ?? 0)}
          </p>
          <p className="text-[11px] opacity-60 mt-1">Across {data?.sellers.length ?? 0} storefront{data?.sellers.length === 1 ? "" : "s"}</p>
        </div>

        {!isLoading && !data?.sellers.length && (
          <div className="mt-6 bg-card border border-border rounded-2xl p-5 text-center">
            <p className="text-sm text-muted-foreground">
              You don't own a seller storefront yet. Contact an admin to link your account to a seller to start earning.
            </p>
          </div>
        )}

        {!!data?.sellers.length && (
          <>
            <section className="mt-6 bg-card border border-border rounded-2xl p-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <ArrowDownToLine className="size-3" /> Request withdrawal
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const seller = data!.sellers[0];
                  const amt = Number(amount);
                  if (!seller || !amt || amt > (data?.balance ?? 0)) {
                    setMsg("Enter a valid amount up to your balance.");
                    return;
                  }
                  mut.mutate({ sellerId: seller.id, amount: amt, method, accountDetails: details });
                }}
                className="space-y-2"
              >
                <input
                  inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount (ETB)"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
                />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm">
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe">CBE Bank Transfer</option>
                  <option value="chapa">Chapa Payout</option>
                </select>
                <input
                  value={details} onChange={(e) => setDetails(e.target.value)}
                  placeholder="Account number / phone"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm"
                />
                <button disabled={mut.isPending} className="w-full h-11 rounded-full bg-heritage-red text-soft-clay font-bold text-sm flex items-center justify-center gap-2">
                  {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Request payout
                </button>
                {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
              </form>
            </section>

            <section className="mt-6">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2 px-1">Recent activity</p>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                {(data?.txs ?? []).slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-semibold capitalize">{t.kind}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                    </div>
                    <p className={`text-sm font-bold ${t.kind === "withdrawal" ? "text-heritage-red" : "text-heritage-green"}`}>
                      {t.kind === "withdrawal" ? "−" : "+"}{ETB(Number(t.amount))}
                    </p>
                  </div>
                ))}
                {!data?.txs?.length && <p className="p-4 text-xs text-muted-foreground">No transactions yet.</p>}
              </div>
            </section>

            <section className="mt-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2 px-1">Withdrawals</p>
              <div className="bg-card border border-border rounded-2xl divide-y divide-border">
                {(data?.withdrawals ?? []).map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3">
                    <div>
                      <p className="text-sm font-semibold">{ETB(Number(w.amount))} · {w.method}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-muted">{w.status}</span>
                  </div>
                ))}
                {!data?.withdrawals?.length && <p className="p-4 text-xs text-muted-foreground">No withdrawal requests yet.</p>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}