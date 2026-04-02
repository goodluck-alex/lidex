function defaultPools() {
  return [
    { id: "ldx-30d", token: "LDX", lockDays: 30, apr: 0.12 },
    { id: "ldx-90d", token: "LDX", lockDays: 90, apr: 0.18 }
  ];
}

module.exports = { defaultPools };

