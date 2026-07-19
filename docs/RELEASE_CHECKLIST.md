# Production release checklist

## Mobile

- [ ] Replace demo balances, prices, names, wallet address, and activities with API-backed Riverpod repositories.
- [ ] Configure Firebase per environment; test foreground/background/terminated notifications.
- [ ] Add a mandatory PIN setup and retry lockout; require biometric/PIN before seed reveal or signing.
- [ ] Add recovery-phrase verification (random word positions), clipboard warnings, screenshot blocking, and Android backup exclusion.
- [ ] Add transaction simulation, fee quote, recipient checksum, chain-ID confirmation, and human-readable signing confirmation.
- [ ] Add certificate pinning with a safe key-rotation strategy.
- [ ] Configure release signing, obfuscation/symbol upload, app links, privacy manifests, and store disclosures.
- [ ] Run static analysis, dependency/SBOM scans, rooted/jailbroken-device policy review, and independent penetration testing.
- [ ] Test WCAG text scaling, screen readers, contrast, reduced motion, localization, and offline/error states.

## Backend and operations

- [ ] Replace development secrets; use a secrets manager with rotation and least privilege.
- [ ] Add email verification, password reset, MFA, compromised-password screening, and session revocation endpoints.
- [ ] Add double-entry exchange ledger, holds, immutable audit events, reconciliation, and accounting tests.
- [ ] Integrate KYC/AML, sanctions, fraud scoring, travel-rule requirements, and jurisdiction controls.
- [ ] Integrate HSM/MPC custody; application services must never hold raw exchange private keys.
- [ ] Build BSC indexer workers with safe block lag, reorg rollback, replay, and idempotent crediting.
- [ ] Add withdrawal policy engine, allowlists, velocity limits, approval workflow, and emergency stop.
- [ ] Add queue workers, FCM sender, price feed, order engine/vendor adapter, webhooks, and dead-letter queues.
- [ ] Enforce TLS, WAF/API gateway limits, private database/Redis networking, encryption at rest, and egress allowlists.
- [ ] Add structured logs with redaction, metrics, traces, SLOs, alerts, SIEM, and immutable audit storage.
- [ ] Verify backups, point-in-time recovery, multi-region DR, incident playbooks, and tabletop exercises.

## Smart contract and token

- [ ] Verify contract source and proxy/ownership state on BscScan.
- [ ] Confirm decimals and token metadata from chain rather than assumptions.
- [ ] Complete third-party contract audit and admin-key/upgrade review.
- [ ] Validate transfer-tax, pause, blacklist, permit, and nonstandard return behavior if present.
- [ ] Run BSC testnet and limited-mainnet canaries before broad availability.

## Governance

- [ ] Obtain legal review for custody, exchange, staking, rewards, privacy, consumer protection, and marketing claims.
- [ ] Publish terms, privacy policy, risk disclosures, fee schedule, complaints process, and data-retention policy.
- [ ] Define key ceremonies, access reviews, vendor risk, vulnerability disclosure, and responsible rollback ownership.
