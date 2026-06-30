import http from "node:http";

const listenHost = process.env.FLOUNDER_LAN_PROXY_HOST ?? "0.0.0.0";
const listenPort = Number(process.env.FLOUNDER_LAN_PROXY_PORT ?? "4501");
const targetHost = process.env.FLOUNDER_TARGET_HOST ?? "127.0.0.1";
const targetPort = Number(process.env.FLOUNDER_TARGET_PORT ?? "4500");
const token = process.env.FLOUNDER_UI_TOKEN;
const proxyUser = process.env.FLOUNDER_PROXY_USER ?? "flounder";
const proxyPass = process.env.FLOUNDER_PROXY_PASS;

if (!token) {
  console.error("FLOUNDER_UI_TOKEN is required");
  process.exit(1);
}

if (!proxyPass) {
  console.error("FLOUNDER_PROXY_PASS is required");
  process.exit(1);
}

function isAuthorized(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) return false;
  const value = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  return value === `${proxyUser}:${proxyPass}`;
}

const server = http.createServer((req, res) => {
  if (!isAuthorized(req)) {
    res.writeHead(401, { "www-authenticate": 'Basic realm="Flounder LAN"', "content-type": "text/plain; charset=utf-8" });
    res.end("Authentication required\n");
    return;
  }

  const headers = { ...req.headers, authorization: `Bearer ${token}`, host: `${targetHost}:${targetPort}` };
  const upstream = http.request(
    {
      host: targetHost,
      port: targetPort,
      method: req.method,
      path: req.url,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Flounder proxy error: ${error.message}\n`);
  });

  req.pipe(upstream);
});

server.listen(listenPort, listenHost, () => {
  console.log(`[flounder lan proxy] http://${listenHost}:${listenPort} -> http://${targetHost}:${targetPort}`);
});
