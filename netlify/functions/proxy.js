const https = require("https");
const { getStore } = require("@netlify/blobs");

const DEFAULT_TTL_MS = 2 * 60 * 1000;

const noopCache = {
  get: async () => null,
  setJSON: async () => null,
};

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  const queryParams = { ...(event.queryStringParameters || {}) };
  const targetUrl = queryParams.url;
  const ttlMs = queryParams.ttl ? Number(queryParams.ttl) * 1000 : DEFAULT_TTL_MS;
  delete queryParams.url;
  delete queryParams.ttl;

  if (!targetUrl) {
    return { statusCode: 400, body: "Missing required parameter: url" };
  }

  const parsedUrl = new URL(targetUrl);
  const params = new URLSearchParams(queryParams);
  const url = `${parsedUrl.origin}${parsedUrl.pathname}?${params.toString()}`;

  let cache;
  try {
    cache = getStore("proxy-cache");
  } catch {
    cache = noopCache;
  }
  const cached = await cache.get(url, { type: "json" }).catch(() => null);
  if (cached && Date.now() - cached.cachedAt < ttlMs) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: cached.body,
    };
  }

  let body;
  try {
    body = await new Promise((resolve, reject) => {
      const req = https.get(url, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          return reject(new Error(`Upstream returned ${res.statusCode}`));
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      });
      req.on("error", reject);
      req.setTimeout(10000, () => {
        req.destroy(new Error("Upstream request timed out"));
      });
    });
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders,
      body: `Upstream fetch failed: ${err.message}`,
    };
  }

  await cache.setJSON(url, { body, cachedAt: Date.now() }).catch(() => null);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
    body,
  };
};
