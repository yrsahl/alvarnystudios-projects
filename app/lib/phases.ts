export interface Step {
  text: string;
  clientText?: string; // client-facing description for clientOwned steps
  clientOwned?: boolean;
}

export interface Phase {
  n: number;
  color: string;
  badge: string;
  title: string;
  clientTitle?: string; // client-facing phase title where admin copy is inappropriate
  sub: string;
  clientSub?: string; // client-facing subtitle where admin copy is inappropriate
  steps: Step[];
  tools: string[];
  tip: string;
  adminArtifactHint: string; // placeholder label for artifacts admin shares with client
  clientArtifactHint: string; // placeholder label for artifacts client shares with admin
}

export const PHASES: Phase[] = [
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
  },
  {
    n: 1,
    color: "#A78BFA",
    badge: "1–2 days",
    title: "Brand & Design",
    sub: "Lock in visual identity before writing any code",
    steps: [
      { text: "If no brand exists: use Looka or Brandmark to generate logo + palette + fonts" },
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
    tools: ["v0 by Vercel", "Looka", "Midjourney", "Ideogram"],
    tip: "Workflow: Looka → brand tokens → v0 layout → Midjourney images. Client sees a working preview before you write a single component.",
    adminArtifactHint: "e.g. Design preview link, logo options, colour palette, v0 prototype",
    clientArtifactHint: "e.g. Brand inspiration, existing logo file, reference sites you like",
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
    tip: "Time saver: The starter template means most of this is config, not coding. Aim for a first working preview within one day.",
    adminArtifactHint: "e.g. Staging site URL, CMS (Sanity Studio) link, Vercel preview",
    clientArtifactHint: "e.g. Content folder (Google Drive), existing site, product photos",
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
    tip: "Quick win: Google Business Profile optimisation often has more immediate impact on local visibility than the website itself.",
    adminArtifactHint: "e.g. Keyword list, GBP optimisation guide, analytics dashboard",
    clientArtifactHint: "e.g. Google Business Profile URL, photo library (Drive), target service areas",
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
      {
        text: "Connect custom domain in Vercel",
        clientText: "Connect your domain to make the site live",
        clientOwned: true,
      },
      { text: "Record a Loom walkthrough of Sanity Studio for the client" },
      { text: "Deliver a one-page handoff doc: how to update content, who to call" },
      { text: "Set up uptime monitoring (Better Uptime — free tier)" },
    ],
    tools: ["Vercel", "Loom", "Better Uptime"],
    tip: "German market: Impressum and Datenschutzerklärung are legal requirements. Use a generator like datenschutz.org for the privacy policy.",
    adminArtifactHint: "e.g. DNS / nameserver instructions, handoff doc, Loom walkthrough",
    clientArtifactHint: "e.g. Domain registrar name, domain, login details for DNS access",
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
      { text: "Monthly analytics report — screenshot + 3 bullet summary" },
      { text: "Content updates: blog posts, service changes, seasonal offers" },
      { text: "Google Ads or Meta Ads management (optional premium add-on)" },
      { text: "Annual check: renew domain, review SEO, update dependencies" },
    ],
    tools: ["Vercel", "Google Ads", "Meta Ads", "Notion"],
    tip: "Goal: 5–8 retainer clients = €500–2.400/mo of predictable income running in the background alongside new project work.",
    adminArtifactHint: "e.g. Monthly analytics report, campaign results, ad performance",
    clientArtifactHint: "e.g. Content update request, new photos, upcoming offers or events",
  },
];

export const TOTAL_STEPS = PHASES.reduce((sum, p) => sum + p.steps.length, 0);

export const TOOL_URLS: Record<string, string> = {
  "Notion": "https://notion.so",
  "Loom": "https://loom.com",
  "Google Meet": "https://meet.google.com",
  "v0 by Vercel": "https://v0.dev",
  "Looka": "https://looka.com",
  "Midjourney": "https://midjourney.com",
  "Ideogram": "https://ideogram.ai",
  "Next.js": "https://nextjs.org",
  "Sanity": "https://sanity.io",
  "Vercel": "https://vercel.com",
  "Claude Code": "https://claude.ai/code",
  "Resend": "https://resend.com",
  "Google Search Console": "https://search.google.com/search-console",
  "Google Analytics 4": "https://analytics.google.com",
  "Vercel Analytics": "https://vercel.com/analytics",
  "Better Uptime": "https://betteruptime.com",
  "Google Ads": "https://ads.google.com",
  "Meta Ads": "https://www.facebook.com/adsmanager",
};
