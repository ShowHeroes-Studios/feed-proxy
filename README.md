# feed-proxy

A lightweight Netlify serverless proxy for fetching feeds from `showheroes.com` endpoints, with built-in response caching via Netlify Blobs. Supports any response format (JSON, XML, etc.).

## Usage

```
GET /api/proxy?url=<target>&[ttl=<seconds>]&[...params]
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `url` | Yes | Full URL to proxy. Must be on `showheroes.com` or a subdomain. |
| `ttl` | No | Cache duration in seconds. Defaults to `120` (2 minutes). |
| `...` | No | Any additional query parameters are forwarded to the target URL. |

### Example

```
/api/proxy?url=https://csc-cdn01.showheroes.com/feed/items&lang=en&ttl=60
```

This fetches `https://csc-cdn01.showheroes.com/feed/items?lang=en`, caches the response for 60 seconds, and returns it with CORS headers.

## Caching

Responses are cached in [Netlify Blobs](https://docs.netlify.com/blobs/overview/) under the `proxy-cache` store. The cache key is the full constructed upstream URL (including forwarded query params). Cached responses are served until the TTL expires, after which a fresh upstream request is made.

## Security

Only requests originating from `showheroes.com` or its subdomains are allowed. The `Origin` header is checked first, falling back to `Referer`. Requests from any other domain return `403 Forbidden`.

## Deployment

1. Push the repo to GitHub, GitLab, or Bitbucket.
2. In Netlify, create a new site and import the repo.
3. No build command is needed — Netlify auto-detects the function from `netlify.toml`.
4. Netlify Blobs is available automatically on any Netlify site.
