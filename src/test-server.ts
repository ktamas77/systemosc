/**
 * Simple test server to receive CPU statistics
 * Run this on the target machine to test the SystemOSC client
 *
 * Usage: tsx src/test-server.ts [port]
 * Example: tsx src/test-server.ts 3000
 */

import http, { IncomingMessage, ServerResponse } from 'http';

// Type definitions matching the client's data structure
interface CPUInfo {
  model: string;
  cores: number;
  speed: number;
}

interface CPUUsage {
  total: number;
  user: number;
  system: number;
  idle: number;
}

interface CoreStats {
  core: number;
  load: number;
  loadUser: number;
  loadSystem: number;
  loadIdle: number;
}

interface CPUStats {
  timestamp: string;
  hostname: string;
  cpu: CPUInfo;
  usage: CPUUsage;
  perCore: CoreStats[];
}

const PORT = parseInt(process.argv[2] || '3000', 10);

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'POST' && req.url === '/cpu-stats') {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data: CPUStats = JSON.parse(body);

        console.log('\n' + '='.repeat(60));
        console.log(`[${new Date().toLocaleTimeString()}] Received CPU Stats`);
        console.log('='.repeat(60));
        console.log(`Hostname: ${data.hostname}`);
        console.log(`CPU Model: ${data.cpu.model} (${data.cpu.cores} cores @ ${data.cpu.speed} GHz)`);
        console.log(`\nUsage:`);
        console.log(`  Total:  ${data.usage.total}%`);
        console.log(`  User:   ${data.usage.user}%`);
        console.log(`  System: ${data.usage.system}%`);
        console.log(`  Idle:   ${data.usage.idle}%`);

        if (data.perCore && data.perCore.length > 0) {
          console.log(`\nPer-Core Load:`);
          data.perCore.forEach((core: CoreStats) => {
            console.log(`  Core ${core.core}: ${core.load}%`);
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', received: true }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error parsing JSON:', errorMessage);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Test server listening on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/cpu-stats`);
  console.log(`\nWaiting for CPU statistics...\n`);
});
