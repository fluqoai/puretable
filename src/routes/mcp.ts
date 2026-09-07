import { createFileRoute } from "@tanstack/react-router";
import {
  hostHeaderValidationResponse,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { pureTableMcpHandler } from "../lib/mcp/index";

function allowedHosts() {
  const configured = process.env.APP_URL ? new URL(process.env.APP_URL).hostname : null;
  return [configured, "puretable.co", "www.puretable.co", "localhost", "127.0.0.1"].filter(
    (host): host is string => Boolean(host),
  );
}

async function handleMcp({ request }: { request: Request }) {
  const hosts = allowedHosts();
  const rejected =
    hostHeaderValidationResponse(request, hosts) ?? originValidationResponse(request, hosts);
  return rejected ?? pureTableMcpHandler.fetch(request);
}

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      GET: handleMcp,
      POST: handleMcp,
      DELETE: handleMcp,
    },
  },
});
