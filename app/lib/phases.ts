export type ProjectType = "website" | "shop";

export interface Step {
  text: string;
  clientText?: string;
  clientOwned?: boolean;
}

export interface Phase {
  n: number;
  color: string;
  badge: string;
  title: string;
  clientTitle?: string;
  sub: string;
  clientSub?: string;
  steps: Step[];
  tools: string[];
  tip: string;
  adminArtifactHint: string;
  clientArtifactHint: string;
  handoverNote: string;
  clientGuidance: string;
}

// ── Website ────────────────────────────────────────────────────────────────

export const WEBSITE_PHASES: Phase[] = [
  {
    n: 0,
    color: "#5B8CFF",
    badge: "~1 day",
    title: "Client Discovery",
    sub: "Understand the business before touching code",
    steps: [
      { text: "30-min discovery call — goals, customers, competitors" },
      { text: "Audit current online presence (Google Business, socials, existing site)" },
      { text: "Fill in project brief below" },
      { text: "Send project overview link to client" },
    ],
    tools: ["Notion", "Loom", "Google Meet"],
    tip: "Key question: What action should every visitor take? (Call, book, buy, visit.) Everything else follows from this.",
    adminArtifactHint: "e.g. Discovery call recording, competitor research, brief template",
    clientArtifactHint: "e.g. Existing logo, brand guidelines, competitor sites you like",
    handoverNote:
      "Once the brief is filled in, send the client their project link so they can track progress and upload brand assets.",
    clientGuidance: "",
  },
  {
    n: 1,
    color: "#A78BFA",
    badge: "1–2 days",
    title: "Brand & Design",
    sub: "Lock in visual identity before writing any code",
    steps: [
      { text: "Generate logo + palette + fonts (Looka or Brandmark) if no brand exists" },
      { text: "Prompt v0 with the brief to generate initial page layout in React + Tailwind" },
      {
        text: "Iterate on v0 output with client via Vercel preview link",
        clientText: "Review the design preview and share your feedback",
        clientOwned: true,
      },
      { text: "Generate hero images and visuals with Midjourney or Ideogram" },
      {
        text: "Finalise colours — swap CSS variables in globals.css",
        clientText: "Confirm your final brand colours",
        clientOwned: true,
      },
    ],
    tools: ["v0 by Vercel", "Looka", "Brandmark", "Midjourney", "Ideogram"],
    tip: "Looka → brand tokens → v0 layout → Midjourney images. Client sees a working preview before you write a single component.",
    adminArtifactHint: "e.g. v0 preview link, logo options, colour palette PDF",
    clientArtifactHint: "e.g. Brand inspiration images, existing logo file, reference sites you like",
    handoverNote:
      "Share the Vercel preview link and any logo options. Wait for the client's feedback before finalising colours and generating images.",
    clientGuidance:
      "Your designer is building your brand identity. Once they share a preview below, click through it and leave your thoughts — what you love and what to change.",
  },
  {
    n: 2,
    color: "#34D399",
    badge: "2–5 days",
    title: "Development",
    sub: "Clone the template, customise, connect CMS",
    clientSub: "We're building your website",
    steps: [
      { text: "Clone the Next.js starter template" },
      { text: "Apply brand colours via CSS variables (globals.css)" },
      { text: "Set up Sanity project — add client as editor" },
      {
        text: "Populate all content in Sanity Studio",
        clientText: "Add your content — text, images, and service details — in the CMS",
        clientOwned: true,
      },
      { text: "Wire up contact form (Resend) and Google Maps embed" },
      { text: "Add LocalBusiness JSON-LD schema for SEO" },
      { text: "Use Claude Code to catch TypeScript and build errors" },
    ],
    tools: ["Next.js", "Sanity", "Vercel", "Claude Code", "Resend"],
    tip: "The starter template means most of this is config, not coding. Aim for a first working preview within one day.",
    adminArtifactHint: "e.g. Staging site URL, Sanity Studio link, Vercel preview link",
    clientArtifactHint: "e.g. Google Drive content folder, existing site copy, product photos",
    handoverNote:
      "Share the Sanity Studio link so the client can start adding content. Share the staging URL so they can preview progress in real time.",
    clientGuidance:
      "We're building your website. Your main job right now is to add your content (text, images, services) to the CMS using the link below — the more complete it is, the faster we can finish.",
  },
  {
    n: 3,
    color: "#60C8B0",
    badge: "Half day",
    title: "Local SEO Setup",
    sub: "Get them found in local search",
    clientSub: "Getting you found on Google",
    steps: [
      {
        text: "Optimise Google Business Profile — photos, categories, hours",
        clientText: "Update your Google Business Profile with photos, categories, and opening hours",
        clientOwned: true,
      },
      { text: "Verify Google Search Console and submit sitemap" },
      { text: "Install Google Analytics 4" },
      { text: "Check Core Web Vitals in Vercel — fix any issues" },
      { text: "Write 2–3 initial blog posts targeting local search terms" },
      { text: "Build citations on local directories (Yelp, Gelbe Seiten, etc.)" },
    ],
    tools: ["Google Search Console", "Google Analytics 4", "Vercel Analytics"],
    tip: "GBP optimisation often has more immediate local impact than the website itself. Do this in parallel with development.",
    adminArtifactHint: "e.g. Keyword research doc, GBP optimisation guide, analytics dashboard link",
    clientArtifactHint: "e.g. Google Business Profile URL, photo library (Drive), service areas list",
    handoverNote:
      "Share the GBP optimisation guide with the client. They need to update their own profile — prompt them clearly, it's their task.",
    clientGuidance:
      "We're setting up your Google presence. Your task: update your Google Business Profile with fresh photos, correct hours, and your service categories. See your checklist below.",
  },
  {
    n: 4,
    color: "#FBBF24",
    badge: "1 day",
    title: "Launch & Handoff",
    clientTitle: "Launch",
    sub: "Go live and hand the keys to the client",
    clientSub: "Your site goes live",
    steps: [
      { text: "Final review: mobile, accessibility, load speed, all links" },
      { text: "Add Impressum and Datenschutzerklärung (required in Germany)" },
      { text: "Record a Loom walkthrough of Sanity Studio for the client" },
      { text: "Set up uptime monitoring (Better Uptime — free tier)" },
      { text: "Deliver a one-page handoff doc: how to update content, who to call" },
      {
        text: "Connect custom domain in Vercel",
        clientText: "Connect your domain to make the site live",
        clientOwned: true,
      },
    ],
    tools: ["Vercel", "Loom", "Better Uptime"],
    tip: "German market: Impressum and Datenschutzerklärung are legal requirements. Use datenschutz.org for the privacy policy generator.",
    adminArtifactHint: "e.g. DNS / nameserver instructions, handoff doc PDF, Loom walkthrough link",
    clientArtifactHint: "e.g. Domain registrar name, DNS login details",
    handoverNote:
      "Share the DNS connection instructions and the Loom walkthrough before going live. Don't mark this done until the domain is live.",
    clientGuidance:
      "Almost there! Your site is ready — just one step from you. Follow the domain connection instructions below, and your site will be live.",
  },
  {
    n: 5,
    color: "#FB923C",
    badge: "€100–300/mo",
    title: "Ongoing Retainer",
    clientTitle: "Monthly Care",
    sub: "Recurring income with minimal monthly effort",
    clientSub: "Ongoing maintenance and growth for your site",
    steps: [
      { text: "Host on Vercel (free or Pro tier shared across clients)" },
      { text: "Monthly analytics report — screenshot + 3-bullet summary" },
      { text: "Content updates: blog posts, service changes, seasonal offers" },
      { text: "Google Ads or Meta Ads management (optional premium add-on)" },
      { text: "Annual check: renew domain, review SEO, update dependencies" },
    ],
    tools: ["Vercel", "Google Ads", "Meta Ads", "Notion"],
    tip: "Goal: 5–8 retainer clients = €500–2,400/mo of predictable income running alongside new project work.",
    adminArtifactHint: "e.g. Monthly analytics report, campaign results, ad performance summary",
    clientArtifactHint: "e.g. Content update request, new photos, upcoming offers or events",
    handoverNote:
      "Send the monthly report and flag any performance issues proactively. Schedule a brief call if there are strategic decisions.",
    clientGuidance:
      "We handle your site each month — updates, performance, and growth. Share content requests, new photos, or upcoming promotions below and we'll take it from there.",
  },
];

