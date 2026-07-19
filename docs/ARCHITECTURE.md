# Architecture

## Trust boundaries

1. **Personal wallet:** non-custodial. Entropy, mnemonic, derivation, and signing stay on the mobile device. Encrypted wallet blobs are useless without the Keychain/Keystore-held master key.
2. **Exchange account:** custodial ledger balance. The API records account state; production signing must be delegated to HSM/MPC infrastructure with approval policies.
3. **Blockchain gateway:** read-only RPC access in the API foundation. It exposes LDX balance and transaction state. A production indexer owns deposit detection, reorg recovery, and confirmation finality.
4. **Rewards:** append-only ledger entries with user-scoped idempotency keys. Conversion is 100 points = 1 LDX; current monthly unlock rate is 20%.

## Mobile layers

- `config`: color tokens, themes, environment configuration
- `core`: GoRouter, Dio, secure wallet vault, BSC/LDX client, shared providers
- `models`: strongly typed presentation/domain records
- `shared/widgets`: reusable cards, buttons, actions, tiles, skeletons, sheets
- `features`: feature-first presentation and data code

Riverpod owns injectable services and session state. Freezed generates the immutable session union. Flutter Hooks drives lifecycle-safe presentation animation. GoRouter preserves each bottom-tab navigation stack.

## API modules

- `auth`: registration, login, refresh rotation, logout
- `users`: profile and device sessions
- `wallets`: public wallet registration, exchange account, transaction history
- `blockchain`: BSC LDX reads and transaction status
- `trading`: markets and idempotent order intake
- `rewards`: totals, activity, idempotent check-in, leaderboard
- `referrals`: unique code/link and statistics
- `staking`: position intake and summary
- `notifications`: inbox and read state
- `settings`: client defaults
- `health`: database-backed liveness response

## Financial invariants to add before launch

- Double-entry journal: every exchange balance mutation must create balanced debit and credit postings in one serializable database transaction.
- Available, held, and settled balances must be separate.
- Withdrawal requests require an idempotency key, risk decision, velocity limits, address validation, fee quote, and approval state machine.
- Deposit crediting must tolerate duplicate events and chain reorganizations.
- Prices and order fills use decimal/integer arithmetic only; never floating point.
- Reward grants and unlocks remain append-only and independently reconcilable.

## Performance targets

- Defer Firebase and noncritical service startup after first frame where product requirements permit.
- Cache market and chain reads briefly; never cache authorization decisions or final ledger balances without explicit consistency rules.
- Paginate transaction/activity lists and use background isolates for large payload transforms.
- Profile cold start and jank on representative low/mid/high-tier devices in release mode.
