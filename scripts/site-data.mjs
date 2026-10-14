export const CATEGORY_NAMES = {
  "static-hosting": "Static & frontend hosting",
  "app-hosting": "Backend & app hosting",
  "serverless": "Serverless & edge",
  "cloud-vps": "Cloud compute & VPS",
  "databases": "Databases & caching",
  "storage": "Object storage",
  "developer-tools": "APIs & developer tools",
  "auth-security": "Authentication & security",
  "observability": "Monitoring & observability",
  "analytics": "Product analytics",
  "dns-cdn": "DNS & CDN",
  "ai-ml": "AI & ML platforms",
  "ai-assistants": "AI chatbots & assistants",
  "queues-jobs": "Queues, workflows & scheduling",
  "search": "Hosted search",
  "feature-flags": "Feature flags & gradual rollout",
  "tunneling-networking": "Tunneling & networking",
  "webhooks-events": "Webhooks & event delivery"
};

export const CATEGORY_LABELS = {
  "static-hosting": "Static hosting",
  "app-hosting": "App hosting",
  "serverless": "Serverless",
  "cloud-vps": "Cloud & VPS",
  "databases": "Databases",
  "storage": "Storage",
  "developer-tools": "Developer tools",
  "auth-security": "Authentication",
  "observability": "Monitoring",
  "analytics": "Analytics",
  "dns-cdn": "DNS & CDN",
  "ai-ml": "AI & ML",
  "ai-assistants": "AI assistants",
  "queues-jobs": "Queues & workflows",
  "search": "Search",
  "feature-flags": "Feature flags",
  "tunneling-networking": "Networking",
  "webhooks-events": "Webhooks & events"
};

export const PLAN_NAMES = {
  "ongoing": "Ongoing free allowance",
  "monthly-credit": "Monthly credit",
  "limited-duration": "Time-limited offer",
  "temporary-resource": "Expiring free resource"
};

export const CARD_NAMES = {
  "yes": "Required",
  "no": "Not required",
  "check": "Check provider"
};

export const COMMERCIAL_NAMES = {
  "yes": "Allowed",
  "no": "Restricted / personal use",
  "check": "Check provider"
};

