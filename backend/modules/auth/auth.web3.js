const { verifyMessage } = require("ethers");

function buildLoginMessage({ address, chainId, nonce }) {
  // Minimal, deterministic message for Phase 1.
  // Later you can migrate to full SIWE.
  return `Lidex Login\naddress=${String(address).toLowerCase()}\nchainId=${Number(chainId)}\nnonce=${nonce}`;
}

function recoverAddress({ message, signature }) {
  const recovered = verifyMessage(message, signature);
  return String(recovered).toLowerCase();
}

module.exports = { buildLoginMessage, recoverAddress };

