# SystemOSC

A real-time CPU monitoring utility designed for **Ableton Live** and music production workflows. Monitor your system's CPU usage to identify performance bottlenecks before they cause audio dropouts or crashes during live performances and studio sessions.

Built with TypeScript, featuring a beautiful terminal UI powered by Ink, and sends statistics via HTTP REST API to external monitoring systems.

## Why SystemOSC?

When running Ableton Live with multiple tracks, plugins, and effects, CPU usage can spike unpredictably. SystemOSC helps you:

- 🎛️ **Monitor CPU load in real-time** during live performances
- 🚨 **Get early warnings** before hitting CPU limits that cause audio dropouts
- 📊 **Track per-core utilization** to identify processing bottlenecks
- 🔗 **Send data to external displays** (tablets, secondary computers, TouchOSC, etc.)
- 📈 **Log performance metrics** for analyzing session demands

Perfect for live performers, studio producers, and anyone pushing their Mac's CPU limits with complex Ableton sessions.

## Features

- **Real-time CPU monitoring** - Continuously updating System, User, and Idle CPU percentages
- **Per-core statistics** - Detailed load information for each CPU core (essential for identifying single-threaded bottlenecks)
- **Live terminal UI** - Beautiful, color-coded interface with status indicators
  - 🟢 Green: < 50% (safe zone)
  - 🟡 Yellow: 50-80% (caution - monitor closely)
  - 🔴 Red: > 80% (danger zone - reduce load)
- **Configurable interval** - Default 10 seconds, adjustable for your needs
- **HTTP POST with JSON** - Send data to any HTTP endpoint
- **TypeScript** - Fully typed codebase for reliability
- **Error handling** - Comprehensive error reporting with visual feedback
- **Connection status** - Real-time display of transmission status
- **Graceful shutdown** - Clean exit with Ctrl+C

## How It Works

SystemOSC runs continuously and performs this cycle:

1. **Collect CPU metrics** - Uses the `systeminformation` library to gather:
   - Overall CPU load (total, user, system, idle percentages)
   - CPU hardware information (model, core count, speed)
   - Per-core load statistics
   - System hostname and timestamp

2. **Display locally** - Updates the terminal UI with color-coded indicators showing current load levels

3. **Send to target** - POSTs the data as JSON to your configured HTTP endpoint

4. **Show status** - Displays transmission result:
   - ✅ OK (HTTP 200) - Successful transmission
   - ❌ ERROR - Network or HTTP error with details

5. **Wait and repeat** - Waits for the configured interval before next check

## Requirements

- **Node.js** v18 or higher
- **macOS** (Apple Silicon or Intel)
- **TypeScript** (installed automatically as dev dependency)

## Installation

1. Clone this repository:

