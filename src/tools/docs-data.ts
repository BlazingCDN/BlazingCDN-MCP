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
    title: "Help center (knowledge base)",
    url: "https://help.blazingcdn.com/",
    keywords: ["knowledge", "base", "kb", "guide", "how", "tutorial", "help", "setup", "documentation", "faq", "question"],
    summary: "Step-by-step guides for setting up and operating BlazingCDN products in the customer panel.",
  },
  {
    title: "Customer panel",
    url: "https://client.blazingcdn.com/",
    keywords: ["panel", "dashboard", "console", "settings", "enable", "toggle", "switch", "locations", "manually"],
    summary:
      "Where users change any setting themselves: Anycast CDN → resource → tabs overview, statistics, domains, " +
      "preferences, access_protection, manage_cache, locations, raw_logs " +
      "(direct link: https://client.blazingcdn.com/anycast_cdn/<resource_id>/<tab>).",
  },
  {
    title: "Image Processing Presets",
    url: "https://blazingcdn-kb.atlassian.net/wiki/spaces/BCDN/pages/148602882/Image+Processing+Presets",
    keywords: [
      "image", "images", "processing", "resize", "crop", "thumbnail", "preset", "imgproxy", "width", "height", "gravity", "photo",
    ],
    summary:
      "Enable: resource → Locations tab → Image processing (API: update_cdn_resource with image_processing_enabled=true " +
      "+ image_processing_extensions). Request: https://<cdn domain>/<image path>?preset=<name>&<params>. Presets: " +
      "resizefill — exact width×height, scales then crops to fill; resizefit — fits inside width×height without " +
      "cropping (one side may come out smaller); resize — type=fit|fill plus width, height; crop — width, height, " +
      "gravity: ce center (default), no top, so bottom, ea right, we left, noea/nowe/soea/sowe corners. For resize " +
      "presets width or height may be omitted — the other side follows the aspect ratio. " +
      "Example: ?preset=resizefill&width=200&height=200.",
  },
  {
    title: "Image processing",
    url: "https://blazingcdn.com/image-processing/",
    keywords: ["image", "images", "processing", "resize", "crop", "thumbnail", "preset", "optimization"],
    summary: "Product page: on-the-fly image resizing and cropping at the edge, cached after the first request.",
  },
  {
    title: "Support tickets",
    url: "https://client.blazingcdn.com/help_desk",
    keywords: ["support", "ticket", "contact", "issue", "problem", "outage"],
    summary:
      "Open a ticket for account, billing or platform problems. Settings the user can change themselves " +
      "(turning features on or off) are done in the customer panel, not through support.",
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
