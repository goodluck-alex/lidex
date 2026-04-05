"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui";
import { apiDelete, apiGet, apiPatch, apiPost } from "../../services/api";
import { me } from "../../wallet/auth";
import { P2PNav, type P2PTabId } from "./P2PNav";

/** P2P-supported assets; LDX is Lidex on BSC — see shared/tokens/ldx.js */
const TOKENS = ["USDT", "LDX", "BTC", "ETH"] as const;
const FIATS = ["UGX", "KES", "NGN", "USD"] as const;

type AdRow = {
  id: string;
  side: string;
  tokenSymbol: string;
  fiatCurrency: string;
  priceType: string;
  price: string;
  amountMin: string;
  amountMax: string;
  paymentMethodLabel: string;
  timeLimitMinutes: number;
  merchantLabel: string;
  merchantVerified: boolean;
  orderCount: number;
};

type MyAd = {
  id: string;
  status: string;
  side: string;
  tokenSymbol: string;
  fiatCurrency: string;
  price: string;
  amountMin: string;
  amountMax: string;
  paymentMethodLabel: string;
  orderCount: number;
};

function cardClass() {
  return "rounded-2xl border border-white/10 bg-[#0B0F1A] p-5 shadow-xl";
}

function inputClass() {
  return "mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none focus:border-[#00c896]/40";
}

