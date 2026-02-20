# SystemOSC

A real-time CPU monitoring utility designed for **Ableton Live** and music production workflows. Monitor your system's CPU usage to identify performance bottlenecks before they cause audio dropouts or crashes during live performances and studio sessions.

Built with TypeScript, featuring a beautiful terminal UI powered by Ink. Supports two output modes: **OSC (Open Sound Control) over UDP** and an **HTTP JSON server** — both independently configurable.

## Why SystemOSC?

When running Ableton Live with multiple tracks, plugins, and effects, CPU usage can spike unpredictably. SystemOSC helps you:

- 🎛️ **Monitor CPU load in real-time** during live performances
- 🚨 **Get early warnings** before hitting CPU limits that cause audio dropouts
- 📊 **Track per-core utilization** to identify processing bottlenecks
- 🔗 **Send data via OSC** to visual displays, sequencers, or monitoring systems
- 🌐 **HTTP JSON API** for easy integration with web dashboards and custom tools
- 📈 **Integrate with OSC-enabled software** like TouchOSC, Max/MSP, Pure Data, etc.

Perfect for live performers, studio producers, and anyone pushing their Mac's CPU limits with complex Ableton sessions.

## Features

- **Real-time CPU monitoring** - Continuously updating System, User, and Idle CPU percentages
- **Per-core statistics** - Detailed load information for each CPU core (essential for identifying single-threaded bottlenecks)
- **Live terminal UI** - Beautiful, color-coded interface with status indicators
  - 🟢 Green: < 50% (safe zone)
  - 🟡 Yellow: 50-80% (caution - monitor closely)
  - 🔴 Red: > 80% (danger zone - reduce load)
- **OSC over UDP** - Industry-standard protocol for real-time control and monitoring
- **HTTP JSON API** - Query CPU stats via HTTP; returns JSON array of name-value pairs
- **Flexible output modes** - Enable OSC, HTTP, or both independently
- **TypeScript** - Fully typed codebase for reliability
- **Configurable interval** - Default 10 seconds, adjustable for your needs
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

3. **Send via OSC and/or serve via HTTP** - Transmits data as OSC messages over UDP and/or serves it as JSON over HTTP (depending on configuration)

4. **Show status** - Displays transmission result with timestamp

5. **Wait and repeat** - Waits for the configured interval before next check

## Requirements

- **Node.js** v18 or higher
- **macOS** (Apple Silicon or Intel)
- **TypeScript** (installed automatically as dev dependency)

## Installation

1. Clone this repository:

```bash
git clone https://github.com/ktamas77/systemosc.git
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

4. Edit `.env` and configure your output mode(s):

```env
# Enable OSC output (default: true)
OSC_ENABLED=true
OSC_HOST=localhost
OSC_PORT=9877

# Enable HTTP JSON server (default: false)
HTTP_ENABLED=true
HTTP_PORT=3000

# Monitoring interval in milliseconds (default: 10000 = 10 seconds)
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

## Configuration

Edit the `.env` file:

### Output Modes

- **`OSC_ENABLED`** (optional): Enable OSC UDP output (default: `true`)
- **`HTTP_ENABLED`** (optional): Enable HTTP JSON server (default: `false`)

At least one output mode should be enabled.

### OSC Settings (when `OSC_ENABLED=true`)

- **`OSC_HOST`** (optional): Hostname or IP address of OSC receiver (default: `localhost`)
- **`OSC_PORT`** (optional): UDP port number for OSC messages (default: `9877`)

### HTTP Settings (when `HTTP_ENABLED=true`)

- **`HTTP_PORT`** (optional): Port for the HTTP server (default: `3000`)

### General

- **`INTERVAL_MS`** (optional): Monitoring interval in milliseconds (default: `10000` = 10 seconds)

### Example Configurations

**OSC only (default):**
```env
OSC_ENABLED=true
HTTP_ENABLED=false
OSC_HOST=localhost
OSC_PORT=9877
INTERVAL_MS=10000
```

