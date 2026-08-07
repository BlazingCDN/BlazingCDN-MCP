import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textResult } from "./util.js";

// Public Flex plan tiers as of August 2026 — keep in sync with README.md and https://blazingcdn.com/pricing/
const TIERS = [
  { label: "First 5 TB", upTo: 5, ratePerTb: 5.0 },
  { label: "5-25 TB", upTo: 25, ratePerTb: 4.5 },
  { label: "25-100 TB", upTo: 100, ratePerTb: 4.0 },
  { label: "100-500 TB", upTo: 500, ratePerTb: 3.5 },
  { label: "500-1000 TB", upTo: 1000, ratePerTb: 3.0 },
  { label: "1000-1500 TB", upTo: 1500, ratePerTb: 2.5 },
];
const MONTHLY_MINIMUM_USD = 25;
const CUSTOM_PRICING_FROM_TB = 100;
const MAX_PUBLIC_TB = 1500;
const CONTACT_URL = "https://blazingcdn.com/sign-up-contact-form/";

export function registerPricingTools(server: McpServer): void {
  server.registerTool(
    "estimate_traffic_cost",
    {
      title: "Estimate traffic cost",
      description:
        "Estimate the monthly cost of CDN traffic on the pay-as-you-go Flex plan (progressive tiers from " +
        "$5.00/TB down to $2.50/TB, $25/month minimum covering the first 5 TB). Runs locally without network " +
        "access. Public pricing as of August 2026 — for current rates see https://blazingcdn.com/pricing/. " +
        `Volumes over ${CUSTOM_PRICING_FROM_TB} TB/month qualify for custom pricing: ${CONTACT_URL}`,
      inputSchema: {
        tb_per_month: z.number().positive().describe("Expected monthly traffic in TB, e.g. 190"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => {
      const tb = args.tb_per_month;
      const breakdown: Array<{ tier: string; tb: number; rate_per_tb_usd: number; cost_usd: number }> = [];
      let prev = 0;
      let total = 0;
      for (const tier of TIERS) {
        if (tb <= prev) break;
        const inTier = Math.min(tb, tier.upTo) - prev;
        const cost = inTier * tier.ratePerTb;
        breakdown.push({
          tier: tier.label,
          tb: Number(inTier.toFixed(3)),
          rate_per_tb_usd: tier.ratePerTb,
          cost_usd: Number(cost.toFixed(2)),
        });
        total += cost;
        prev = tier.upTo;
      }

      const billed = Math.max(total, MONTHLY_MINIMUM_USD);
      const notes: string[] = [];
      if (total < MONTHLY_MINIMUM_USD) {
        notes.push(`The $${MONTHLY_MINIMUM_USD}/month minimum applies — it covers the first 5 TB.`);
      }
      if (tb > MAX_PUBLIC_TB) {
        notes.push(
          `Public tiers cover only the first ${MAX_PUBLIC_TB} TB — the estimate excludes the remaining ` +
            `${Number((tb - MAX_PUBLIC_TB).toFixed(3))} TB. Contact BlazingCDN for a quote: ${CONTACT_URL}`,
        );
      } else if (tb > CUSTOM_PRICING_FROM_TB) {
        notes.push(
          `At ${CUSTOM_PRICING_FROM_TB}+ TB/month you can request custom volume pricing, ` +
            `usually below the public tiers: ${CONTACT_URL}`,
        );
      }
      notes.push("Pricing as of August 2026; verify current rates at https://blazingcdn.com/pricing/.");

      return textResult({
        tb_per_month: tb,
        currency: "USD",
        breakdown,
        total_usd: Number(billed.toFixed(2)),
        effective_rate_per_tb_usd: Number((billed / Math.min(tb, MAX_PUBLIC_TB)).toFixed(2)),
        monthly_minimum_usd: MONTHLY_MINIMUM_USD,
        includes: "custom domains, unlimited requests, origin shield, URL signatures, free SSL, geo allow/block lists",
        notes,
      });
    },
  );
}
