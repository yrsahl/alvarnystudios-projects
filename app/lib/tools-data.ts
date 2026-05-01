export interface Tool {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
}

export const tools: Tool[] = [
  { id: "v0",       name: "v0",          description: "AI UI generator",    url: "https://v0.dev",                      icon: "v0" },
  { id: "sanity",   name: "Sanity",      description: "Content management", url: "https://sanity.io/manage",            icon: "S"  },
  { id: "vercel",   name: "Vercel",      description: "Deployments",        url: "https://vercel.com/dashboard",        icon: "▲" },
  { id: "github",   name: "GitHub",      description: "Repositories",       url: "https://github.com",                  icon: "GH" },
  { id: "looka",    name: "Looka",       description: "Brand + logo",       url: "https://looka.com",                   icon: "L"  },
  { id: "midj",     name: "Midjourney",  description: "AI images",          url: "https://midjourney.com",              icon: "M"  },
  { id: "resend",   name: "Resend",      description: "Transactional email",url: "https://resend.com",                  icon: "R"  },
  { id: "ga4",      name: "Analytics",   description: "Google Analytics 4", url: "https://analytics.google.com",        icon: "GA" },
  { id: "gsc",      name: "Search Console", description: "SEO monitoring",  url: "https://search.google.com/search-console", icon: "SC" },
  { id: "notion",   name: "Notion",      description: "Docs & planning",    url: "https://notion.so",                   icon: "N"  },
  { id: "loom",     name: "Loom",        description: "Screen recording",   url: "https://loom.com",                    icon: "Lo" },
  { id: "claude",   name: "Claude Code", description: "AI dev assistant",   url: "https://claude.ai/code",              icon: "C"  },
];