```bash
git clone https://github.com/yourusername/systemosc.git
cd systemosc
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the template:

```bash
cp .env.example .env
```

4. Edit `.env` and configure your target URL:

```env
TARGET_URL=http://192.168.1.100:3000/cpu-stats
INTERVAL_MS=10000
```

## Usage

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

Or directly:

```bash
npx tsx src/index.ts
```

### Build TypeScript

```bash
npm run build
```

This creates compiled JavaScript in the `dist/` directory.

### Run Test Server

To test locally, run the included test server:

```bash
npm run test-server 3000
```

Then in another terminal:

```bash
npm start
```

## Configuration

Edit the `.env` file:

- **`TARGET_URL`** (required): HTTP endpoint where CPU stats will be sent via POST
- **`INTERVAL_MS`** (optional): Interval in milliseconds (default: 10000 = 10 seconds)

### Example Configurations

**Local testing:**
```env
TARGET_URL=http://localhost:3000/cpu-stats
INTERVAL_MS=10000
```

**Send to iPad running TouchOSC:**
```env
TARGET_URL=http://192.168.1.50:8080/cpu-stats
INTERVAL_MS=5000
```

**Send to cloud monitoring:**
```env
TARGET_URL=https://monitoring.example.com/api/cpu-stats
INTERVAL_MS=30000
```

## JSON Data Format

The application sends POST requests with `Content-Type: application/json`.

### Complete JSON Structure

```json
{
  "timestamp": "2025-11-12T01:23:45.789Z",
  "hostname": "MacBook-Pro.local",
  "cpu": {
    "model": "Apple M1 Max",
    "cores": 10,
    "speed": 2.4
  },
  "usage": {
    "total": 46.45,
    "user": 28.44,
    "system": 18.01,
    "idle": 53.55
  },
  "perCore": [
    {
      "core": 0,
      "load": 97.09,
      "loadUser": 65.12,
      "loadSystem": 31.97,
      "loadIdle": 2.91
    },
    {
      "core": 1,
      "load": 97.09,
      "loadUser": 68.45,
      "loadSystem": 28.64,
      "loadIdle": 2.91
    }
    // ... one object per CPU core
  ]
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string (ISO 8601) | UTC timestamp when data was collected |
| `hostname` | string | System hostname |
| `cpu.model` | string | CPU model name (e.g., "Apple M1 Max") |
| `cpu.cores` | number | Total number of CPU cores |
| `cpu.speed` | number | CPU clock speed in GHz |
| `usage.total` | number | Total CPU usage percentage (0-100) |
| `usage.user` | number | User process CPU usage (0-100) |
| `usage.system` | number | System/kernel CPU usage (0-100) |
| `usage.idle` | number | Idle CPU percentage (0-100) |
| `perCore[]` | array | Per-core statistics (one per core) |
| `perCore[].core` | number | Core index (0-based) |
| `perCore[].load` | number | Total load on this core (0-100) |
| `perCore[].loadUser` | number | User process load on this core (0-100) |
| `perCore[].loadSystem` | number | System load on this core (0-100) |
| `perCore[].loadIdle` | number | Idle percentage for this core (0-100) |

**Notes:**
- All percentage values are rounded to 2 decimal places
- `usage.total` ≈ `usage.user` + `usage.system`
- `usage.total` + `usage.idle` ≈ 100 (slight variance due to rounding)
- The `perCore` array length equals `cpu.cores`

## Use Case: Monitoring Ableton Live

### Scenario 1: Live Performance

Run SystemOSC on your performance laptop and send data to an iPad via HTTP. Display the CPU metrics using a simple web interface or TouchOSC, giving you a visual warning system before audio dropouts occur.

```env
TARGET_URL=http://192.168.1.50:8080/cpu-stats
INTERVAL_MS=5000  # Check every 5 seconds during live performance
```

### Scenario 2: Studio Session Analysis

Log CPU usage throughout a recording session to identify which tracks or plugins are CPU-heavy. Send data to a logging server that records performance over time.

```env
TARGET_URL=http://studio-server.local:3000/log-cpu
INTERVAL_MS=10000
```

### Scenario 3: Real-time Visual Display

Connect SystemOSC to a visualizer running on a secondary monitor, showing real-time CPU graphs as you build your Ableton session. Helps you make informed decisions about when to freeze tracks or simplify effects chains.

## Example: Custom Receiving Server

Here's a minimal Express.js server to receive and process the data:

```typescript
import express from 'express';

const app = express();
app.use(express.json());

app.post('/cpu-stats', (req, res) => {
  const { timestamp, hostname, cpu, usage } = req.body;

  // Check if CPU is getting dangerously high
  if (usage.total > 80) {
    console.warn(`⚠️  HIGH CPU: ${usage.total}% on ${hostname}`);
    // Trigger alert, send notification, etc.
  }

  console.log(`[${new Date(timestamp).toLocaleTimeString()}] ${hostname}`);
  console.log(`CPU: ${usage.total}% (${cpu.model})`);

  // Store in database, forward to monitoring system, etc.

  res.status(200).json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('CPU stats receiver listening on port 3000');
});
```

## Development

### Project Structure

```
systemosc/
├── src/
│   ├── index.ts          # Main application
│   └── test-server.ts    # Test HTTP server
├── dist/                 # Compiled TypeScript output
├── .env                  # Your configuration (not in git)
├── .env.example          # Configuration template
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

### Available Scripts

- `npm start` - Run the app with tsx (development)
- `npm run dev` - Run with auto-reload on file changes
- `npm run build` - Compile TypeScript to JavaScript
- `npm run test-server` - Run the test HTTP server
- `npm run typecheck` - Check types without building

### TypeScript

This project is fully typed with TypeScript for better reliability and developer experience. All CPU statistics and HTTP communication have proper type definitions.

## Troubleshooting

**"TARGET_URL not set in .env file"**
- Create a `.env` file in the project root
- Copy from `.env.example` and add your target URL

**"Network error - Unable to reach target"**
- Verify the target URL is correct and accessible
- Check that the target server is running
- Ensure firewall settings allow the connection
- Test with `curl -X POST http://your-target/cpu-stats -H "Content-Type: application/json" -d "{}"`

**"HTTP Error 404" or other HTTP errors**
- Verify the endpoint path is correct
- Check that the target server has the correct route configured
- Ensure the server accepts POST requests with JSON

**High CPU usage from SystemOSC itself**
- Increase `INTERVAL_MS` to reduce monitoring frequency
- The monitoring overhead is typically < 1% CPU

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

ISC

## Acknowledgments

Built for the Ableton Live community and music producers everywhere who need reliable performance monitoring.
