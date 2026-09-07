import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { registerSearchPlacesTool } from "./tools/search-places";
import { registerGetPlaceTool } from "./tools/get-place";
import { registerListCoverageTool } from "./tools/list-coverage";

function createPureTableMcpServer() {
  const server = new McpServer(
    { name: "pure-table-finder", title: "Pure Table Finder", version: "0.1.0" },
    {
      instructions:
        "Public tools for Pure Table, a gluten-free directory for Saudi Arabia. Use `search_gluten_free_places` to find restaurants, cafes, bakeries, desserts, supermarkets and home businesses by city, region, category or keyword; `get_gluten_free_place` for full details and ordering links of one listing; `list_coverage` to see which cities and categories are covered. All data is public directory content.",
    },
  );
  registerSearchPlacesTool(server);
  registerGetPlaceTool(server);
  registerListCoverageTool(server);
  return server;
}

export const pureTableMcpHandler = createMcpHandler(createPureTableMcpServer, {
  legacy: "stateless",
  responseMode: "json",
  onerror: (error) => console.error("[MCP]", error),
});
