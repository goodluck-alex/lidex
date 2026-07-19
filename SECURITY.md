# Security policy

Do not report vulnerabilities through public issues. Establish a monitored private address such as `security@lidex.network` before publishing this repository and add a PGP key and response SLA.

Never commit mnemonics, private keys, signing keystores, database credentials, RPC provider keys, Firebase admin keys, JWT secrets, or production `.env` files. Rotate any secret that is exposed, even briefly.

The mobile vault stores personal-wallet material only after AES-256-GCM encryption. Its encryption key is placed in platform secure storage. Production security review must still cover device compromise, backup behavior, memory exposure, screenshots, logs, accessibility overlays, supply-chain risk, and biometric fallback.

The API must never accept a personal-wallet seed phrase or private key. Production exchange custody belongs in audited HSM/MPC infrastructure with policy-enforced signing.