export const ICON_PATHS = {
  "sparkles": "<path d=\"m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z\"/><path d=\"M20 2v4m-2-2h4\"/>",
  "bot": "<rect x=\"4\" y=\"7\" width=\"16\" height=\"14\" rx=\"4\"/><path d=\"M12 3v4M2 12v5m20-5v5M8 12h.01M16 12h.01M9 17h6\"/>",
  "storage": "<path d=\"m3 7 9-4 9 4v10l-9 4-9-4Z\"/><path d=\"m3 7 9 4 9-4M12 11v10\"/>",
  "webhook": "<circle cx=\"6\" cy=\"17\" r=\"3\"/><circle cx=\"18\" cy=\"17\" r=\"3\"/><circle cx=\"12\" cy=\"5\" r=\"3\"/><path d=\"m10.5 7.6-3 6.8M13.5 7.6l3 6.8M9 17h6\"/>",
  "github": "<path d=\"M9 19c-4.3 1.3-4.3-2.2-6-2.7M15 22v-3.9c0-1.1-.1-1.5-.5-2 3.3-.4 6.7-1.6 6.7-7.3A5.7 5.7 0 0 0 19.7 5c.2-.8.2-2.1-.2-3.1 0 0-1.2-.4-4 1.5a13.5 13.5 0 0 0-7 0C5.7 1.5 4.5 1.9 4.5 1.9 4.1 2.9 4.1 4.2 4.3 5a5.7 5.7 0 0 0-1.5 3.8c0 5.7 3.4 6.9 6.7 7.3-.4.5-.5 1.1-.5 2V22\"/>",
  "layers": "<path d=\"m12 2 9 5-9 5-9-5 9-5Z\"/><path d=\"m3 12 9 5 9-5M3 17l9 5 9-5\"/>",
  "grid": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/>",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M2 12h20\"/><path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z\"/>",
  "server": "<rect width=\"20\" height=\"8\" x=\"2\" y=\"2\" rx=\"2\"/><rect width=\"20\" height=\"8\" x=\"2\" y=\"14\" rx=\"2\"/><path d=\"M6 6h.01M6 18h.01\"/>",
  "cloud": "<path d=\"M20 16.6A4.5 4.5 0 0 0 17.5 8 6 6 0 0 0 6 9.2 4 4 0 0 0 6 17h13\"/>",
  "database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0\"/>",
  "code": "<path d=\"m16 18 6-6-6-6M8 6l-6 6 6 6m6.5-16-5 20\"/>",
  "zap": "<path d=\"m13 2-3 8H5l9 12 2-8h5L13 2Z\"/>",
  "shield": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z\"/><path d=\"m9 12 2 2 4-4\"/>",
  "activity": "<path d=\"M22 12h-4l-3 9L9 3l-3 9H2\"/>",
  "chart": "<path d=\"M3 3v18h18M7 16l4-5 4 3 5-8\"/>",
  "network": "<rect x=\"2\" y=\"2\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"16\" y=\"2\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"9\" y=\"16\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M5 8v4h14V8M12 12v4\"/>",
  "queue": "<path d=\"M4 6h16M4 12h16M4 18h10\"/><path d=\"m17 15 3 3-3 3\"/>",
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.35-4.35\"/>",
  "flag": "<path d=\"M4 22V4m0 1c5-4 8 4 16 0v11c-8 4-11-4-16 0\"/>",
  "arrow": "<path d=\"M5 12h14m-6-6 6 6-6 6\"/>",
  "chevron": "<path d=\"m6 9 6 6 6-6\"/>",
  "check": "<path d=\"m5 12 4 4L19 6\"/>",
  "moon": "<path d=\"M20.985 12.486A9 9 0 0 1 11.514 3.015a9 9 0 1 0 9.47 9.47Z\"/>",
  "alert": "<path d=\"m10.3 3.86-8.4 14.5A2 2 0 0 0 3.63 21h16.74a2 2 0 0 0 1.73-3l-8.4-14.14a2 2 0 0 0-3.4 0ZM12 9v4m0 4h.01\"/>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l4 2\"/>"
};

export const CATEGORY_ICONS = {
  "static-hosting": "globe",
  "app-hosting": "server",
  "serverless": "zap",
  "cloud-vps": "cloud",
  "databases": "database",
  "storage": "storage",
  "developer-tools": "code",
  "auth-security": "shield",
  "observability": "activity",
  "analytics": "chart",
  "dns-cdn": "network",
  "ai-ml": "sparkles",
  "ai-assistants": "bot",
  "queues-jobs": "queue",
  "search": "search",
  "feature-flags": "flag",
  "tunneling-networking": "network",
  "webhooks-events": "webhook"
};

// Actual website favicons, with product domains for shared corporate sources.
// Unlisted providers derive their logo domain from their official pricing URL.
export const SERVICE_LOGO_DOMAINS = {
  'chatgpt-free': 'chatgpt.com',
  'gemini-app-free': 'gemini.google.com',
  'gemini-api': 'aistudio.google.com',
  'google-cloud-run': 'cloud.google.com',
  'gce-e2-micro': 'cloud.google.com',
  'gcs': 'cloud.google.com',
  'firebase-hosting': 'firebase.google.com',
  'firebase-rtdb': 'firebase.google.com',
  'azure-static-web-apps': 'azure.microsoft.com',
  'aws-free-plan': 'aws.amazon.com',
  'tinyfish-search-fetch': 'tinyfish.io',
  'github-pages': 'github.com',
  'github-actions': 'github.com',
  'github-codespaces': 'github.com',
  'github-packages': 'github.com',
};