**HTTP only:**
```env
OSC_ENABLED=false
HTTP_ENABLED=true
HTTP_PORT=3000
INTERVAL_MS=5000
```

**Both OSC and HTTP:**
```env
OSC_ENABLED=true
HTTP_ENABLED=true
OSC_HOST=192.168.1.50
OSC_PORT=9877
HTTP_PORT=8080
INTERVAL_MS=5000
```

**Send to iPad running TouchOSC:**
```env
OSC_ENABLED=true
OSC_HOST=192.168.1.100
OSC_PORT=8000
INTERVAL_MS=5000
```

## OSC Message Format

SystemOSC sends multiple OSC messages over UDP for each monitoring cycle. All numeric values are sent as floats (`f`) except where noted.

### Main CPU Usage Messages

| OSC Address | Type | Value Range | Description |
|-------------|------|-------------|-------------|
| `/cpu/usage/total` | float | 0.0-100.0 | **Primary metric** - Total CPU usage percentage |
| `/cpu/usage/user` | float | 0.0-100.0 | User process CPU usage |
| `/cpu/usage/system` | float | 0.0-100.0 | System/kernel CPU usage |
| `/cpu/usage/idle` | float | 0.0-100.0 | Idle CPU percentage |

### CPU Information Messages

| OSC Address | Type | Description |
|-------------|------|-------------|
| `/cpu/info/model` | string | CPU model name (e.g., "Apple M1 Max") |
| `/cpu/info/cores` | int | Total number of CPU cores |

### Per-Core Load Messages

| OSC Address | Type | Value Range | Description |
|-------------|------|-------------|-------------|
| `/cpu/core/0/load` | float | 0.0-100.0 | Core 0 total load |
| `/cpu/core/1/load` | float | 0.0-100.0 | Core 1 total load |
| `/cpu/core/N/load` | float | 0.0-100.0 | Core N total load |

*One message per CPU core, where N = 0 to (cores - 1)*

### Batch Marker

| OSC Address | Type | Description |
|-------------|------|-------------|
| `/cpu/timestamp` | string | ISO 8601 timestamp marking end of message batch |

### Example Message Sequence

For a 10-core CPU at 46.45% total usage:

```
/cpu/usage/total     46.45
/cpu/usage/user      28.44
/cpu/usage/system    18.01
/cpu/usage/idle      53.55
/cpu/info/model      "Apple M1 Max"
/cpu/info/cores      10
/cpu/core/0/load     97.09
/cpu/core/1/load     97.09
/cpu/core/2/load     70.36
/cpu/core/3/load     56.03
/cpu/core/4/load     41.09
/cpu/core/5/load     32.69
/cpu/core/6/load     35.28
/cpu/core/7/load     18.86
/cpu/core/8/load     10.11
/cpu/core/9/load     6.21
/cpu/timestamp       "2025-11-12T01:23:45.789Z"
```

## HTTP JSON API

When `HTTP_ENABLED=true`, SystemOSC runs an HTTP server that responds to any `GET` request with the latest CPU stats as a JSON array of name-value pairs. The data mirrors the OSC messages exactly.

### Endpoint

```
GET http://localhost:{HTTP_PORT}/
```

### Response Format

```json
[
  { "name": "/cpu/usage/total", "value": 46.45 },
  { "name": "/cpu/usage/user", "value": 28.44 },
  { "name": "/cpu/usage/system", "value": 18.01 },
  { "name": "/cpu/usage/idle", "value": 53.55 },
  { "name": "/cpu/info/model", "value": "Apple M1 Max" },
  { "name": "/cpu/info/cores", "value": 10 },
  { "name": "/cpu/core/0/load", "value": 97.09 },
  { "name": "/cpu/core/1/load", "value": 97.09 },
  { "name": "/cpu/core/2/load", "value": 70.36 },
  { "name": "/cpu/core/3/load", "value": 56.03 },
  { "name": "/cpu/core/4/load", "value": 41.09 },
  { "name": "/cpu/core/5/load", "value": 32.69 },
  { "name": "/cpu/core/6/load", "value": 35.28 },
  { "name": "/cpu/core/7/load", "value": 18.86 },
  { "name": "/cpu/core/8/load", "value": 10.11 },
  { "name": "/cpu/core/9/load", "value": 6.21 },
  { "name": "/cpu/timestamp", "value": "2025-11-12T01:23:45.789Z" }
]
```

