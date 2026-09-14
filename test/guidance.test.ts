import { describe, expect, it } from "vitest";
import { INSTRUCTIONS_LIMIT } from "../src/server.js";
import { connectClient, mockFetch } from "./helpers.js";

const RID = "65202fd5-55e8-47ac-a952-162c7a102a04";
const textOf = (result: { content: unknown }) => (result.content as Array<{ text: string }>)[0].text;

describe("guidance for features that are switched off", () => {
  it("instructions fit under Claude Code's 2048-character cap in every mode", async () => {
    for (const allowWrite of [false, true]) {
      for (const allowDelete of [false, true]) {
        const instructions = (await connectClient({ allowWrite, allowDelete })).getInstructions() ?? "";
        expect(instructions.length).toBeLessThanOrEqual(INSTRUCTIONS_LIMIT);
      }
    }
  });

  it("read-only instructions point to the panel switch, not to support", async () => {
    const instructions = (await connectClient()).getInstructions() ?? "";
    expect(instructions).toContain("https://client.blazingcdn.com/anycast_cdn/<resource_id>/<tab>");
    expect(instructions).toContain("never send them to support");
    expect(instructions).toContain("BLAZINGCDN_ALLOW_WRITE=1 would let you do it");
    expect(instructions).not.toContain("Offer to turn it on yourself");
  });

  it("write-mode instructions offer to turn the feature on after the user agrees", async () => {
    const instructions = (await connectClient({ allowWrite: true })).getInstructions() ?? "";
    expect(instructions).toContain("Offer to turn it on yourself");
    expect(instructions).toContain("wait for a yes");
  });

  it("instructions say how to enable image processing and where the presets are", async () => {
    const instructions = (await connectClient()).getInstructions() ?? "";
    expect(instructions).toContain("image_processing_enabled=true");
    expect(instructions).toContain("?preset=resizefill&width=200&height=200");
    expect(instructions).toContain("search_docs('image processing')");
  });

  it("update_cdn_resource advertises image processing and location_mode", async () => {
    const { tools } = await (await connectClient({ allowWrite: true })).listTools();
    const tool = tools.find((t) => t.name === "update_cdn_resource")!;
    expect(tool.description).toContain("image processing");
    expect(JSON.stringify(tool.inputSchema)).toContain("location_mode");
  });

  it("location_mode passes through update_cdn_resource unchanged", async () => {
    const requests = mockFetch();
    const client = await connectClient({ allowWrite: true });
    await client.callTool({
      name: "update_cdn_resource",
      arguments: { resource_id: RID, settings: { location_mode: "extended" } },
    });
    expect(requests[0].body).toEqual({ pull_zone: { location_mode: "extended" } });
  });

  it("a 409 basic-mode error comes back with the zone-level alternative and a direct panel link", async () => {
    mockFetch({ error: "impossible to manage locations in basic mode" }, 409);
    const client = await connectClient({ allowWrite: true });
    const result = await client.callTool({
      name: "update_cdn_locations",
      arguments: { resource_id: RID, locations: [{ url: "/", image_processing_enabled: true }] },
    });
    expect(result.isError).toBe(true);
    const text = textOf(result);
    expect(text).toContain("409");
    expect(text).toContain("image_processing_enabled=true");
    expect(text).toContain(`https://client.blazingcdn.com/anycast_cdn/${RID}/locations`);
    expect(text).not.toMatch(/contact support/i);
  });

  it("a 401 error says where to create a new token without leaking the current one", async () => {
    mockFetch({ error: "unauthorized" }, 401);
    const text = textOf(await (await connectClient()).callTool({ name: "list_cdn_resources", arguments: {} }));
    expect(text).toContain("https://client.blazingcdn.com/api");
    expect(text).not.toContain("test-token");
  });

  it("search_docs returns the full image processing preset guide first", async () => {
    const client = await connectClient();
    const search = async (query: string) => textOf(await client.callTool({ name: "search_docs", arguments: { query } }));
    const [guide] = JSON.parse(await search("image processing"));
    expect(guide.url).toContain("Image+Processing+Presets");
    for (const part of ["resizefill", "resizefit", "type=fit|fill", "ce center (default)", "noea/nowe/soea/sowe"]) {
      expect(guide.summary).toContain(part);
    }
    expect(JSON.parse(await search("image processing resize"))[0].url).toContain("Image+Processing+Presets");
  });

  it("search_docs finds the customer panel, not the retired KB domain", async () => {
    const client = await connectClient();
    const search = async (query: string) => textOf(await client.callTool({ name: "search_docs", arguments: { query } }));
    expect(await search("enable in panel")).toContain("client.blazingcdn.com");
    expect(await search("knowledge base")).not.toContain("knowledgebase.blazingcdn.com");
  });
});
