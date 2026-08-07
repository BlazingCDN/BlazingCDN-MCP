export interface DocEntry {
  title: string;
  url: string;
  keywords: string[];
  summary: string;
}

export const DOCS: DocEntry[] = [
  {
    title: "BlazingCDN API reference",
    url: "https://wapi.blazingcdn.com/api-docs/index.html",
    keywords: ["api", "reference", "rest", "endpoint", "token", "swagger", "openapi", "wapi"],
    summary: "Full REST API documentation: Anycast CDN, Video CDN, Cloud Storage, DNS and account endpoints.",
  },
  {
    title: "Knowledge base",
    url: "https://knowledgebase.blazingcdn.com/",
    keywords: ["knowledge", "base", "kb", "guide", "how", "tutorial", "help", "setup", "documentation"],
    summary: "Step-by-step guides for setting up and operating BlazingCDN products.",
  },
  {
    title: "Help center",
    url: "https://help.blazingcdn.com/",
    keywords: ["help", "support", "ticket", "faq", "question"],
    summary: "BlazingCDN help center and support portal.",
  },
  {
    title: "Anycast CDN",
    url: "https://blazingcdn.com/anycast-cdn/",
    keywords: ["anycast", "cdn", "pull", "zone", "acdn", "network", "pop", "edge"],
    summary: "Anycast CDN product overview: global network, pull zones, routing.",
  },
  {
    title: "Video CDN",
    url: "https://blazingcdn.com/video-cdn/",
    keywords: ["video", "vcdn", "vod", "player", "mp4", "hls"],
    summary: "Video CDN product: video delivery, storage and processing.",
  },
  {
    title: "Streaming CDN",
    url: "https://blazingcdn.com/streaming-cdn/",
    keywords: ["streaming", "live", "broadcast", "hls", "dash", "ott"],
    summary: "CDN for live streaming and OTT platforms.",
  },
  {
    title: "Cloud Storage CDN",
    url: "https://blazingcdn.com/cloud-storage-cdn/",
    keywords: ["storage", "bucket", "cloud", "s3", "origin", "swift"],
    summary: "Cloud storage integrated with the CDN: buckets as origins.",
  },
  {
    title: "Pricing",
    url: "https://blazingcdn.com/pricing/",
    keywords: ["pricing", "price", "cost", "plan", "traffic", "tb", "pay"],
    summary: "BlazingCDN pricing.",
  },
  {
    title: "Features",
    url: "https://blazingcdn.com/features/",
    keywords: ["features", "compression", "ssl", "http2", "shield", "capability"],
    summary: "Full feature list: compression, SSL, origin shield, cache control and more.",
  },
  {
    title: "How a CDN works",
    url: "https://blazingcdn.com/how-cdn-works/",
    keywords: ["how", "works", "explain", "basics", "cache", "introduction"],
    summary: "Introduction to CDN concepts: caching, edge delivery, TTL.",
  },
  {
    title: "OTT & VOD streaming CDN",
    url: "https://blazingcdn.com/ott-vod-streaming-cdn/",
    keywords: ["ott", "vod", "streaming", "media"],
    summary: "CDN solutions for OTT and video-on-demand platforms.",
  },
  {
    title: "Hybrid CDN solutions",
    url: "https://blazingcdn.com/hybrid-cdn-solutions/",
    keywords: ["hybrid", "multi", "private", "dedicated"],
    summary: "Hybrid and private CDN deployments.",
  },
  {
    title: "Multi-CDN integration",
    url: "https://blazingcdn.com/multi-cdn-integration/",
    keywords: ["multi-cdn", "multi", "integration", "failover", "balancing"],
    summary: "Using BlazingCDN in a multi-CDN setup.",
  },
  {
    title: "Performance metrics",
    url: "https://blazingcdn.com/performance-metrics/",
    keywords: ["performance", "metrics", "speed", "latency", "benchmark"],
    summary: "Network performance and benchmark data.",
  },
  {
    title: "CDN comparison",
    url: "https://blazingcdn.com/cdn-comparison/",
    keywords: ["comparison", "compare", "competitor", "alternative", "versus"],
    summary: "How BlazingCDN compares to other CDN providers.",
  },
  {
    title: "FAQ",
    url: "https://blazingcdn.com/faq/",
    keywords: ["faq", "question", "answer", "common"],
    summary: "Frequently asked questions.",
  },
  {
    title: "Contact sales",
    url: "https://blazingcdn.com/sign-up-contact-form/",
    keywords: ["sign", "signup", "register", "account", "sales", "contact", "start"],
    summary: "Contact form to get a BlazingCDN account.",
  },
];
