/**
 * Seed default blog categories (via service) and five starter articles.
 * Run from `lidex/backend`: `npm run seed:blog`
 * Requires DATABASE_URL and applied migration `20260408160000_blog_system`.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const blogService = require("../modules/blog/blog.service");

const ANDROID_APK = "https://lidex-hybrid.vercel.app/download/android.apk";
const LDX_BSCSCAN = "https://bscscan.com/token/0x567a4f63f6838005e104c053fc24a3510b0432e1";

const ARTICLES = [
  {
    title: "What is Lidex Exchange?",
    slug: "what-is-lidex-exchange",
    categorySlug: "education",
    description:
      "A concise overview of Lidex Exchange — hybrid lite and full trading, wallets, markets, and how the platform fits together.",
    featuredImage: null,
    author: "Lidex Team",
    published: true,
    tags: ["Lidex", "Exchange", "Overview"],
    seoTitle: "What is Lidex Exchange? | Lidex Blog",
    metaDescription: "Learn what Lidex Exchange is, how lite and full trading work, and what you can do on the platform.",
    keywords: "Lidex, crypto exchange, trading, swap",
    content: `<p>Lidex Exchange is built for traders who want <strong>speed</strong>, <strong>clarity</strong>, and a single account across multiple ways to trade.</p>
<h2>Lite and full trading</h2>
<p>In <strong>lite</strong> mode you can swap tokens with a streamlined flow. Switch to <strong>full</strong> mode when you need order books, deeper markets, and advanced features — without juggling separate products.</p>
<h2>What you can do</h2>
<ul>
<li>Trade and swap supported assets</li>
<li>Track markets and volatility</li>
<li>Use P2P and other ecosystem features as they roll out</li>
</ul>
<p>Whether you are new or experienced, the goal is the same: <em>trade freely, trade powerfully</em> — with tooling that scales with you.</p>`,
  },
  {
    title: "How to Trade on Lidex",
    slug: "how-to-trade-on-lidex",
    categorySlug: "education",
    description:
      "Step-by-step: connect your wallet, choose lite or full mode, pick a market, and place your first trade safely.",
    featuredImage: null,
    author: "Lidex Team",
    published: true,
    tags: ["Trading", "Tutorial", "Wallet"],
    seoTitle: "How to Trade on Lidex | Lidex Blog",
    metaDescription: "Connect your wallet, choose your mode, and start trading on Lidex with this practical guide.",
    keywords: "trade, Lidex, wallet, CEX, DEX",
    content: `<h2>Before you start</h2>
<p>Install a compatible wallet, fund it with the assets you need for fees, and bookmark the official Lidex site.</p>
<h2>1. Connect</h2>
<p>Open Lidex and connect your wallet. Approve only the permissions you understand.</p>
<h2>2. Choose your mode</h2>
<p>Use <strong>lite</strong> for simple swaps or <strong>full</strong> for the full trading desk. You can switch when the product allows it.</p>
<h2>3. Pick a market</h2>
<p>From <strong>Markets</strong>, choose a pair, review price and 24h change, then open the trade or swap screen.</p>
<h2>4. Confirm with care</h2>
<p>Double-check size, price, and fees before signing. Crypto transactions are irreversible.</p>
<h2>5. Secure your account</h2>
<p>Never share seed phrases. Use official links only, and enable device security best practices.</p>`,
  },
  {
    title: "Lidex Android App Released",
    slug: "lidex-android-app-released",
    categorySlug: "marketing",
    description:
      "The Lidex Android app is live. Install the APK, get the mobile-first home experience, and trade on the go.",
    featuredImage: null,
    author: "Lidex Team",
    published: true,
    tags: ["Android", "App", "Release"],
    seoTitle: "Lidex Android App Released | Lidex Blog",
    metaDescription: "Download the official Lidex Android APK and use the dedicated mobile experience.",
    keywords: "Lidex app, Android, APK, mobile",
    content: `<p>We have released the <strong>Lidex Android app</strong> as an installable APK so you can use a dedicated mobile layout alongside the main website.</p>
<h2>Download</h2>
<p>Get the latest build here: <a href="${ANDROID_APK}" target="_blank" rel="noopener noreferrer">${ANDROID_APK}</a></p>
<h2>What you get</h2>
<ul>
<li>Mobile-first home, markets, trade, swap, and wallet entry points</li>
<li>Same backend and features as the web app, with a focused handheld UI</li>
</ul>
<p>Install from trusted sources only. Follow on-site instructions if your device prompts for unknown sources.</p>`,
  },
  {
    title: "LDX Token Introduction",
    slug: "ldx-token-introduction",
    categorySlug: "growth",
    description:
      "Meet LDX — the Lidex ecosystem token on BNB Smart Chain. Utility, transparency, and where to verify the contract.",
    featuredImage: null,
    author: "Lidex Team",
    published: true,
    tags: ["LDX", "Token", "BSC"],
    seoTitle: "LDX Token Introduction | Lidex Blog",
    metaDescription: "Introduction to the LDX token and the official BscScan contract page.",
    keywords: "LDX, token, BSC, Lidex",
    content: `<p><strong>LDX</strong> is the Lidex ecosystem token. It is used across product surfaces where the protocol and community align incentives — from trading to participation in platform programs.</p>
<h2>Verify on-chain</h2>
<p>Always confirm the contract from official communications. The token page on BscScan is here:</p>
<p><a href="${LDX_BSCSCAN}" target="_blank" rel="noopener noreferrer">${LDX_BSCSCAN}</a></p>
<h2>Stay safe</h2>
<p>Watch for impersonation tokens. Compare the contract address carefully before transferring or approving spends.</p>`,
  },
  {
    title: "Why DEX / CEX Exchanges Are The Future",
    slug: "why-dex-cex-exchanges-are-the-future",
    categorySlug: "education",
    description:
      "Why hybrid and multi-mode exchanges matter: liquidity, UX, self-custody options, and meeting users where they are.",
    featuredImage: null,
    author: "Lidex Team",
    published: true,
    tags: ["DEX", "CEX", "Future"],
    seoTitle: "Why DEX and CEX Exchanges Are The Future | Lidex Blog",
    metaDescription: "A short take on why exchanges blend DEX and CEX strengths — and what that means for traders.",
    keywords: "DEX, CEX, hybrid exchange, crypto",
    content: `<p>Traders rarely want a single rigid model. Some moments call for <strong>self-custody</strong> and open settlement; others call for <strong>deep liquidity</strong>, fast matching, and familiar account workflows.</p>
<h2>The hybrid path</h2>
<p>Platforms that respect both modes — or let users switch context without leaving the product — tend to win on <em>retention</em> and <em>trust</em>.</p>
<h2>What to expect next</h2>
<ul>
<li>Better education and safer defaults for beginners</li>
<li>More transparency around risk, custody, and fees</li>
<li>Mobile-first experiences that still preserve power-user tools</li>
</ul>
<p>Lidex is built around that trajectory: one exchange narrative, multiple ways to engage.</p>`,
  },
];

async function main() {
  await blogService.ensureCategories();
  const { prisma } = require("../lib/prisma");

  for (const article of ARTICLES) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: article.slug } });
    if (existing) {
      console.log("[seed-blog] skip (exists):", article.slug);
      continue;
    }
    const result = await blogService.createPostAdmin({
      ...article,
      publishedAt: new Date().toISOString(),
    });
    if (!result.ok) {
      console.error("[seed-blog] failed:", article.slug, result);
      process.exitCode = 1;
      return;
    }
    console.log("[seed-blog] created:", article.slug);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = require("../lib/prisma");
    await prisma.$disconnect();
  });