function P2PHubInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp?.get("tab") as P2PTabId) || "express";
  const active: P2PTabId = ["express", "trading", "ads", "create"].includes(tab) ? tab : "express";

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [flow, setFlow] = useState<"buy" | "sell">("buy");
  const [token, setToken] = useState("USDT");
  const [fiat, setFiat] = useState("UGX");
  const [amountFiat, setAmountFiat] = useState("100000");
  const [payMethod, setPayMethod] = useState("Mobile Money");
  const [expressMatch, setExpressMatch] = useState<AdRow | null>(null);
  const [expressErr, setExpressErr] = useState<string | null>(null);
  const [expressLoading, setExpressLoading] = useState(false);

  const [ads, setAds] = useState<AdRow[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [filterPay, setFilterPay] = useState("");
  const [filterMerchant, setFilterMerchant] = useState(false);
  const [filterAmt, setFilterAmt] = useState("");

  const [myAds, setMyAds] = useState<MyAd[]>([]);
  const [myAdsLoading, setMyAdsLoading] = useState(false);

  const [createSide, setCreateSide] = useState<"buy" | "sell">("sell");
  const [cToken, setCToken] = useState("USDT");
  const [cFiat, setCFiat] = useState("UGX");
  const [priceType, setPriceType] = useState<"fixed" | "market">("fixed");
  const [cPrice, setCPrice] = useState("3800");
  const [cMin, setCMin] = useState("50000");
  const [cMax, setCMax] = useState("2000000");
  const [cPay, setCPay] = useState("Mobile Money");
  const [cLimit, setCLimit] = useState("15");
  const [cTerms, setCTerms] = useState("");
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const refreshMe = useCallback(async () => {
    try {
      const r = await me();
      setUserId(r.user?.id ?? null);
    } catch {
      setUserId(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const loadMarket = useCallback(async () => {
    setAdsLoading(true);
    try {
      const r = await apiGet<{ ok: true; ads: AdRow[] }>(
        `/v1/p2p/ads?flow=${flow}&token=${encodeURIComponent(token)}&fiat=${encodeURIComponent(fiat)}${filterMerchant ? "&merchant=1" : ""}`
      );
      let list = r.ads || [];
      if (filterPay.trim()) {
        const f = filterPay.trim().toLowerCase();
        list = list.filter((a) => a.paymentMethodLabel.toLowerCase().includes(f));
      }
      if (filterAmt.trim()) {
        const n = Number(filterAmt.replace(/,/g, ""));
        if (Number.isFinite(n) && n > 0) {
          list = list.filter((a) => Number(a.amountMin) <= n && Number(a.amountMax) >= n);
        }
      }
      setAds(list);
    } catch (e) {
      setAds([]);
    } finally {
      setAdsLoading(false);
    }
  }, [flow, token, fiat, filterMerchant, filterPay, filterAmt]);

  useEffect(() => {
    if (active === "trading") void loadMarket();
  }, [active, loadMarket]);

  const loadMyAds = useCallback(async () => {
    if (!userId) return;
    setMyAdsLoading(true);
    try {
      const r = await apiGet<{ ok: true; ads: MyAd[] }>("/v1/p2p/ads/mine");
      setMyAds(r.ads || []);
    } catch {
      setMyAds([]);
    } finally {
      setMyAdsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (active === "ads" && userId) void loadMyAds();
  }, [active, userId, loadMyAds]);

  async function onExpressFind() {
    setExpressErr(null);
    setExpressMatch(null);
    setExpressLoading(true);
    try {
      const r = await apiPost<{ ok: true; matched: boolean; ad: AdRow | null }>("/v1/p2p/express/match", {
        flow,
        token,
        fiat,
        amountFiat,
        paymentMethod: payMethod
      });
      if (r.matched && r.ad) setExpressMatch(r.ad);
      else setExpressErr("No listing matches right now. Try P2P Trading or change amount / payment.");
    } catch (e) {
      setExpressErr(e instanceof Error ? e.message : "Match failed");
    } finally {
      setExpressLoading(false);
    }
  }

  async function startOrderFromExpress() {
    if (!expressMatch || !userId) return;
    try {
      const r = await apiPost<{ ok: true; order: { id: string } }>("/v1/p2p/orders", {
        adId: expressMatch.id,
        fiatAmount: amountFiat.replace(/,/g, "")
      });
      router.push(`/p2p/order/${r.order.id}`);
    } catch (e) {
      setExpressErr(e instanceof Error ? e.message : "Could not open trade");
    }
  }

  async function buyFromRow(ad: AdRow) {
    if (!userId) {
      router.push("/wallet");
      return;
    }
    const raw = window.prompt(`Fiat amount (${ad.fiatCurrency}), limits ${ad.amountMin}–${ad.amountMax}`, ad.amountMin);
    if (raw == null) return;
    try {
      const r = await apiPost<{ ok: true; order: { id: string } }>("/v1/p2p/orders", {
        adId: ad.id,
        fiatAmount: raw.replace(/,/g, "")
      });
      router.push(`/p2p/order/${r.order.id}`);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Order failed");
    }
  }

  async function submitCreateAd() {
    setCreateMsg(null);
    if (!userId) {
      router.push("/wallet");
      return;
    }
    try {
      await apiPost("/v1/p2p/ads", {
        side: createSide,
        tokenSymbol: cToken,
        fiatCurrency: cFiat,
        priceType,
        price: cPrice.replace(/,/g, ""),
        amountMin: cMin.replace(/,/g, ""),
        amountMax: cMax.replace(/,/g, ""),
        paymentMethodLabel: cPay,
        timeLimitMinutes: Number(cLimit) || 15,
        terms: cTerms || undefined
      });
      setCreateMsg("Ad created.");
      void loadMyAds();
      router.push("/p2p?tab=ads");
    } catch (e) {
      setCreateMsg(e instanceof Error ? e.message : "Failed");
    }
  }

  async function toggleAdPause(ad: MyAd) {
    try {
      await apiPatch(`/v1/p2p/ads/${ad.id}`, { status: ad.status === "active" ? "paused" : "active" });
      void loadMyAds();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  async function deleteAd(ad: MyAd) {
    if (!window.confirm("Delete this ad?")) return;
    try {
      await apiDelete(`/v1/p2p/ads/${ad.id}`);
      void loadMyAds();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function editAdPrice(ad: MyAd) {
    const p = window.prompt("New price (fiat per 1 token)", ad.price);
    if (p == null) return;
    try {
      await apiPatch(`/v1/p2p/ads/${ad.id}`, { price: p.replace(/,/g, "") });
      void loadMyAds();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Update failed");
    }
  }

  const authHint = useMemo(
    () => (
      <div className="rounded-xl border border-[#2979ff]/30 bg-[#2979ff]/10 px-3 py-2 text-sm text-white/85">
        Connect your wallet and complete <Link className="text-[#7aa7ff] underline" href="/wallet">sign-in on the Wallet page</Link> to post ads, pay, and chat on orders.
      </div>
    ),
    []
  );

  return (
    <>
      <P2PNav active={active} />

      {!authChecked ? null : !userId && (active === "ads" || active === "create") ? <div className="mb-4">{authHint}</div> : null}

      {active === "express" ? (
        <div className={cardClass()}>
          <h2 className="text-lg font-semibold text-white">Express</h2>
          <p className="mt-0.5 text-sm text-gray-400">Quick buy/sell — we pick the best listed price for your amount.</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setFlow("buy")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${flow === "buy" ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/5 text-white/75"}`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setFlow("sell")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${flow === "sell" ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/5 text-white/75"}`}
            >
              Sell
            </button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-white/50">Token</label>
              <select className={inputClass()} value={token} onChange={(e) => setToken(e.target.value)}>
                {TOKENS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/50">Currency</label>
              <select className={inputClass()} value={fiat} onChange={(e) => setFiat(e.target.value)}>
                {FIATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/50">Amount (fiat)</label>
              <input className={inputClass()} value={amountFiat} onChange={(e) => setAmountFiat(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/50">Payment method</label>
              <input className={inputClass()} value={payMethod} onChange={(e) => setPayMethod(e.target.value)} placeholder="Mobile Money" />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => void onExpressFind()} disabled={expressLoading}>
              {expressLoading ? "Searching…" : "Find sellers"}
            </Button>
          </div>
          {expressErr ? <div className="mt-3 text-sm text-red-300/95">{expressErr}</div> : null}
          {expressMatch ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm font-semibold text-white">Best match</div>
              <div className="mt-2 space-y-1 text-xs text-gray-400">
                <div>
                  Merchant: <span className="text-white/90">{expressMatch.merchantLabel}</span>
                  {expressMatch.merchantVerified ? <span className="ml-2 text-[#00c896]">✓</span> : null}
                </div>
                <div>
                  Price:{" "}
                  <span className="text-white/90">
                    {expressMatch.price} {expressMatch.fiatCurrency}/{expressMatch.tokenSymbol}
                  </span>
                </div>
                <div>
                  Limit: {expressMatch.amountMin}–{expressMatch.amountMax} {expressMatch.fiatCurrency}
                </div>
                <div>Pay with: {expressMatch.paymentMethodLabel}</div>
              </div>
              {!userId ? (
                <div className="mt-3">{authHint}</div>
              ) : (
                <div className="mt-3">
                  <Button onClick={() => void startOrderFromExpress()}>Open trade</Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {active === "trading" ? (
        <div className={cardClass()}>
          <h2 className="text-lg font-semibold text-white">P2P Trading</h2>
          <p className="mt-0.5 text-sm text-gray-400">Marketplace — Buy shows sellers; Sell shows buyers.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFlow("buy")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${flow === "buy" ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/5 text-white/75"}`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setFlow("sell")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${flow === "sell" ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/5 text-white/75"}`}
            >
              Sell
            </button>
            {TOKENS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setToken(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${token === t ? "bg-white/15 text-white" : "text-white/60 hover:bg-white/10"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs text-white/50">Fiat</label>
              <select className={inputClass()} value={fiat} onChange={(e) => setFiat(e.target.value)}>
                {FIATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50">Payment contains</label>
              <input className={inputClass()} value={filterPay} onChange={(e) => setFilterPay(e.target.value)} placeholder="MTN, Bank…" />
            </div>
            <div>
              <label className="text-xs text-white/50">Amount fits (fiat)</label>
              <input className={inputClass()} value={filterAmt} onChange={(e) => setFilterAmt(e.target.value)} placeholder="optional" />
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={filterMerchant} onChange={(e) => setFilterMerchant(e.target.checked)} />
            Verified merchants only
          </label>
          <div className="mt-3">
            <Button variant="secondary" className="!text-xs" onClick={() => void loadMarket()}>
              Refresh
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="py-2 pr-2">Merchant</th>
                  <th className="py-2 pr-2">Price</th>
                  <th className="py-2 pr-2">Limit</th>
                  <th className="py-2 pr-2">Payment</th>
                  <th className="py-2">Trade</th>
                </tr>
              </thead>
              <tbody>
                {adsLoading ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-white/60">
                      Loading…
                    </td>
                  </tr>
                ) : ads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-white/60">
                      No ads yet. Be the first to <Link className="text-[#7aa7ff] underline" href="/p2p?tab=create">create one</Link>.
                    </td>
                  </tr>
                ) : (
                  ads.map((a) => (
                    <tr key={a.id} className="border-b border-white/[0.06] text-white/85">
                      <td className="py-2.5 pr-2">
                        {a.merchantLabel}
                        {a.merchantVerified ? <span className="ml-1 text-[#00c896]">✓</span> : null}
                      </td>
                      <td className="py-2.5 pr-2">
                        {a.price} {a.fiatCurrency}
                      </td>
                      <td className="py-2.5 pr-2">
                        {a.amountMin}–{a.amountMax}
                      </td>
                      <td className="py-2.5 pr-2">{a.paymentMethodLabel}</td>
                      <td className="py-2.5">
                        <Button className="!px-2 !py-1 !text-xs" onClick={() => void buyFromRow(a)}>
                          {flow === "buy" ? "Buy" : "Sell"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {active === "ads" ? (
        <div className={cardClass()}>
          <h2 className="text-lg font-semibold text-white">Your Ads</h2>
          {!userId ? (
            authHint
          ) : myAdsLoading ? (
            <p className="mt-3 text-sm text-white/60">Loading…</p>
          ) : myAds.length === 0 ? (
            <p className="mt-3 text-sm text-white/60">No ads yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {myAds.map((ad) => (
                <div key={ad.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">
                      {ad.status} · {ad.side.toUpperCase()} {ad.tokenSymbol}/{ad.fiatCurrency}
                    </span>
                    <span className="text-xs text-white/55">{ad.orderCount} orders</span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    Price {ad.price} · Limit {ad.amountMin}–{ad.amountMax} · {ad.paymentMethodLabel}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" className="!text-xs" onClick={() => void editAdPrice(ad)}>
                      Edit price
                    </Button>
                    <Button variant="secondary" className="!text-xs" onClick={() => void toggleAdPause(ad)}>
                      {ad.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button variant="danger" className="!text-xs" onClick={() => void deleteAd(ad)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {active === "create" ? (
        <div className={cardClass()}>
          <h2 className="text-lg font-semibold text-white">Create Ad</h2>
          <p className="mt-0.5 text-sm text-gray-400">Sell = you sell crypto for fiat. Buy = you buy crypto with fiat.</p>
          {!userId ? (
            <div className="mt-4">{authHint}</div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreateSide("buy")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${createSide === "buy" ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/5"}`}
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={() => setCreateSide("sell")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${createSide === "sell" ? "bg-[#00c896]/25 text-[#b8f5e0]" : "bg-white/5"}`}
                >
                  Sell
                </button>
              </div>
              <div>
                <label className="text-xs text-white/50">Token</label>
                <select className={inputClass()} value={cToken} onChange={(e) => setCToken(e.target.value)}>
                  {TOKENS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50">Currency</label>
                <select className={inputClass()} value={cFiat} onChange={(e) => setCFiat(e.target.value)}>
                  {FIATS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50">Price type</label>
                <select
                  className={inputClass()}
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value as "fixed" | "market")}
                >
                  <option value="fixed">Fixed</option>
                  <option value="market">Market</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/50">Price (fiat per 1 token)</label>
                <input className={inputClass()} value={cPrice} onChange={(e) => setCPrice(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/50">Min fiat</label>
                <input className={inputClass()} value={cMin} onChange={(e) => setCMin(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/50">Max fiat</label>
                <input className={inputClass()} value={cMax} onChange={(e) => setCMax(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/50">Payment method</label>
                <input className={inputClass()} value={cPay} onChange={(e) => setCPay(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/50">Time limit (minutes)</label>
                <input className={inputClass()} value={cLimit} onChange={(e) => setCLimit(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-white/50">Terms (optional)</label>
                <textarea className={`${inputClass()} min-h-[80px]`} value={cTerms} onChange={(e) => setCTerms(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => void submitCreateAd()}>Create Ad</Button>
                {createMsg ? <p className="mt-2 text-sm text-[#b8f5e0]">{createMsg}</p> : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

export default function P2PPage() {
  return (
    <Suspense fallback={<div className="text-sm text-white/60">Loading P2P…</div>}>
      <P2PHubInner />
    </Suspense>
  );
}
