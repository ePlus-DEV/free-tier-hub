export const CATEGORY_NAMES = {
  "static-hosting": "Static & frontend hosting",
  "app-hosting": "Backend & app hosting",
  "serverless": "Serverless & edge",
  "cloud-vps": "Cloud compute & VPS",
  "databases": "Databases & caching",
  "storage": "Object storage",
  "developer-tools": "APIs & developer tools",
  "ci-cd": "CI/CD & pipelines",
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
  "webhooks-events": "Webhooks & event delivery",
  "email-notifications": "Email & notifications",
  "testing-qa": "Testing & QA",
  "forms-surveys": "Forms & surveys"
};

// Short editorial descriptions for the all-categories overview.
export const CATEGORY_DESCRIPTIONS = {
  "static-hosting": "Publish websites, frontend apps and static assets with hosted build and delivery tools.",
  "app-hosting": "Deploy backends, web applications and APIs without managing every infrastructure detail.",
  "serverless": "Run functions and edge workloads with usage-based limits and lightweight operations.",
  "cloud-vps": "Compare virtual machines, infrastructure allowances and entry-level cloud compute.",
  "databases": "Find managed and self-hosted databases, caches and data persistence options.",
  "storage": "Store objects, files, backups and application assets with clear capacity limits.",
  "developer-tools": "Explore APIs, CLIs, coding utilities and developer productivity tooling.",
  "ci-cd": "Automate builds, tests, releases and delivery pipelines.",
  "auth-security": "Manage identity, access, authentication and security workflows.",
  "observability": "Track availability, application health, logs, traces and performance.",
  "analytics": "Understand usage, product behavior and data with analytics tools.",
  "dns-cdn": "Route traffic, manage DNS and deliver content closer to users.",
  "ai-ml": "Build and experiment with machine learning models and AI platforms.",
  "ai-assistants": "Discover conversational AI assistants and agent workflows.",
  "queues-jobs": "Schedule tasks, process background work and connect asynchronous systems.",
  "search": "Integrate hosted search and indexing into websites or applications.",
  "feature-flags": "Control feature releases, configuration and gradual rollouts.",
  "tunneling-networking": "Connect environments, expose local services and manage private networking.",
  "webhooks-events": "Inspect webhooks, deliver events and integrate event-driven systems.",
  "email-notifications": "Send transactional and marketing email, route inbound mail, and deliver push or multichannel notifications.",
  "testing-qa": "Validate APIs, mock services, run load tests and catch UI regressions before release.",
  "forms-surveys": "Collect form submissions, run user surveys and connect structured responses to applications."
};

export const CATEGORY_LABELS = {
  "static-hosting": "Static hosting",
  "app-hosting": "App hosting",
  "serverless": "Serverless",
  "cloud-vps": "Cloud & VPS",
  "databases": "Databases",
  "storage": "Storage",
  "developer-tools": "Developer tools",
  "ci-cd": "CI/CD",
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
  "webhooks-events": "Webhooks & events",
  "email-notifications": "Email & messaging",
  "testing-qa": "Testing & QA",
  "forms-surveys": "Forms & surveys"
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

export const CATEGORY_ICONS = {
  "static-hosting": "globe",
  "app-hosting": "server",
  "serverless": "zap",
  "cloud-vps": "cloud",
  "databases": "database",
  "storage": "storage",
  "developer-tools": "code",
  "ci-cd": "code",
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
  "webhooks-events": "webhook",
  "email-notifications": "webhook",
  "testing-qa": "shield",
  "forms-surveys": "layers"
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
  'litlyx-self-hosted': 'litlyx.com',
  'github-pages': 'github.com',
  'github-actions': 'github.com',
  'github-codespaces': 'github.com',
  'github-packages': 'github.com',
};
