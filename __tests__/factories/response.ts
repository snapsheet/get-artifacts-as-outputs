import { faker } from "@faker-js/faker";

export class ResponseFactory {
  static generate(mocks?: {
    status?: number;
    url?: string;
    headers?: unknown;
    data?: unknown;
  }) {
    return {
      status: mocks?.status || 200,
      url:
        mocks?.url ||
        `https://api.github.com/repos/${faker.word
          .noun()
          .toLowerCase()}/${faker.word
          .noun()
          .toLowerCase()}/contents/.github%2Fworkflows%2Fcdktf_command.yml?ref=refs%2Fheads%2Fmain`,
      headers: new Headers({
        ...(mocks?.headers || {}),
        "access-control-allow-origin": "*",
        "access-control-expose-headers":
          "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset, X-OAuth-Scopes, X-Accepted-OAuth-Scopes, X-Poll-Interval, X-GitHub-Media-Type, X-GitHub-SSO, X-GitHub-Request-Id, Deprecation, Sunset",
        "cache-control": "private, max-age=60, s-maxage=60",
        "content-encoding": "gzip",
        "content-security-policy": "default-src 'none'",
        "content-type": "application/json; charset=utf-8",
        date: "Fri, 10 May 2024 19:28:56 GMT",
        etag: "W/\"f372cc1fa2fe5ae5a668d1a510e74fc80f5b9daa\"",
        "last-modified": "Thu, 09 May 2024 19:55:12 GMT",
        "referrer-policy":
          "origin-when-cross-origin, strict-origin-when-cross-origin",
        server: "GitHub.com",
        "strict-transport-security":
          "max-age=31536000; includeSubdomains; preload",
        "transfer-encoding": "chunked",
        vary: "Accept, Authorization, Cookie, X-GitHub-OTP, Accept-Encoding, Accept, X-Requested-With",
        "x-accepted-github-permissions": "contents=read",
        "x-content-type-options": "nosniff",
        "x-frame-options": "deny",
        "x-github-api-version-selected": "2022-11-28",
        "x-github-media-type": "github.v3; format=json",
        "x-github-request-id": "9441:2B17AC:A420FB:10F85C7:663E7578",
        "x-ratelimit-limit": "15000",
        "x-ratelimit-remaining": "14914",
        "x-ratelimit-reset": "1715371899",
        "x-ratelimit-resource": "core",
        "x-ratelimit-used": "86",
        "x-xss-protection": "0"
      }),
      data: mocks?.data || {},
      json: async (): Promise<unknown> => {
        return mocks?.data || {};
      }
    };
  }
}
