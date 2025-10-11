#!/usr/bin/env node

/**
 * Simple CORS proxy for local testing
 * Allows browser to access Floatplane API without CORS errors
 *
 * Usage: node cors-proxy.js
 * Then update CONFIG.api.baseUrl to http://localhost:3001/api
 */

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const TARGET_HOST = process.env.FLOATPLANE_HOST || 'www.floatplane.com';
const TRUSTED_UA = process.env.FLOATPLANE_UA || 'Hydravion 1.0 (AndroidTV), CFNetwork';

const server = http.createServer((req, res) => {
  // Set CORS headers
  const requestOrigin = req.headers.origin || req.headers.referer || '*';
  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, Cookie, X-CSRF-Token');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse URL and forward to Floatplane
  const parsedUrl = url.parse(req.url);

  // Copy headers, excluding browser-specific ones
  const forwardHeaders = { ...req.headers };
  delete forwardHeaders['host'];
  delete forwardHeaders['origin'];
  delete forwardHeaders['referer'];
  delete forwardHeaders['connection'];

  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: parsedUrl.path,
    method: req.method,
    headers: {
      ...forwardHeaders,
      'Host': TARGET_HOST,
      'User-Agent': TRUSTED_UA
    }
  };

  console.log(`[${new Date().toISOString()}] ${req.method} ${parsedUrl.path}`);
  console.log('Request headers:', JSON.stringify(options.headers, null, 2));

  // Collect request body for logging
  let requestBody = '';
  req.on('data', chunk => {
    requestBody += chunk.toString();
  });

  req.on('end', () => {
    // Now send the request with collected body
    const proxyReq = https.request(options, (proxyRes) => {
    console.log(`Response status: ${proxyRes.statusCode}`);
    console.log('Response headers:', JSON.stringify(proxyRes.headers, null, 2));

    // Collect response body for logging
    let responseBody = '';
    proxyRes.on('data', chunk => {
      responseBody += chunk.toString();
    });

    proxyRes.on('end', () => {
      // Log full details for ALL login requests (success and error)
      if (parsedUrl.path.includes('/auth/login')) {
        const isSuccess = proxyRes.statusCode >= 200 && proxyRes.statusCode < 300;
        console.log('\n========== ' + (isSuccess ? 'SUCCESS' : 'ERROR') + ' LOGIN RESPONSE ==========');
        console.log(`Status: ${proxyRes.statusCode}`);
        console.log('Request body:', requestBody);
        console.log('Response body:', responseBody);
        console.log('==============================================\n');
      } else if (proxyRes.statusCode >= 400) {
        // Log other errors
        console.log('\n========== ERROR RESPONSE ==========');
        console.log(`Status: ${proxyRes.statusCode}`);
        console.log('Request body:', requestBody);
        console.log('Response body:', responseBody);
        console.log('====================================\n');
      }

      // Forward status and body to client
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      res.end(responseBody);
    });
  });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(500);
      res.end('Proxy error: ' + err.message);
    });

    // Send the collected request body
    if (requestBody) {
      proxyReq.write(requestBody);
    }
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log('===========================================');
  console.log('CORS Proxy Server for Floatplane API');
  console.log('===========================================');
  console.log(`Listening on: http://localhost:${PORT}`);
  console.log(`Proxying to: https://${TARGET_HOST}`);
  console.log('');
  console.log('Update your app config:');
  console.log(`  CONFIG.api.baseUrl = 'http://localhost:${PORT}/api'`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('===========================================');
});