// ── Shop ───────────────────────────────────────────────────────────────────

export const SHOP_PHASES: Phase[] = [
  {
    n: 0,
    color: "#5B8CFF",
    badge: "1–2 hrs",
    title: "Discovery & Scope",
    sub: "Define store structure, platform, and product model",
    steps: [
      { text: "Discovery call: product catalog size, pricing model, shipping needs" },
      { text: "Decide platform: Shopify (simpler) vs WooCommerce (more control)" },
      { text: "Clarify payment methods: Stripe, PayPal, Klarna, invoice, etc." },
      { text: "Confirm VAT/tax setup — Germany: 19% MwSt, B2B vs B2C rules" },
      { text: "Agree on launch timeline and content delivery date" },
      { text: "Send project link to client and request product data (CSV + images)" },
    ],
    tools: ["Notion", "Google Meet", "Loom"],
    tip: "Critical: confirm B2B vs B2C before building. Different VAT rules, different checkout flows. Shopify fits most B2C shops under 500 products.",
    adminArtifactHint: "e.g. Discovery call recording, platform comparison, product import template",
    clientArtifactHint: "e.g. Product spreadsheet with prices, existing brand files, competitor shops you like",
    handoverNote:
      "Once platform is decided, send the client their project link and the product import template. They should prepare their catalog before Phase 2.",
    clientGuidance: "",
  },
  {
    n: 1,
    color: "#A78BFA",
    badge: "3–5 days",
    title: "Brand & Store Design",
    clientTitle: "Design Review",
    sub: "Logo, palette, and storefront mockup",
    clientSub: "Review and approve your store's look",
    steps: [
      { text: "Generate logo + palette (Looka or Brandmark) if no brand exists" },
      { text: "Design homepage, product page, and cart layout in v0 or Figma" },
      { text: "Customise Shopify theme or WooCommerce storefront" },
      { text: "Generate product placeholder imagery (Midjourney)" },
      { text: "Deploy preview to Shopify sandbox or Vercel" },
      {
        text: "Iterate on design with client — homepage, product page, cart",
        clientText: "Review the store design preview and share what to keep and what to change",
        clientOwned: true,
      },
      {
        text: "Finalise brand colours and typography",
        clientText: "Confirm your brand colours and fonts",
        clientOwned: true,
      },
    ],
    tools: ["v0 by Vercel", "Figma", "Looka", "Brandmark", "Midjourney", "Shopify"],
    tip: "Product page design matters most — that's where buying decisions happen. Prioritise: clear images, visible price, and a prominent 'Add to cart' button.",
    adminArtifactHint: "e.g. Design preview link, logo options, colour palette, Shopify theme demo",
    clientArtifactHint: "e.g. Brand inspiration, competitor shops you like, existing logo files",
    handoverNote:
      "Share the design preview link (Shopify sandbox or Vercel). Ask the client to annotate directly or leave written feedback via notes.",
    clientGuidance:
      "Your designer has created a look for your store. Click the preview link below and let us know what you love and what to change — the sooner you give feedback, the faster we can finalise.",
  },
  {
    n: 2,
    color: "#34D399",
    badge: "3–5 days",
    title: "Store Build & Products",
    clientTitle: "Add Your Products",
    sub: "Build the store, configure checkout, import catalog",
    clientSub: "Add your products to the store",
    steps: [
      { text: "Create Shopify/WooCommerce account and apply brand theme" },
      { text: "Configure payment gateway (Stripe, PayPal, Klarna)" },
      { text: "Set up shipping zones and rates (Germany, EU, worldwide)" },
      { text: "Configure VAT/tax settings (19% MwSt for German businesses)" },
      { text: "Set up order notification and confirmation emails" },
      { text: "Add client as store admin — share admin link" },
      {
        text: "Client imports product catalog (products, prices, descriptions, images)",
        clientText: "Add your products to the store — use the admin link shared below",
        clientOwned: true,
      },
      { text: "QA the complete checkout flow end-to-end" },
    ],
    tools: ["Shopify", "WooCommerce", "Stripe", "PayPal", "Klaviyo"],
    tip: "Time saver: send the client a product import template CSV. Shopify's native bulk import is much faster than manual entry for larger catalogs.",
    adminArtifactHint: "e.g. Shopify Admin link, product import template (CSV), staging checkout walkthrough",
    clientArtifactHint: "e.g. Product spreadsheet, product photos (Drive link), pricing list",
    handoverNote:
      "Share the admin link and the product import template. The client must add all products before you can QA the checkout — make the dependency clear.",
    clientGuidance:
      "The store is set up — now it needs your products! Use the admin link your designer shared to add your products, descriptions, prices, and images. The more complete this is, the sooner you can launch.",
  },
  {
    n: 3,
    color: "#60C8B0",
    badge: "1 day",
    title: "Legal & Compliance",
    clientTitle: "Legal Review",
    sub: "EU compliance, checkout testing, and pre-launch QA",
    clientSub: "Final legal checks before your store opens",
    steps: [
      { text: "Add Impressum, Datenschutzerklärung, AGB, and Widerrufsbelehrung" },
      { text: "Install cookie consent banner (Cookiebot or equivalent)" },
      { text: "Test complete purchase flow: cart → checkout → confirmation email" },
      { text: "Mobile QA: product pages and checkout on iOS and Android" },
      { text: "Check Core Web Vitals (GTMetrix or Vercel)" },
      { text: "Set up Google Analytics 4 + optional Meta Pixel" },
      {
        text: "Client reviews legal pages and confirms accuracy",
        clientText: "Review your legal pages (AGB, Widerrufsbelehrung) and confirm they're correct",
        clientOwned: true,
      },
    ],
    tools: ["Cookiebot", "Trusted Shops", "Google Analytics 4"],
    tip: "German law requires Widerrufsbelehrung (14-day right of return) even for digital goods in many cases. Use a generator — don't write it yourself.",
    adminArtifactHint: "e.g. Pre-launch checklist, legal pages doc, test order screenshot",
    clientArtifactHint: "e.g. Updated legal info, confirmed return policy, VAT number",
    handoverNote:
      "Share the pre-launch checklist with the client and ask for written sign-off on the legal pages. Do not launch without explicit confirmation.",
    clientGuidance:
      "We're doing final checks before launch. Your task: review the legal pages (especially the cancellation policy and T&Cs) and confirm they're accurate — this is a legal requirement in Germany.",
  },
  {
    n: 4,
    color: "#FBBF24",
    badge: "1 day",
    title: "Launch & Handoff",
    clientTitle: "Go Live",
    sub: "Connect domain, go live, hand over the store",
    clientSub: "Your store opens for business",
    steps: [
      { text: "Final review: all products, checkout, confirmation emails, mobile" },
      { text: "Record Loom: orders, products, discounts, and store settings" },
      { text: "Deliver handoff doc: how to add products, process orders, run promotions" },
      { text: "Set up uptime monitoring (Better Uptime)" },
      {
        text: "Client connects custom domain (follow DNS instructions)",
        clientText: "Connect your domain to open your store",
        clientOwned: true,
      },
    ],
    tools: ["Shopify", "Vercel", "Loom", "Better Uptime", "Cloudflare"],
    tip: "The Loom walkthrough is the single biggest reducer of post-launch support emails. Cover: adding a product, processing an order, applying a discount code.",
    adminArtifactHint: "e.g. DNS connection guide, handoff doc, Loom order management walkthrough",
    clientArtifactHint: "e.g. Domain registrar name, nameserver / DNS access details",
    handoverNote:
      "Share the DNS instructions and the Loom walkthrough. Wait for domain connection before marking this phase complete.",
    clientGuidance: "Almost there! Follow the domain instructions below and your store will be open for business.",
  },
  {
    n: 5,
    color: "#FB923C",
    badge: "€150–400/mo",
    title: "Growth & Retainer",
    clientTitle: "Monthly Growth",
    sub: "Recurring revenue with monthly store management",
    clientSub: "Ongoing store maintenance and growth",
    steps: [
      { text: "Monthly performance report: revenue, conversion rate, top products" },
      { text: "Product catalog updates and seasonal promotions" },
      { text: "Google Shopping and/or Meta Ads management" },
      { text: "Email marketing automation (Klaviyo: welcome series, abandoned cart)" },
      { text: "Platform updates and security maintenance" },
    ],
    tools: ["Google Ads", "Meta Ads", "Klaviyo", "Google Analytics 4"],
    tip: "Abandoned cart email sequences alone can recover 5–15% of lost sales. Set up Klaviyo's automated flow in the first retainer month.",
    adminArtifactHint: "e.g. Monthly performance report, ad campaign results, email flow stats",
    clientArtifactHint: "e.g. New products to add, upcoming promotions, seasonal content",
    handoverNote:
      "Send the monthly report and flag revenue dips or conversion issues proactively. Schedule a quick call if there are strategic decisions.",
    clientGuidance:
      "We handle your store's monthly maintenance and growth. Share new products, upcoming promotions, or anything you'd like changed below — we'll handle the rest.",
  },
];