Returns HTTP 503 with `{"error": "No data available yet"}` if no monitoring cycle has completed yet.

### Example Usage

```bash
curl http://localhost:3000/
```

## What to Monitor for Ableton Live

### Primary Metric: `/cpu/usage/total`

Watch this value to know when you're approaching system limits:

- 🟢 **< 50%**: Safe zone - plenty of headroom
- 🟡 **50-80%**: Caution - watch closely, consider freezing tracks
- 🔴 **> 80%**: Danger zone - audio dropouts likely, reduce load immediately

### Also Important: Per-Core Messages

Monitor individual cores (`/cpu/core/N/load`) because:

- **Single-threaded plugins** can max out one core even when total CPU is only 50%
- If any single core hits 95-100%, you can still get audio dropouts
- Common with heavy synths (Serum, Omnisphere) or older plugins

**Alert when:**
- `/cpu/usage/total` > 80%
- **OR** any `/cpu/core/N/load` > 95%

## Use Case: Monitoring Ableton Live

### Scenario 1: Live Performance

Run SystemOSC on your performance laptop and send OSC to an iPad or secondary display running TouchOSC or similar. Get visual warnings before audio dropouts occur.

```env
OSC_HOST=192.168.1.50
OSC_PORT=8000
INTERVAL_MS=5000  # Check every 5 seconds during live performance
```

### Scenario 2: Studio Session Analysis

Send OSC data to Max/MSP, Pure Data, or custom software that logs performance over time to identify which tracks or plugins are CPU-heavy.

```env
OSC_HOST=localhost
OSC_PORT=9877
INTERVAL_MS=10000
```

### Scenario 3: Visual Feedback Integration

Connect SystemOSC to visual software that changes colors/patterns based on CPU load, giving you ambient awareness of system health while producing.

## Integration Examples

### TouchOSC

Create a simple layout with:
- A label receiving `/cpu/usage/total` - shows main CPU percentage
- A radial indicator mapped to `/cpu/usage/total` - visual gauge
- Multiple bar graphs for `/cpu/core/0/load` through `/cpu/core/9/load`
- Color script: green < 50%, yellow 50-80%, red > 80%

### Max/MSP

```maxpat
[udpreceive 9877]
|
[route /cpu/usage/total /cpu/core/0/load]
|                    |
[scale 0 100 0 1]    [scale 0 100 0 1]
|                    |
[> 0.8]              [> 0.95]
|                    |
[sel 1]              [sel 1]
|                    |
[bang]               [bang]
|                    |
"HIGH CPU!"          "CORE 0 MAXED!"
```

### Pure Data

```pd
[netreceive -u -b 9877]
|
[oscparse]
|
[route /cpu/usage/total]
|
[print CPU]
```

## Daemon Mode

SystemOSC can run as a headless background daemon without the terminal UI. This is useful for running as a service, in scripts, or piping output to log files.

```bash
# Run in daemon mode (logs one line per cycle to stdout)
npx tsx src/index.ts --daemon

# Or via npm script
npm run daemon
```

Daemon output format:
```
[14:32:05] CPU: 45.2% | Send: OK
[14:32:15] CPU: 38.7% | Send: OK
```

Daemon mode supports all the same `.env` configuration (OSC, HTTP, interval) as the interactive UI. Press `Ctrl+C` to stop.

## Auto-Start as macOS Service (Optional)

On macOS, you can install SystemOSC as a LaunchAgent that starts automatically at login. This is entirely optional and uses the standard macOS `launchctl` system.

### Requirements

- **macOS** (LaunchAgents are a macOS feature)
- **Node.js** installed and available in your PATH
- **Xcode Command Line Tools** (only if installing the menu bar app): `xcode-select --install`

### Install

