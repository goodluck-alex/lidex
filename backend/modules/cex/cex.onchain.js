const { ethers } = require("ethers");
const { prisma } = require("../../lib/prisma");
const { recoverAddress } = require("../auth/auth.web3");
const { getBalanceRow, d, CEX_BASE_ASSET, CEX_QUOTE_ASSET } = require("./cex.balances");

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
];

const ERC20_BALANCE_ABI = ["function balanceOf(address owner) view returns (uint256)"];

const TRANSFER_IFACE = new ethers.Interface(ERC20_ABI);

function onchainEnabled() {
  return String(process.env.CEX_ONCHAIN_ENABLED || "").toLowerCase() === "true";
}

function chainId() {
  const n = parseInt(process.env.CEX_ONCHAIN_CHAIN_ID || "0", 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function rpcUrl() {
  return String(process.env.CEX_ONCHAIN_RPC_URL || "").trim();
}

function depositAddressRaw() {
  const a = String(process.env.CEX_DEPOSIT_ADDRESS || process.env.CEX_FEE_TREASURY_ADDRESS || "").trim();
  return a.startsWith("0x") ? a : "";
}

function minConfirmations() {
  const n = parseInt(process.env.CEX_ONCHAIN_MIN_CONFIRMATIONS || "12", 10);
  return Number.isFinite(n) && n >= 0 ? n : 12;
}

function hotWalletKey() {
  const k = String(process.env.CEX_HOT_WALLET_PRIVATE_KEY || "").trim();
  return k.startsWith("0x") && k.length >= 64 ? k : "";
}

/** Background scan of Transfer logs → confirmDeposit; optional `CEX_ONCHAIN_DEPOSIT_POLLER`. */
function depositPollerEnabled() {
  return String(process.env.CEX_ONCHAIN_DEPOSIT_POLLER || "").toLowerCase() === "true";
}

function pollIntervalMs() {
  const n = parseInt(process.env.CEX_ONCHAIN_POLL_INTERVAL_MS || "45000", 10);
  return Number.isFinite(n) ? Math.min(600_000, Math.max(5_000, n)) : 45_000;
}

function logBlockChunk() {
  const n = parseInt(process.env.CEX_ONCHAIN_LOG_BLOCK_CHUNK || "2000", 10);
  return Number.isFinite(n) ? Math.min(8000, Math.max(100, n)) : 2000;
}

function bootFromBlockEnv() {
  const raw = String(process.env.CEX_ONCHAIN_FROM_BLOCK || "").trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Etherscan-style base, e.g. https://bscscan.com (no trailing slash). */
function explorerBaseUrl() {
  return String(process.env.CEX_BLOCK_EXPLORER_URL || "").trim().replace(/\/$/, "");
}

/**
 * @param {string} asset
 */
function tokenAddressForAsset(asset) {
  const sym = String(asset || "").trim().toUpperCase();
  const raw = String(process.env[`CEX_TOKEN_${sym}_ADDRESS`] || "").trim();
  return raw.startsWith("0x") ? raw : "";
}

/**
 * @param {string} asset
 */
function tokenDecimalsForAsset(asset) {
  const sym = String(asset || "").trim().toUpperCase();
  const n = parseInt(process.env[`CEX_TOKEN_${sym}_DECIMALS`] || "18", 10);
  return Number.isFinite(n) && n >= 0 && n <= 36 ? n : 18;
}

function configuredTokenList() {
  /** @type {{ asset: string; address: string; decimals: number }[]} */
  const out = [];
  for (const asset of [CEX_BASE_ASSET, CEX_QUOTE_ASSET]) {
    const raw = tokenAddressForAsset(asset);
    if (!raw) continue;
    try {
      out.push({
        asset,
        address: ethers.getAddress(raw),
        decimals: tokenDecimalsForAsset(asset),
      });
    } catch {
      // skip invalid
    }
  }
  return out;
}

function addressToTokenMeta(addrLower) {
  for (const t of configuredTokenList()) {
    if (t.address.toLowerCase() === addrLower) return t;
  }
  return null;
}

function assertReady() {
  if (!onchainEnabled()) {
    const e = new Error("CEX on-chain transfers are disabled");
    e.code = "ONCHAIN_DISABLED";
    throw e;
  }
  const cid = chainId();
  const rpc = rpcUrl();
  const dep = depositAddressRaw();
  if (!cid || !rpc || !dep.startsWith("0x")) {
    const e = new Error("CEX on-chain is misconfigured (chain, RPC, or CEX_DEPOSIT_ADDRESS)");
    e.code = "MISCONFIGURED";
    throw e;
  }
  try {
    ethers.getAddress(dep);
  } catch {
    const e = new Error("invalid CEX_DEPOSIT_ADDRESS");
    e.code = "MISCONFIGURED";
    throw e;
  }
  return { chainId: cid, rpcUrl: rpc, depositAddress: ethers.getAddress(dep) };
}

/**
 * Safe subset for clients (no secrets).
 */
function publicInfo() {
  if (!onchainEnabled()) {
    return { enabled: false };
  }
  const cid = chainId();
  const dep = depositAddressRaw();
  const tokens = configuredTokenList().map((t) => ({
    asset: t.asset,
    tokenAddress: t.address,
    decimals: t.decimals,
  }));
  let depositAddress = null;
  try {
    if (dep) depositAddress = ethers.getAddress(dep);
  } catch {
    depositAddress = null;
  }
  const ready = !!(cid && rpcUrl() && depositAddress && tokens.length > 0);
  return {
    enabled: true,
    configured: ready,
    chainId: cid,
    depositAddress,
    minConfirmations: minConfirmations(),
    assets: tokens,
    withdrawEnabled: !!hotWalletKey(),
    withdrawCustomAddressEnabled: ready && !!hotWalletKey(),
    depositPollerEnabled: ready && depositPollerEnabled(),
    treasurySnapshotAvailable: ready,
    explorerBaseUrl: explorerBaseUrl() || null,
  };
}

/**
 * Canonical EIP-191 message for withdraw to an arbitrary address (must match byte-for-byte on server).
 */
function buildWithdrawAuthMessage({ fromAddress, toAddress, asset, amountHuman, chainId, expiryUnix, nonce }) {
  const from = ethers.getAddress(fromAddress).toLowerCase();
  const to = ethers.getAddress(toAddress).toLowerCase();
  const a = String(asset || "").trim().toUpperCase();
  const amt = String(amountHuman || "").trim();
  return `Lidex CEX Withdraw\nfrom=${from}\nto=${to}\nasset=${a}\namount=${amt}\nchainId=${Number(chainId)}\nexpiry=${Number(expiryUnix)}\nnonce=${nonce}`;
}

/**
 * @param {string} userId
 */
async function issueWithdrawChallenge(userId) {
  const cfg = assertReady();
  if (!hotWalletKey()) {
    const e = new Error("withdrawals are disabled");
    e.code = "WITHDRAW_DISABLED";
    throw e;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("user not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  const nonce = ethers.hexlify(ethers.randomBytes(16));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.cexWithdrawAuthNonce.create({
    data: { nonce, userId, expiresAt },
  });
  return {
    ok: true,
    nonce,
    expiresAtUnix: Math.floor(expiresAt.getTime() / 1000),
    chainId: cfg.chainId,
    fromAddress: ethers.getAddress(user.address).toLowerCase(),
  };
}

/**
 * ERC-20 transfers in receipt from user to deposit for configured pair tokens.
 * @param {import('ethers').TransactionReceipt} receipt
 * @param {string} depositAddress checksummed
 * @param {string} userAddr checksummed
 */
function collectUserDepositCreditsFromReceipt(receipt, depositAddress, userAddr) {
  const depositAddr = ethers.getAddress(depositAddress);
  const fromUser = ethers.getAddress(userAddr);
  /** @type {{ logIndex: number; asset: string; humanAmount: string }[]} */
  const credits = [];

  for (const log of receipt.logs) {
    const tokenLower = log.address.toLowerCase();
    const meta = addressToTokenMeta(tokenLower);
    if (!meta) continue;

    let parsed;
    try {
      parsed = TRANSFER_IFACE.parseLog({ topics: [...log.topics], data: log.data });
    } catch {
      continue;
    }
    if (!parsed || parsed.name !== "Transfer") continue;

    const from = ethers.getAddress(String(parsed.args.from));
    const to = ethers.getAddress(String(parsed.args.to));
    if (to !== depositAddr || from !== fromUser) continue;

    const value = parsed.args.value;
    const humanAmount = ethers.formatUnits(value, meta.decimals);
    const logIndexRaw = log.index != null ? log.index : log.logIndex;
    const logIndex = Number(logIndexRaw);
    if (!Number.isFinite(logIndex)) continue;

    credits.push({
      logIndex,
      asset: meta.asset,
      humanAmount,
    });
  }

  return credits;
}

/**
 * Read-only: confirmations, matching transfers, and what is already credited for this user.
 * @param {string} userId
 * @param {string} txHash
 */
async function getDepositStatusForUser(userId, txHash) {
  const cfg = assertReady();
  if (configuredTokenList().length === 0) {
    const e = new Error("no CEX_TOKEN_*_ADDRESS configured for base/quote");
    e.code = "MISCONFIGURED";
    throw e;
  }

  const hash = String(txHash || "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    const e = new Error("invalid tx hash");
    e.code = "BAD_TX_HASH";
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("user not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  const userAddr = ethers.getAddress(user.address);

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== cfg.chainId) {
    const e = new Error("RPC chainId does not match CEX_ONCHAIN_CHAIN_ID");
    e.code = "MISCONFIGURED";
    throw e;
  }

  const receipt = await provider.getTransactionReceipt(hash);
  if (!receipt) {
    return { ok: true, found: false };
  }

  const head = await provider.getBlockNumber();
  const conf = head - receipt.blockNumber + 1;
  const need = minConfirmations();

  const credits = collectUserDepositCreditsFromReceipt(receipt, cfg.depositAddress, userAddr);

  const rows = await prisma.cexOnchainDeposit.findMany({
    where: { chainId: cfg.chainId, txHash: receipt.hash, userId },
    orderBy: { logIndex: "asc" },
  });

  const creditedIdx = new Set(rows.map((r) => r.logIndex));
  const pending = credits.filter((c) => !creditedIdx.has(c.logIndex));

  return {
    ok: true,
    found: true,
    txHash: receipt.hash,
    receiptSuccess: receipt.status === 1,
    blockNumber: receipt.blockNumber,
    confirmations: conf,
    confirmationsRequired: need,
    readyToConfirm: receipt.status === 1 && conf >= need,
    matchingTransfers: credits.map((c) => ({
      logIndex: c.logIndex,
      asset: c.asset,
      amount: c.humanAmount,
      credited: creditedIdx.has(c.logIndex),
    })),
    hasMatchingTransfers: credits.length > 0,
    alreadyCredited: rows.map((r) => ({ logIndex: r.logIndex, asset: r.asset, amount: r.amount })),
    pendingCreditCount: pending.length,
    allCreditedForYou: credits.length > 0 && pending.length === 0,
  };
}

/**
 * @param {string} userId
 * @param {string} txHash
 */
async function confirmDeposit(userId, txHash) {
  const cfg = assertReady();
  if (configuredTokenList().length === 0) {
    const e = new Error("no CEX_TOKEN_*_ADDRESS configured for base/quote");
    e.code = "MISCONFIGURED";
    throw e;
  }

  const hash = String(txHash || "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    const e = new Error("invalid tx hash");
    e.code = "BAD_TX_HASH";
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("user not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  const userAddr = ethers.getAddress(user.address);

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== cfg.chainId) {
    const e = new Error("RPC chainId does not match CEX_ONCHAIN_CHAIN_ID");
    e.code = "MISCONFIGURED";
    throw e;
  }

  const receipt = await provider.getTransactionReceipt(hash);
  if (!receipt || receipt.status !== 1) {
    const e = new Error("transaction not found or failed");
    e.code = "TX_NOT_FOUND";
    throw e;
  }

  const head = await provider.getBlockNumber();
  const conf = head - receipt.blockNumber + 1;
  if (conf < minConfirmations()) {
    const e = new Error(`need ${minConfirmations()} confirmations (have ${conf})`);
    e.code = "NOT_CONFIRMED";
    throw e;
  }

  const rawCredits = collectUserDepositCreditsFromReceipt(receipt, cfg.depositAddress, userAddr);
  /** @type {{ logIndex: number; asset: string; humanAmount: string; refTxHash: string }[]} */
  const credits = rawCredits.map((c) => ({ ...c, refTxHash: receipt.hash }));

  if (credits.length === 0) {
    const e = new Error(
      "no ERC-20 transfer to the deposit address from your wallet was found in this transaction"
    );
    e.code = "NO_MATCHING_TRANSFER";
    throw e;
  }

  /** @type {string[]} */
  const credited = [];
  /** @type {string[]} */
  const skipped = [];

  for (const c of credits) {
    const existing = await prisma.cexOnchainDeposit.findUnique({
      where: {
        chainId_txHash_logIndex: {
          chainId: cfg.chainId,
          txHash: receipt.hash,
          logIndex: c.logIndex,
        },
      },
    });
    if (existing) {
      skipped.push(`${c.asset}#${c.logIndex}`);
      continue;
    }

    const x = d(c.humanAmount);
    if (x.lte(0)) continue;

    await prisma.$transaction(async (tx) => {
      await tx.cexOnchainDeposit.create({
        data: {
          chainId: cfg.chainId,
          txHash: receipt.hash,
          logIndex: c.logIndex,
          userId,
          asset: c.asset,
          amount: x.toString(),
        },
      });
      const row = await getBalanceRow(tx, userId, c.asset);
      const next = d(row.available).plus(x);
      await tx.cexBalance.update({
        where: { id: row.id },
        data: { available: next.toString() },
      });
      await tx.cexLedgerEntry.create({
        data: {
          userId,
          kind: "deposit_onchain",
          asset: c.asset,
          deltaAvail: x.toString(),
          refTxHash: receipt.hash,
        },
      });
    });
    credited.push(`${c.asset} ${x.toString()}`);
  }

  return {
    ok: true,
    txHash: receipt.hash,
    confirmations: conf,
    credited,
    skipped,
  };
}

/**
 * @param {string} fromAddr
 */
async function findUserIdByWallet(fromAddr) {
  let norm;
  try {
    norm = ethers.getAddress(fromAddr);
  } catch {
    return null;
  }
  const u = await prisma.user.findFirst({
    where: { address: { equals: norm, mode: "insensitive" } },
    select: { id: true },
  });
  return u?.id ?? null;
}

/**
 * @param {import('ethers').TransactionReceipt} receipt
 * @param {{ chainId: number; depositAddress: string }} cfg
 */
async function listUserIdsThatDepositedInReceipt(receipt, cfg) {
  const depositAddr = cfg.depositAddress;
  /** @type {Set<string>} */
  const ids = new Set();
  for (const log of receipt.logs) {
    const meta = addressToTokenMeta(log.address.toLowerCase());
    if (!meta) continue;
    let parsed;
    try {
      parsed = TRANSFER_IFACE.parseLog({ topics: [...log.topics], data: log.data });
    } catch {
      continue;
    }
    if (!parsed || parsed.name !== "Transfer") continue;
    const from = ethers.getAddress(String(parsed.args.from));
    const to = ethers.getAddress(String(parsed.args.to));
    if (to !== depositAddr) continue;
    const uid = await findUserIdByWallet(from);
    if (uid) ids.add(uid);
  }
  return [...ids];
}

/**
 * @param {number} chainIdNum
 * @param {string} userId
 * @param {string} txHash
 */
async function tryConfirmOrQueue(chainIdNum, userId, txHash) {
  try {
    await confirmDeposit(userId, txHash);
  } catch (e) {
    const code = e?.code;
    if (code === "NOT_CONFIRMED" || code === "TX_NOT_FOUND") {
      await prisma.cexOnchainPendingDeposit.upsert({
        where: { chainId_txHash: { chainId: chainIdNum, txHash } },
        create: { chainId: chainIdNum, txHash },
        update: {},
      });
    }
  }
}

/**
 * @param {{ chainId: number; rpcUrl: string; depositAddress: string }} cfg
 */
async function processPendingDeposits(cfg) {
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const pending = await prisma.cexOnchainPendingDeposit.findMany({
    where: { chainId: cfg.chainId },
    take: 80,
    orderBy: { createdAt: "asc" },
  });

  for (const p of pending) {
    let receipt;
    try {
      receipt = await provider.getTransactionReceipt(p.txHash);
    } catch {
      continue;
    }
    if (!receipt || receipt.status !== 1) continue;

    const head = await provider.getBlockNumber();
    if (head - receipt.blockNumber + 1 < minConfirmations()) continue;

    const userIds = await listUserIdsThatDepositedInReceipt(receipt, cfg);
    if (userIds.length === 0) {
      await prisma.cexOnchainPendingDeposit
        .delete({
          where: { chainId_txHash: { chainId: cfg.chainId, txHash: p.txHash } },
        })
        .catch(() => {});
      continue;
    }

    let stillUnconfirmed = false;
    for (const uid of userIds) {
      try {
        await confirmDeposit(uid, p.txHash);
      } catch (e) {
        if (e?.code === "NOT_CONFIRMED") stillUnconfirmed = true;
        // NO_MATCHING_TRANSFER: another user’s row in same tx; ignore
      }
    }

    if (!stillUnconfirmed) {
      await prisma.cexOnchainPendingDeposit
        .delete({
          where: { chainId_txHash: { chainId: cfg.chainId, txHash: p.txHash } },
        })
        .catch(() => {});
    }
  }
}

/**
 * @param {import('ethers').JsonRpcProvider} provider
 * @param {{ chainId: number; depositAddress: string }} cfg
 * @param {{ asset: string; address: string; decimals: number }[]} tokens
 * @param {number} fromBlock
 * @param {number} toBlock
 */
async function scanDepositLogChunk(provider, cfg, tokens, fromBlock, toBlock) {
  /** @type {Map<string, Set<string>>} */
  const txToUsers = new Map();

  for (const t of tokens) {
    const c = new ethers.Contract(t.address, ERC20_ABI, provider);
    let logs;
    try {
      logs = await c.queryFilter(c.filters.Transfer(null, cfg.depositAddress), fromBlock, toBlock);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("cex deposit poller queryFilter:", e?.message || e);
      throw e;
    }
    for (const log of logs) {
      let parsed;
      try {
        parsed = c.interface.parseLog({ topics: log.topics, data: log.data });
      } catch {
        continue;
      }
      const from = ethers.getAddress(String(parsed.args.from));
      const uid = await findUserIdByWallet(from);
      if (!uid) continue;
      const h = log.transactionHash;
      if (!txToUsers.has(h)) txToUsers.set(h, new Set());
      txToUsers.get(h).add(uid);
    }
  }

  for (const [h, ids] of txToUsers) {
    for (const uid of ids) {
      await tryConfirmOrQueue(cfg.chainId, uid, h);
    }
  }
}

/**
 * @param {{ chainId: number; rpcUrl: string; depositAddress: string }} cfg
 */
async function scanNewDepositLogs(cfg) {
  const tokens = configuredTokenList();
  if (!tokens.length) return;

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== cfg.chainId) return;

  const head = await provider.getBlockNumber();
  const safeHead = head - minConfirmations();
  if (safeHead < 0) return;

  const chunk = logBlockChunk();
  let state = await prisma.cexOnchainSyncState.findUnique({ where: { chainId: cfg.chainId } });

  if (!state) {
    const boot = bootFromBlockEnv() ?? Math.max(0, safeHead - 10_000);
    await prisma.cexOnchainSyncState.create({
      data: { chainId: cfg.chainId, lastScannedBlock: boot - 1 },
    });
    state = await prisma.cexOnchainSyncState.findUnique({ where: { chainId: cfg.chainId } });
  }

  if (!state) return;

  let nextFrom = state.lastScannedBlock + 1;
  if (nextFrom > safeHead) return;

  while (nextFrom <= safeHead) {
    const toBlock = Math.min(nextFrom + chunk - 1, safeHead);
    await scanDepositLogChunk(provider, cfg, tokens, nextFrom, toBlock);
    await prisma.cexOnchainSyncState.update({
      where: { chainId: cfg.chainId },
      data: { lastScannedBlock: toBlock },
    });
    nextFrom = toBlock + 1;
  }
}

async function runDepositPollerTick() {
  if (!onchainEnabled() || !depositPollerEnabled()) return;
  let cfg;
  try {
    cfg = assertReady();
  } catch {
    return;
  }
  if (configuredTokenList().length === 0) return;

  await processPendingDeposits(cfg);
  await scanNewDepositLogs(cfg);
}

/** @returns {() => void} stop function */
function startDepositPollerIfEnabled() {
  if (!onchainEnabled() || !depositPollerEnabled()) {
    return () => {};
  }
  const ms = pollIntervalMs();
  const tick = () => {
    void runDepositPollerTick().catch((e) => {
      // eslint-disable-next-line no-console
      console.warn("cex deposit poller:", e?.message || e);
    });
  };
  tick();
  const id = setInterval(tick, ms);
  return () => clearInterval(id);
}

/**
 * @param {string} userId
 * @param {string} asset
 * @param {string} amountHuman
 * @param {string} toAddr checksummed recipient
 * @param {string | null} consumeNonce one-time nonce id (signed withdraw path)
 */
async function withdrawToChainAddress(userId, asset, amountHuman, toAddr, consumeNonce) {
  const cfg = assertReady();
  const key = hotWalletKey();
  if (!key) {
    const e = new Error("withdrawals are disabled (CEX_HOT_WALLET_PRIVATE_KEY not set)");
    e.code = "WITHDRAW_DISABLED";
    throw e;
  }

  let toNorm;
  try {
    toNorm = ethers.getAddress(toAddr);
  } catch {
    const e = new Error("invalid recipient address");
    e.code = "BAD_ADDRESS";
    throw e;
  }
  if (toNorm === cfg.depositAddress) {
    const e = new Error("cannot withdraw to the CEX deposit address");
    e.code = "FORBIDDEN_DESTINATION";
    throw e;
  }

  const sym = String(asset || "").trim().toUpperCase();
  if (sym !== CEX_BASE_ASSET && sym !== CEX_QUOTE_ASSET) {
    const e = new Error(`asset must be ${CEX_BASE_ASSET} or ${CEX_QUOTE_ASSET}`);
    e.code = "BAD_ASSET";
    throw e;
  }

  const tokenAddrRaw = tokenAddressForAsset(sym);
  if (!tokenAddrRaw) {
    const e = new Error(`CEX_TOKEN_${sym}_ADDRESS is not configured`);
    e.code = "MISCONFIGURED";
    throw e;
  }
  const tokenAddr = ethers.getAddress(tokenAddrRaw);
  const decimals = tokenDecimalsForAsset(sym);

  let value;
  try {
    value = ethers.parseUnits(String(amountHuman || "").trim(), decimals);
  } catch {
    const e = new Error("invalid amount");
    e.code = "BAD_AMOUNT";
    throw e;
  }
  if (value <= 0n) {
    const e = new Error("amount must be positive");
    e.code = "BAD_AMOUNT";
    throw e;
  }

  const humanDebit = ethers.formatUnits(value, decimals);

  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== cfg.chainId) {
    const e = new Error("RPC chainId does not match CEX_ONCHAIN_CHAIN_ID");
    e.code = "MISCONFIGURED";
    throw e;
  }

  const signer = new ethers.Wallet(key, provider);
  const erc20 = new ethers.Contract(tokenAddr, ERC20_ABI, signer);

  /** @type {{ id: string } | null} */
  let wdRow = null;

  try {
    await prisma.$transaction(async (tx) => {
      if (consumeNonce) {
        const nu = await tx.cexWithdrawAuthNonce.updateMany({
          where: { nonce: consumeNonce, userId, used: false, expiresAt: { gt: new Date() } },
          data: { used: true, usedAt: new Date() },
        });
        if (nu.count !== 1) {
          const err = new Error("invalid or expired withdraw nonce");
          err.code = "BAD_NONCE";
          throw err;
        }
      }

      const row = await getBalanceRow(tx, userId, sym);
      const av = d(row.available);
      const x = d(humanDebit);
      if (av.lt(x)) {
        const err = new Error(`insufficient ${sym} available`);
        err.code = "INSUFFICIENT_FUNDS";
        throw err;
      }
      const next = av.minus(x);
      await tx.cexBalance.update({
        where: { id: row.id },
        data: { available: next.toString() },
      });
      wdRow = await tx.cexOnchainWithdrawal.create({
        data: {
          userId,
          chainId: cfg.chainId,
          asset: sym,
          amount: humanDebit,
          toAddress: toNorm,
          status: "pending",
        },
      });
    });
  } catch (e) {
    if (e?.code === "INSUFFICIENT_FUNDS" || e?.code === "BAD_NONCE") throw e;
    throw e;
  }

  if (!wdRow) {
    const e = new Error("withdrawal record missing");
    e.code = "INTERNAL";
    throw e;
  }

  try {
    const tx = await erc20.transfer(toNorm, value);
    const receipt = await tx.wait(1);
    if (!receipt || receipt.status !== 1) {
      throw new Error("transfer reverted");
    }

    await prisma.$transaction(async (tx) => {
      await tx.cexOnchainWithdrawal.update({
        where: { id: wdRow.id },
        data: { status: "confirmed", txHash: receipt.hash },
      });
      await tx.cexLedgerEntry.create({
        data: {
          userId,
          kind: "withdraw_onchain",
          asset: sym,
          deltaAvail: d(humanDebit).negated().toString(),
          refTxHash: receipt.hash,
        },
      });
    });

    const bal = await prisma.cexBalance.findUnique({
      where: { userId_asset: { userId, asset: sym } },
    });

    return {
      ok: true,
      withdrawalId: wdRow.id,
      txHash: receipt.hash,
      asset: sym,
      amount: humanDebit,
      toAddress: toNorm,
      balance: bal,
    };
  } catch (e) {
    await prisma.$transaction(async (tx) => {
      const row = await getBalanceRow(tx, userId, sym);
      const av = d(row.available);
      const x = d(humanDebit);
      const next = av.plus(x);
      await tx.cexBalance.update({
        where: { id: row.id },
        data: { available: next.toString() },
      });
      await tx.cexOnchainWithdrawal.update({
        where: { id: wdRow.id },
        data: {
          status: "failed",
          failReason: e?.shortMessage || e?.message || "chain transfer failed",
        },
      });
    });
    const err = new Error(e?.shortMessage || e?.message || "on-chain withdraw failed; balance restored");
    err.code = "CHAIN_SEND_FAILED";
    throw err;
  }
}

/**
 * @param {string} userId
 * @param {string} asset
 * @param {string} amountHuman
 */
async function withdrawToUserWallet(userId, asset, amountHuman) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("user not found");
    e.code = "NOT_FOUND";
    throw e;
  }
  return withdrawToChainAddress(userId, asset, amountHuman, ethers.getAddress(user.address), null);
}

/**
 * Withdraw to an arbitrary address after EIP-191 signature over a nonce-bound message.
 * @param {string} userId
 * @param {{ asset: string, amount: string, toAddress: string, message: string, signature: string, withdrawNonce: string }} body
 */
async function withdrawToSignedAddress(userId, body) {
  const asset = String(body?.asset || "");
  const amountHuman = String(body?.amount || "");
  const toAddressRaw = String(body?.toAddress || "").trim();
  const message = String(body?.message || "");
  const signature = String(body?.signature || "");
  const withdrawNonce = String(body?.withdrawNonce || "").trim();

  if (!toAddressRaw.startsWith("0x") || !withdrawNonce || !signature) {
    const e = new Error("toAddress, withdrawNonce, signature, and message are required");
    e.code = "BAD_REQUEST";
    throw e;
  }

  const cfg = assertReady();
  if (!hotWalletKey()) {
    const e = new Error("withdrawals are disabled (CEX_HOT_WALLET_PRIVATE_KEY not set)");
    e.code = "WITHDRAW_DISABLED";
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const e = new Error("user not found");
    e.code = "NOT_FOUND";
    throw e;
  }

  const row = await prisma.cexWithdrawAuthNonce.findFirst({
    where: {
      nonce: withdrawNonce,
      userId,
      used: false,
      expiresAt: { gt: new Date() },
    },
  });
  if (!row) {
    const e = new Error("invalid or expired withdraw nonce; request GET /v1/cex/onchain/withdraw/challenge");
    e.code = "BAD_NONCE";
    throw e;
  }

  const expiryUnix = Math.floor(row.expiresAt.getTime() / 1000);
  const expected = buildWithdrawAuthMessage({
    fromAddress: user.address,
    toAddress: toAddressRaw,
    asset,
    amountHuman,
    chainId: cfg.chainId,
    expiryUnix,
    nonce: row.nonce,
  });

  if (expected !== message.trim()) {
    const e = new Error("signed message does not match parameters (check amount, asset, to, expiry, nonce)");
    e.code = "BAD_MESSAGE";
    throw e;
  }

  const recovered = recoverAddress({ message: expected, signature });
  if (recovered !== String(user.address).toLowerCase()) {
    const e = new Error("signature does not match logged-in wallet");
    e.code = "BAD_SIGNATURE";
    throw e;
  }

  const toAddr = ethers.getAddress(toAddressRaw);
  return withdrawToChainAddress(userId, asset, amountHuman, toAddr, row.nonce);
}

/**
 * @param {import('ethers').JsonRpcProvider} provider
 * @param {string} holder checksummed
 * @param {{ asset: string; address: string; decimals: number }[]} tokens
 */
async function readErc20BalancesHuman(provider, holder, tokens) {
  /** @type {{ asset: string; balance: string | null; error?: string }[]} */
  const out = [];
  for (const t of tokens) {
    try {
      const c = new ethers.Contract(t.address, ERC20_BALANCE_ABI, provider);
      const raw = await c.balanceOf(holder);
      out.push({ asset: t.asset, balance: ethers.formatUnits(raw, t.decimals) });
    } catch (e) {
      out.push({ asset: t.asset, balance: null, error: e?.shortMessage || e?.message || "balance read failed" });
    }
  }
  return out;
}

/**
 * Native + configured ERC-20 balances for deposit address and (if configured) hot wallet. For ops / monitoring.
 */
async function getTreasurySnapshot() {
  const cfg = assertReady();
  const tokens = configuredTokenList();
  const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
  const net = await provider.getNetwork();
  if (Number(net.chainId) !== cfg.chainId) {
    const e = new Error("RPC chainId does not match CEX_ONCHAIN_CHAIN_ID");
    e.code = "MISCONFIGURED";
    throw e;
  }

  const depositAddr = cfg.depositAddress;
  const depWei = await provider.getBalance(depositAddr);
  const depositNative = ethers.formatEther(depWei);
  const depositTokens = tokens.length ? await readErc20BalancesHuman(provider, depositAddr, tokens) : [];

  /** @type {{ address: string; native: string; tokens: { asset: string; balance: string | null; error?: string }[] } | null} */
  let hotWallet = null;
  const key = hotWalletKey();
  if (key) {
    const w = new ethers.Wallet(key);
    const hotAddr = ethers.getAddress(w.address);
    const hotWei = await provider.getBalance(hotAddr);
    const hotNative = ethers.formatEther(hotWei);
    const hotTokens = tokens.length ? await readErc20BalancesHuman(provider, hotAddr, tokens) : [];
    hotWallet = { address: hotAddr, native: hotNative, tokens: hotTokens };
  }

  /** @type {{ code: string; detail: string }[]} */
  const warnings = [];
  const warnRaw = String(process.env.CEX_TREASURY_WARN_NATIVE_ETH || "").trim();
  if (warnRaw && hotWallet) {
    const min = parseFloat(warnRaw);
    const cur = parseFloat(hotWallet.native);
    if (Number.isFinite(min) && Number.isFinite(cur) && cur < min) {
      warnings.push({
        code: "hot_native_low",
        detail: `Hot wallet native balance ${hotWallet.native} is below CEX_TREASURY_WARN_NATIVE_ETH (${warnRaw}). Fund gas.`,
      });
    }
  }

  return {
    ok: true,
    chainId: cfg.chainId,
    deposit: {
      address: depositAddr,
      native: depositNative,
      tokens: depositTokens,
    },
    hotWallet,
    warnings,
  };
}

/**
 * @param {string} userId
 * @param {number} limit
 */
async function listWithdrawals(userId, limit = 20) {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const rows = await prisma.cexOnchainWithdrawal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return { ok: true, withdrawals: rows };
}

/**
 * Credited on-chain deposits for this user (confirm button or poller).
 * @param {string} userId
 * @param {number} limit
 */
async function listOnchainDeposits(userId, limit = 20) {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const rows = await prisma.cexOnchainDeposit.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return { ok: true, deposits: rows };
}

module.exports = {
  onchainEnabled,
  depositPollerEnabled,
  publicInfo,
  confirmDeposit,
  getDepositStatusForUser,
  buildWithdrawAuthMessage,
  issueWithdrawChallenge,
  withdrawToUserWallet,
  withdrawToSignedAddress,
  listWithdrawals,
  listOnchainDeposits,
  getTreasurySnapshot,
  runDepositPollerTick,
  startDepositPollerIfEnabled,
};
