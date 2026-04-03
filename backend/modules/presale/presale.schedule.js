const { ethers } = require("ethers");

const FN_SAFE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Public JSON-RPC endpoints; override with PRESALE_RPC_URL in production. */
const DEFAULT_RPC = {
  56: "https://bsc-dataseed.binance.org/",
  1: "https://eth.llamarpc.com",
};

function parseEnvUnixSeconds(key) {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return null;
  const n = parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n * 1000;
}

function uintToMs(v) {
  if (v == null) return null;
  const bi = typeof v === "bigint" ? v : BigInt(String(v));
  if (bi === 0n) return null;
  const n = Number(bi);
  if (!Number.isFinite(n)) return null;
  // On-chain timestamps are almost always seconds; >1e12 treated as ms.
  if (n > 1e12) return n;
  return n * 1000;
}

async function readUint256View(provider, contractAddress, fnName) {
  if (!FN_SAFE.test(fnName)) return null;
  const iface = new ethers.Interface([`function ${fnName}() view returns (uint256)`]);
  const data = iface.encodeFunctionData(fnName, []);
  let result;
  try {
    result = await provider.call({ to: contractAddress, data });
  } catch {
    return null;
  }
  if (!result || result === "0x") return null;
  try {
    const [out] = iface.decodeFunctionResult(fnName, result);
    return out;
  } catch {
    return null;
  }
}

function inPresaleWindow(startAtMs, endAtMs, nowMs) {
  const now = nowMs ?? Date.now();
  if (startAtMs == null && endAtMs == null) return true;
  if (startAtMs != null && now < startAtMs) return false;
  if (endAtMs != null && now > endAtMs) return false;
  return true;
}

/**
 * @param {number} chainId
 * @param {string | null} presaleContract
 * @returns {Promise<{ startAt: number | null, endAt: number | null, source: { start: 'contract'|'env'|null, end: 'contract'|'env'|null } }>}
 */
async function resolveSchedule(chainId, presaleContract) {
  const envStart = parseEnvUnixSeconds("PRESALE_START_UNIX");
  const envEnd = parseEnvUnixSeconds("PRESALE_END_UNIX");

  const allowContractRead =
    !!presaleContract &&
    String(process.env.PRESALE_READ_SCHEDULE_FROM_CONTRACT || "true").toLowerCase() !== "false";

  let cStart = null;
  let cEnd = null;
  if (allowContractRead && presaleContract) {
    const rpc = (process.env.PRESALE_RPC_URL || DEFAULT_RPC[chainId] || "").trim();
    if (rpc) {
      try {
        const provider = new ethers.JsonRpcProvider(rpc);
        const startFn = (process.env.PRESALE_TIME_START_FN || "startTime").trim() || "startTime";
        const endFn = (process.env.PRESALE_TIME_END_FN || "endTime").trim() || "endTime";
        const [a, b] = await Promise.all([
          readUint256View(provider, presaleContract, startFn),
          readUint256View(provider, presaleContract, endFn),
        ]);
        cStart = uintToMs(a);
        cEnd = uintToMs(b);
      } catch {
        /* ignore RPC errors; fall back to env-only */
      }
    }
  }

  const startAt = envStart != null ? envStart : cStart;
  const endAt = envEnd != null ? envEnd : cEnd;

  return {
    startAt,
    endAt,
    source: {
      start: envStart != null ? "env" : cStart != null ? "contract" : null,
      end: envEnd != null ? "env" : cEnd != null ? "contract" : null,
    },
  };
}

module.exports = {
  resolveSchedule,
  inPresaleWindow,
  parseEnvUnixSeconds,
};
