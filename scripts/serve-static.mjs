#!/usr/bin/env bun
import { stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const [rootArg = "_site", hostArg = "127.0.0.1", portArg = "3015"] = process.argv.slice(2);
const root = resolve(rootArg);
const host = hostArg;
const port = Number(portArg);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`Invalid port: ${portArg}`);
}

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const response = await fileResponse(url.pathname);
    return response ?? new Response("Not found\n", { status: 404 });
  },
});

console.log(`Serving ${root}`);
console.log(`Listening on http://${server.hostname}:${server.port}/`);

async function fileResponse(pathname) {
  let rel;
  try {
    rel = decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return new Response("Bad request\n", { status: 400 });
  }
  if (rel === "") rel = "index.html";

  const candidates = rel.endsWith("/")
    ? [resolveInsideRoot(`${rel}index.html`)]
    : [
        resolveInsideRoot(rel),
        extname(rel) ? undefined : resolveInsideRoot(`${rel}/index.html`),
      ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!isInsideRoot(candidate)) return new Response("Forbidden\n", { status: 403 });
    const found = await readableFile(candidate);
    if (found) return new Response(Bun.file(found));
  }
  return undefined;
}

function resolveInsideRoot(rel) {
  return resolve(root, rel);
}

function isInsideRoot(path) {
  return path === root || path.startsWith(`${root}${sep}`);
}

async function readableFile(path) {
  try {
    const info = await stat(path);
    if (info.isFile()) return path;
    if (!info.isDirectory()) return undefined;
    return readableFile(resolve(path, "index.html"));
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") return undefined;
    throw e;
  }
}
