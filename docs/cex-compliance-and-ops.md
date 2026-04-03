# CEX custody — compliance, reconciliation, and operations

**Purpose:** Operational and governance scaffolding for teams running the **custodial / CEX** surface (internal ledger, on-chain deposit & withdraw, orderbook). This is **not legal advice**. Engage qualified counsel and compliance advisors for your jurisdiction and product shape.

**Related:** [`phase-3-plan.md`](./phase-3-plan.md) · [`phase-3-tracking.md`](./phase-3-tracking.md) · [`architecture.md`](./architecture.md) §3 (DEX vs CEX liquidity).

---

## 1. Scope reminder

| Surface | Custody | This doc |
|---------|---------|----------|
| **DEX mode** | Non-custodial swap (0x) | Light touch; referrals/fees only |
| **CEX mode** | Internal balances + optional on-chain bridge | **Primary focus** |

---

## 2. Regulatory and licensing (counsel-led checklist)

Work through with legal **before** marketing custodial or exchange services. Tick when your counsel has documented a position (not engineering).

- [ ] **Jurisdiction of the operator** and of **target users** (geo-fencing, sanctions).
- [ ] Whether activity constitutes **custody of crypto-assets**, **exchange / matching**, **broking**, **e-money**, or other regulated categories locally.
- [ ] **Registration or licensing** timelines and ongoing obligations (reporting, audits).
- [ ] **Marketing claims** vs actual product (no “non-custodial” messaging for CEX balances).
- [ ] **Stablecoin / fiat** touchpoints (if added later): banking, MSB/Money Transmitter, travel rule — **out of scope** for current scaffold unless you add them.
- [ ] **Privacy**: what PII you store (wallet address, IP, session, future KYC), retention, DPA/subprocessors.

**Deliverable:** short internal memo (owner + date) referencing external advice, stored in your control library — not in this repo.

---

## 3. KYC / AML program (design checklist)

Wallet-signature login **alone** is usually **not** a full KYC program. Decide explicitly:

- [ ] **Risk-based approach**: thresholds for enhanced due diligence (EDD).
- [ ] **Customer identification** (individual vs entity), **PEP/sanctions** screening vendor or process.
- [ ] **Transaction monitoring** rules (velocity, structuring patterns, geographic risk) — who reviews alerts.
- [ ] **Record retention** period and format (aligned with local law).
- [ ] **Suspicious activity** internal escalation path and **nominated officer** (or equivalent).
- [ ] **Travel Rule** readiness if you introduce **counterparty VASP** transfers.

**Pilot / sandbox:** document **max user count**, **max total custodial exposure**, and **allowed jurisdictions** until full program is live.

---

## 4. Terms, risk disclosures, and user communications

- [ ] **Terms of use** distinguish DEX vs CEX; describe custody, fees, withdrawal process, and tech risks (chain reorgs, contract risk for tokens you list).
- [ ] **Risk disclosure** for trading (loss of capital, volatility, operational risk).
- [ ] **Incident communications**: template for “we are investigating / we have contained / funds at risk / no loss” (review with counsel).

---

## 5. Reconciliation (internal ledger ↔ chain)

### 5.1 What you are proving

For each **supported chain** and **asset**:

1. **User liabilities** — sum of custodial balances the system owes users (plus any fee treasury / operational accounts modeled in the same DB).
2. **On-chain inventory** — tokens (and native coin for gas) held at **deposit** and **hot** wallets used by the bridge.
3. **Invariant (conceptual):** on-chain assets + clear **float policy** should match your **accounting model** (e.g. pooled custody with documented haircuts, treasury wallets excluded from user-total, etc.). Define the formula **in writing** for your deployment.

The app stores:

| Store | Prisma / table (see `schema.prisma`) | Role |
|-------|-------------------------------------|------|
| Per-user balances | `CexBalance` (`cex_balances`) | `available`, `locked` per `userId` + `asset` |
| Audit log | `CexLedgerEntry` (`cex_ledger_entries`) | Movements: trades, deposits, withdraws, fees, `liquidity_*`, `liquidity_reward`, etc. |
| Credited deposits | `CexOnchainDeposit` | One row per credited ERC-20 `Transfer` log |
| Withdrawal pipeline | `CexOnchainWithdrawal` | Status + `txHash` when broadcast |
| Internal LP (Phase 4) | `CexLiquidityPool`, `CexLiquidityPosition` | Reserve / share accounting once liquidity writes ship; include in reconciliation when non-zero |