```bash
# Install daemon + menu bar app (requires swiftc)
npm run service:install

# Install daemon only (no menu bar app, no Xcode needed)
npm run service:install:no-menubar
```

The install script will:
1. Build the TypeScript project (`npm run build`)
2. Resolve your `node` binary path
3. Generate LaunchAgent plists from templates
4. Optionally compile the native Swift menu bar app
5. Load the LaunchAgent(s) via `launchctl`

### Uninstall

```bash
npm run service:uninstall
```

This stops the running services and removes the LaunchAgent plist files.

### Check Status

```bash
npm run service:status
```

### View Logs

```bash
npm run service:logs
```

Log file location: `~/Library/Logs/systemosc.log`

### Menu Bar App (Optional, macOS only)

When installed with the menu bar option, a native macOS menu bar icon appears showing:

- **CPU percentage** in the menu bar (e.g., "CPU 45%")
- **Color-coded**: green (<50%), orange/yellow (50-80%), red (>80%)
- **Dropdown menu**: per-core load bars, "View Logs", "Quit"

The menu bar app polls the SystemOSC HTTP API, so `HTTP_ENABLED=true` must be set in your `.env` file.

The menu bar app runs as an accessory (no Dock icon) and has its own LaunchAgent (`com.systemosc.menubar`).

### How It Works

The service uses macOS LaunchAgents (per-user, no root required):

| File | Purpose |
|------|---------|
| `com.systemosc.agent.plist` | Template for the daemon LaunchAgent |
| `com.systemosc.menubar.plist` | Template for the menu bar LaunchAgent |
| `scripts/service.sh` | Generates plists from templates, manages launchctl |

The templates contain placeholder tokens (`__NODE_PATH__`, `__PROJECT_DIR__`, `__HOME__`) that are replaced with actual paths at install time. The generated plists are placed in `~/Library/LaunchAgents/` (not committed to the repo).

## Development

### Project Structure

```
systemosc/
├── src/
│   ├── index.ts          # Main application with OSC sender and HTTP server
│   └── test-server.ts    # Test HTTP server (deprecated)
├── menubar/
│   └── SystemOSCMenu.swift   # Native macOS menu bar app (optional)
├── scripts/
│   └── service.sh        # macOS LaunchAgent install/uninstall script
├── com.systemosc.agent.plist      # LaunchAgent template (daemon)
├── com.systemosc.menubar.plist    # LaunchAgent template (menu bar)
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
- `npm run typecheck` - Check types without building
- `npm run daemon` - Run in headless daemon mode (no terminal UI)
- `npm run service:install` - Build and install as macOS LaunchAgent (with menu bar)
- `npm run service:install:no-menubar` - Install daemon only (no menu bar app)
- `npm run service:uninstall` - Stop and remove all LaunchAgents
- `npm run service:status` - Show service status
- `npm run service:logs` - Tail the daemon log file

### TypeScript

This project is fully typed with TypeScript for better reliability and developer experience. All CPU statistics and OSC communication have proper type definitions.

## Troubleshooting

**"WARNING: Using default OSC settings"**
- This is just informational - it will use localhost:9877
- Set `OSC_HOST` and `OSC_PORT` in `.env` to suppress warning

**Messages not received**
- Verify the OSC receiver is listening on the correct port
- Check firewall settings allow UDP traffic
- Use Wireshark or `tcpdump` to verify UDP packets are being sent:
  ```bash
  sudo tcpdump -i any -n udp port 9877
  ```

**High CPU usage from SystemOSC itself**
- Increase `INTERVAL_MS` to reduce monitoring frequency
- The monitoring overhead is typically < 1% CPU

**Single core at 100% but total shows 50%**
- This is normal and expected - one plugin is maxing out one core
- In Ableton: freeze that track or reduce the plugin's quality/oversampling
- This is why monitoring per-core load is important!

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

ISC

## Acknowledgments

Built for the Ableton Live community and music producers everywhere who need reliable performance monitoring.

OSC protocol support enables integration with industry-standard creative coding tools and control surfaces.