// ── App ────────────────────────────────────────────────────────────────────

export const APP_PHASES: Phase[] = [
  {
    n: 0,
    color: "#5B8CFF",
    badge: "2–4 hrs",
    title: "Discovery & Requirements",
    sub: "Define user flows, MVP scope, and tech stack",
    steps: [
      { text: "Define primary user personas — who uses this, why, what they need" },
      { text: "Map core user flows (not pages — flows: sign-up → onboard → key action)" },
      { text: "Define MVP feature set: what's in v1, what's explicitly deferred" },
      { text: "Tech stack decision: framework, database, auth method, hosting" },
      { text: "Agree on timeline, milestones, and payment structure" },
      { text: "Send project link to client — confirm scope in writing" },
    ],
    tools: ["Notion", "FigJam", "Google Meet", "Loom"],
    tip: "The most expensive mistake in app development is building the wrong thing. Spend disproportionate time here. A clear user-flow diagram is worth more than a 10-page spec.",
    adminArtifactHint: "e.g. User flow diagram, confirmed feature list (in / out of scope), tech stack doc",
    clientArtifactHint: "e.g. Reference apps you love, rough wireframe sketches, notes from our call",
    handoverNote:
      "Share the confirmed feature list and user flow diagram. Get explicit written sign-off on scope — any ambiguity here becomes expensive later.",
    clientGuidance: "",
  },
  {
    n: 1,
    color: "#A78BFA",
    badge: "4–7 days",
    title: "UX & Design",
    clientTitle: "Review Your App Design",
    sub: "Wireframes, design system, and Figma prototype",
    clientSub: "Review and approve your app's look and flow",
    steps: [
      { text: "Create lo-fi wireframes for all key flows (FigJam)" },
      { text: "Build design system: colours, typography, spacing, component specs" },
      { text: "Build hi-fi Figma prototype for core screens" },
      {
        text: "Client reviews prototype and annotates feedback",
        clientText: "Click through the prototype below and leave your feedback — once you approve, we start building",
        clientOwned: true,
      },
      { text: "Iterate based on feedback" },
      {
        text: "Client gives explicit sign-off before development begins",
        clientText: "Confirm the design is approved — this starts the development phase",
        clientOwned: true,
      },
    ],
    tools: ["Figma", "FigJam"],
    tip: "Get explicit sign-off on the design before writing a single line of production code. Post-dev design changes are 10× more expensive.",
    adminArtifactHint: "e.g. Figma prototype link, wireframe PDF, design system overview",
    clientArtifactHint: "e.g. Reference screen designs, brand guide, logo files",
    handoverNote:
      "Share the Figma prototype link and ask for explicit written approval. Do not start Phase 2 without it — this boundary protects both you and the client.",
    clientGuidance:
      "Here's the design for your app. Click through the prototype below — try every screen. Leave comments on anything you'd like changed. Your written approval here is what starts the build.",
  },
  {
    n: 2,
    color: "#34D399",
    badge: "1–2 weeks",
    title: "Frontend Build",
    clientTitle: "Review Build Progress",
    sub: "Scaffold, components, and all UI views",
    clientSub: "Your app is being built — review progress previews",
    steps: [
      { text: "Scaffold project (Next.js + Tailwind + shadcn/ui)" },
      { text: "Build shared component library: buttons, inputs, cards, navigation" },
      { text: "Implement all pages / views per Figma specs" },
      { text: "Set up routing, navigation, and loading states" },
      { text: "Connect to mock data or API stubs" },
      { text: "Deploy continuous preview to Vercel" },
      {
        text: "Client reviews staging preview on desktop and mobile",
        clientText: "Review the staging link below on your phone and computer — note anything that looks or feels off",
        clientOwned: true,
      },
    ],
    tools: ["Next.js", "Tailwind", "shadcn/ui", "Vercel", "v0 by Vercel"],
    tip: "Build mobile-first from day one. Retrofitting responsive design is painful. Use Tailwind's responsive prefixes on every layout element.",
    adminArtifactHint: "e.g. Vercel staging link, component library preview, screenshot walkthrough",
    clientArtifactHint: "e.g. Design feedback notes, copy / content for specific pages",
    handoverNote:
      "Share the staging link and ask the client to review on both desktop and mobile. Collect all visual feedback before connecting real data in Phase 3.",
    clientGuidance:
      "Your app is taking shape! Click the staging link below on your phone and your computer. Note anything that doesn't look or feel right — we'll fix it before connecting real data.",
  },
  {
    n: 3,
    color: "#60C8B0",
    badge: "1–2 weeks",
    title: "Backend & Integrations",
    clientTitle: "Backend Setup",
    sub: "Database, API routes, auth, and third-party integrations",
    clientSub: "We're connecting your app to real data",
    steps: [
      { text: "Design and implement database schema (Drizzle + Postgres / Supabase)" },
      { text: "Build API routes: all CRUD operations and business logic" },
      { text: "Implement authentication (Clerk or Auth.js)" },
      { text: "Integrate third-party services (Stripe, Resend, etc.)" },
      { text: "Set up production environment on Railway or Vercel" },
      { text: "Connect frontend to real API" },
      {
        text: "Client tests core flows with real data",
        clientText:
          "Try signing up and using the main features with real data — report anything that doesn't work as expected",
        clientOwned: true,
      },
    ],
    tools: ["Supabase", "Railway", "Drizzle", "Clerk", "Stripe", "Resend"],
    tip: "Auth is the most common source of scope creep. Define the full auth model (roles, permissions, session expiry) before starting this phase.",
    adminArtifactHint: "e.g. Updated staging link with real data, database schema diagram, API reference",
    clientArtifactHint: "e.g. Test account credentials, Stripe test card numbers, bug report from testing",
    handoverNote:
      "Share the updated staging link with real data. Walk the client through the sign-up flow and core actions. Log all bugs before moving to QA.",
    clientGuidance:
      "Your app is now connected to real data. Try signing up, completing the core flow, and using the main features. Report anything unexpected below — this is the best time to catch issues.",
  },
  {
    n: 4,
    color: "#FBBF24",
    badge: "2–4 days",
    title: "QA & Testing",
    clientTitle: "User Testing",
    sub: "End-to-end testing, performance, and security",
    clientSub: "Test your app before launch",
    steps: [
      { text: "End-to-end testing of all user flows" },
      { text: "Performance audit: Core Web Vitals, bundle size, API response times" },
      { text: "Security review: auth on every route, input validation, no secrets in client" },
      { text: "Cross-browser and mobile testing" },
      { text: "Fix all critical and major bugs" },
      {
        text: "Client completes user acceptance testing (UAT) — every feature end-to-end",
        clientText:
          "Test every feature in the app as if you were a real user — follow the checklist and report any bugs",
        clientOwned: true,
      },
      {
        text: "Client gives written UAT sign-off",
        clientText: "Confirm UAT is complete and the app is ready to launch",
        clientOwned: true,
      },
    ],
    tools: ["Playwright", "Sentry", "Vercel Analytics"],
    tip: "Ask the client to do UAT on their own device without guidance. If they can't figure out how to use it, that's a UX bug, not user error.",
    adminArtifactHint: "e.g. QA checklist results, bug report, Lighthouse audit screenshot",
    clientArtifactHint: "e.g. UAT bug report, screen recordings of issues, written sign-off",
    handoverNote:
      "Share the QA staging link and a simple test script covering all main flows. Require written sign-off from the client before you deploy to production.",
    clientGuidance:
      "It's your turn to test! Work through the app as if you were a real user. Report any bugs, confusing flows, or missing features below. Your sign-off here means we're cleared to launch.",
  },
  {
    n: 5,
    color: "#FB923C",
    badge: "1–2 days",
    title: "Launch & Handoff",
    clientTitle: "Launch",
    sub: "Production deployment, domain, monitoring, and handoff",
    clientSub: "Your app goes live",
    steps: [
      { text: "Deploy to production (Railway / Vercel + Supabase production project)" },
      { text: "Configure all environment variables for production" },
      { text: "Connect custom domain and verify SSL" },
      { text: "Set up error monitoring (Sentry) and uptime monitoring" },
      { text: "Record Loom: app walkthrough + any admin interface" },
      { text: "Deliver handoff doc and repository access" },
      {
        text: "Client connects custom domain",
        clientText: "Connect your domain to make the app live",
        clientOwned: true,
      },
    ],
    tools: ["Vercel", "Railway", "Sentry", "Better Uptime", "Loom", "GitHub"],
    tip: "Sentry + Better Uptime is a 15-minute setup that will save hours of blind debugging. Set them up before marking this phase done.",
    adminArtifactHint: "e.g. Production URL, Loom walkthrough, handoff doc, GitHub repo invite",
    clientArtifactHint: "e.g. Domain registrar details, DNS access credentials",
    handoverNote:
      "Share the production URL, Loom walkthrough, handoff doc, and repo access. Confirm the client has all credentials before marking this complete.",
    clientGuidance: "Connect your domain using the instructions below and your app goes live. Congratulations!",
  },
  {
    n: 6,
    color: "#F472B6",
    badge: "€200–600/mo",
    title: "Ongoing Development",
    clientTitle: "Monthly Development",
    sub: "Feature sprints, bug fixes, and infrastructure",
    clientSub: "Continuous improvement of your app",
    steps: [
      { text: "Monthly feature sprint: implement approved backlog items" },
      { text: "Dependency updates and security patches" },
      { text: "Monthly review: Sentry errors, performance metrics, usage data" },
      { text: "Infrastructure cost review and optimisation" },
      { text: "Communicate sprint summary and upcoming plans to client" },
    ],
    tools: ["GitHub", "Linear", "Sentry", "Railway", "Vercel"],
    tip: "Keep a shared backlog in Notion or Linear. Getting client sign-off on priorities before each sprint eliminates scope disputes mid-month.",
    adminArtifactHint: "e.g. Monthly sprint summary, changelog, performance report, backlog link",
    clientArtifactHint: "e.g. Feature requests, bug reports, updated copy or design assets",
    handoverNote:
      "Send the monthly sprint summary and flag upcoming planned items. Review and reprioritise the backlog together each month.",
    clientGuidance:
      "Share feature requests, bugs, or anything you'd like improved below. We review and prioritise your backlog at the start of each month.",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

export function getPhases(type: ProjectType): Phase[] {
  if (type === "shop") return SHOP_PHASES;
  // if (type === "app") return APP_PHASES;
  return WEBSITE_PHASES;
}

export function getTotalSteps(type: ProjectType): number {
  return getPhases(type).reduce((sum, p) => sum + p.steps.length, 0);
}

// Legacy export — website is the original type
export const PHASES = WEBSITE_PHASES;
export const TOTAL_STEPS = getTotalSteps("website");

export const TOOL_URLS: Record<string, string> = {
  Notion: "https://notion.so",
  Loom: "https://loom.com",
  "Google Meet": "https://meet.google.com",
  FigJam: "https://www.figma.com/figjam",
  Figma: "https://figma.com",
  "v0 by Vercel": "https://v0.dev",
  Looka: "https://looka.com",
  Brandmark: "https://brandmark.io",
  Midjourney: "https://midjourney.com",
  Ideogram: "https://ideogram.ai",
  "Next.js": "https://nextjs.org",
  Tailwind: "https://tailwindcss.com",
  "shadcn/ui": "https://ui.shadcn.com",
  Sanity: "https://sanity.io",
  Vercel: "https://vercel.com",
  "Claude Code": "https://claude.ai/code",
  Resend: "https://resend.com",
  Shopify: "https://shopify.com",
  WooCommerce: "https://woocommerce.com",
  Stripe: "https://stripe.com",
  PayPal: "https://paypal.com",
  Klaviyo: "https://klaviyo.com",
  Cookiebot: "https://cookiebot.com",
  "Trusted Shops": "https://trustedshops.de",
  Cloudflare: "https://cloudflare.com",
  Supabase: "https://supabase.com",
  Railway: "https://railway.app",
  Clerk: "https://clerk.com",
  Drizzle: "https://orm.drizzle.team",
  Playwright: "https://playwright.dev",
  Sentry: "https://sentry.io",
  Linear: "https://linear.app",
  GitHub: "https://github.com",
  "Google Search Console": "https://search.google.com/search-console",
  "Google Analytics 4": "https://analytics.google.com",
  "Vercel Analytics": "https://vercel.com/analytics",
  "Better Uptime": "https://betteruptime.com",
  "Google Ads": "https://ads.google.com",
  "Meta Ads": "https://www.facebook.com/adsmanager",
};

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  website: "Website",
  shop: "Shop",
  // app: "App",
};
