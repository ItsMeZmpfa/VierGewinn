const esbuild = require('esbuild');
const http = require('http');

function tranformPath(path) {
  const isNotHTML = ['.css', '.js', '.mjs'].some((extension) => path.endsWith(extension));
  const isTemplate = path.startsWith("/templates")
  if(isNotHTML || isTemplate) return path;
  return "/"
}

// Start esbuild's server on a random local port
esbuild.serve({
  servedir: "public",
}, {
  entryPoints: ['src/app.js'],
  outfile: 'public/app.js',
  bundle: true,
  target: ["es6"],
  minify: true
}).then(result => {
  // The result tells us where esbuild's local server is
  const {host, port} = result

  // Then start a proxy server on port 3000
  http.createServer((req, res) => {
    const options = {
      hostname: host,
      port: port,
      path: tranformPath(req.url),
      method: req.method,
      headers: req.headers,
    }
    const reqString = `${req.method} ${req.url}`

    // Forward each incoming request to esbuild
    const proxyReq = http.request(options, proxyRes => {
      console.log(reqString, proxyRes.statusCode)

      // Otherwise, forward the response from esbuild to the client
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    // Forward the body of the request to esbuild
    req.pipe(proxyReq, { end: true });
  }).listen(3000);
  console.log(`Listening on "http://127.0.0.1:3000"`)
});