On-chain observation:

- **`GET /v1/cex/onchain/treasury`** (authenticated CEX user, ops-oriented) — deposit + hot balances and native warnings (env `CEX_TREASURY_WARN_NATIVE_ETH`).
- Block explorer(s) configured via **`CEX_BLOCK_EXPLORER_URL`**.

### 5.2 Suggested cadence

| Frequency | Task |
|-----------|------|
| **Daily** (pilot) | Compare aggregate `CexBalance` per asset vs prior day + new ledger entries; spot-check largest on-chain deposit + largest withdraw `tx_hash`. |
| **Weekly** | Full reconciliation pack: SQL exports + treasury snapshot + notes on exceptions. |
| **Per incident** | Ad-hoc full replay from ledger + chain for affected users/assets. |

### 5.3 Example queries (Postgres / Prisma naming)

Adjust schemas to your DB. Illustrative only:

```sql
-- Aggregate user liabilities by asset
SELECT asset,
       SUM(available::numeric) AS total_available,
       SUM(locked::numeric)    AS total_locked
FROM cex_balances
GROUP BY asset
ORDER BY asset;

-- On-chain credited deposits (should align with ledger deposit_onchain credits over time)
SELECT asset, COUNT(*), SUM(amount::numeric)
FROM cex_onchain_deposits
GROUP BY asset;
```

**Investigate drift when:**

- Chain balance **<** sum needed for pending withdraws + regulatory buffer (define buffer).
- Ledger sums move without matching `cex_ledger_entries` / known order flow.
- Deposit poller or manual confirm **double-credit** (unique key on `chainId`+`txHash`+`logIndex` should prevent; still watch for logic bugs).

### 5.4 Deliverables

- [ ] **Reconciliation owner** (name/role) and **backup**.
- [ ] **Spreadsheet or BI** with last-run date, signer, and link to SQL/exports.
- [ ] **Materiality threshold** (e.g. “investigate & escalate if > X units or > Y% day-over-day delta without explanation”).

---

## 6. Security and key management

- [ ] **`CEX_HOT_WALLET_PRIVATE_KEY`** (and any future keys) in **HSM / vault / sealed secret manager** — never in git or plain `.env` in prod.
- [ ] **Key ceremonies** documented; **multi-sig** or withdrawal limits if treasury grows.
- [ ] **Access control** to production DB, RPC endpoints, and admin routes (`CEX_DEV_FUNDING`, etc. **off** in prod).
- [ ] **Incident runbook** for suspected key compromise: pause withdraw, rotate, notify users per counsel.

---

## 7. Incident response (lightweight outline)

| Severity | Examples | Initial actions |
|----------|----------|-------------------|
| **S1** | Suspected key leak, mass_balance anomaly | Pause outbound on-chain (`WITHDRAW_DISABLED` / ops kill-switch if you add one), preserve logs, page on-call, counsel |
| **S2** | Partial RPC outage, delayed deposits | Communicate status; monitor poller; no user panic statement until facts |
| **S3** | UI bug, wrong display | Fix forward; log postmortem |

- [ ] **On-call roster** and **escalation path** (engineering → lead → exec).
- [ ] **Log retention** sufficient for forensic timeline (API + DB + RPC provider if available).

---

## 8. Pilot launch checklist (operational)

Use before widening access beyond a closed group.

- [ ] **Env audit:** `CEX_ONCHAIN_*`, token addresses, chainId match production network; **`CEX_DEV_FUNDING`** false in prod.
- [ ] **Limits:** min notional / min qty env reviewed; optional **global** caps on withdraw volume/day (if implemented later).
- [ ] **Monitoring:** DB backups, RPC latency, treasury warning thresholds tested once.
- [ ] **Support path:** where users report stuck deposits/withdraws; operator knows how to trace `txHash` + `cex_onchain_*` rows.
- [ ] **Rollback plan:** feature-flag CEX mode off at edge vs API (cookie/mode) — document who flips what.

---

## 9. Review cycle

- [ ] **Quarterly** — re-read this doc + tracking file; update for new features (margin, fiat, new chains).
- [ ] **After any regulatory contact** — counsel review of product and disclosures.

---

## Related

| Doc | Use |
|-----|-----|
| [`phase-3-tracking.md`](./phase-3-tracking.md) | Sign-off table |
| [`backend/.env.example`](../backend/.env.example) | CEX env reference |
