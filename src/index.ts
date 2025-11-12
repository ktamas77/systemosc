#!/usr/bin/env node
import 'dotenv/config';
import React from 'react';
import { render, Box, Text } from 'ink';
import si from 'systeminformation';
// @ts-expect-error - no type definitions available for osc package
import osc from 'osc';
import os from 'os';

// Type definitions
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

interface SendResult {
  success: boolean;
  status: string;
  error?: string;
  timestamp: string;
}

// Configuration
const OSC_HOST = process.env.OSC_HOST || 'localhost';
const OSC_PORT = parseInt(process.env.OSC_PORT || '9877', 10);
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '10000', 10);

// Validate configuration
if (!process.env.OSC_HOST && !process.env.OSC_PORT) {
  console.error('WARNING: Using default OSC settings (localhost:9877)');
  console.error('Set OSC_HOST and OSC_PORT in .env file for custom configuration');
}

// Initialize OSC UDP Port
let oscPort: any = null;

/**
 * Initializes the OSC UDP port for sending messages
 */
function initializeOSC(): void {
  oscPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 0, // Use any available port for sending
    metadata: true,
  });

  oscPort.on('ready', () => {
    // OSC port is ready
  });

  oscPort.on('error', (error: any) => {
    console.error(`OSC Error: ${error.message}`);
  });

  oscPort.open();
}

/**
 * Collects CPU usage statistics
 * @returns CPU statistics including usage percentages and per-core data
 */
async function collectCPUStats(): Promise<CPUStats> {
  try {
    const currentLoad = await si.currentLoad();
    const cpuInfo = await si.cpu();

    return {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      cpu: {
        model: cpuInfo.brand,
        cores: cpuInfo.cores,
        speed: cpuInfo.speed,
      },
      usage: {
        total: parseFloat(currentLoad.currentLoad.toFixed(2)),
        user: parseFloat(currentLoad.currentLoadUser.toFixed(2)),
        system: parseFloat(currentLoad.currentLoadSystem.toFixed(2)),
        idle: parseFloat(currentLoad.currentLoadIdle.toFixed(2)),
      },
      perCore: currentLoad.cpus.map((cpu, index) => ({
        core: index,
        load: parseFloat(cpu.load.toFixed(2)),
        loadUser: parseFloat(cpu.loadUser.toFixed(2)),
        loadSystem: parseFloat(cpu.loadSystem.toFixed(2)),
        loadIdle: parseFloat(cpu.loadIdle.toFixed(2)),
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to collect CPU stats: ${errorMessage}`);
  }
}

/**
 * Sends CPU statistics to the target via OSC over UDP
 * @param stats - CPU statistics object to send
 * @returns Send result with status and timestamp
 */
async function sendStats(stats: CPUStats): Promise<SendResult> {
  try {
    if (!oscPort) {
      throw new Error('OSC port not initialized');
    }

    // Send main CPU usage metrics as separate OSC messages
    oscPort.send(
      {
        address: '/cpu/usage/total',
        args: [{ type: 'f', value: stats.usage.total }],
      },
      OSC_HOST,
      OSC_PORT
    );

    oscPort.send(
      {
        address: '/cpu/usage/user',
        args: [{ type: 'f', value: stats.usage.user }],
      },
      OSC_HOST,
      OSC_PORT
    );

    oscPort.send(
      {
        address: '/cpu/usage/system',
        args: [{ type: 'f', value: stats.usage.system }],
      },
      OSC_HOST,
      OSC_PORT
    );

    oscPort.send(
      {
        address: '/cpu/usage/idle',
        args: [{ type: 'f', value: stats.usage.idle }],
      },
      OSC_HOST,
      OSC_PORT
    );

    // Send CPU info
    oscPort.send(
      {
        address: '/cpu/info/model',
        args: [{ type: 's', value: stats.cpu.model }],
      },
      OSC_HOST,
      OSC_PORT
    );

    oscPort.send(
      {
        address: '/cpu/info/cores',
        args: [{ type: 'i', value: stats.cpu.cores }],
      },
      OSC_HOST,
      OSC_PORT
    );

    // Send per-core load (only total load for each core to keep messages minimal)
    stats.perCore.forEach((core) => {
      oscPort.send(
        {
          address: `/cpu/core/${core.core}/load`,
          args: [{ type: 'f', value: core.load }],
        },
        OSC_HOST,
        OSC_PORT
      );
    });

    // Send a bundle marker to indicate end of this batch
    oscPort.send(
      {
        address: '/cpu/timestamp',
        args: [{ type: 's', value: stats.timestamp }],
      },
      OSC_HOST,
      OSC_PORT
    );

    return {
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      status: 'ERROR',
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Main App Component - Displays real-time CPU monitoring UI
 */
function App(): React.ReactElement {
  const [cpuStats, setCpuStats] = React.useState<CPUStats | null>(null);
  const [lastSend, setLastSend] = React.useState<SendResult>({
    success: false,
    status: 'Initializing...',
    timestamp: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let isMounted = true;

    // Initialize OSC
    initializeOSC();

    const monitor = async (): Promise<void> => {
      try {
        const stats = await collectCPUStats();

        if (isMounted) {
          setCpuStats(stats);
          setIsLoading(false);
        }

        const sendResult = await sendStats(stats);

        if (isMounted) {
          setLastSend(sendResult);
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setLastSend({
            success: false,
            status: 'ERROR',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
          setIsLoading(false);
        }
      }
    };

    // Run immediately
    monitor();

    // Then run at specified interval
    const interval = setInterval(monitor, INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (oscPort) {
        oscPort.close();
      }
    };
  }, []);

  const formatTime = (isoString: string | null | undefined): string => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleTimeString();
  };

  const getStatusColor = (status: string): string => {
    if (status === 'OK') return 'green';
    if (status === 'ERROR') return 'red';
    return 'yellow';
  };

  const getUsageColor = (value: number): string => {
    if (value >= 80) return 'red';
    if (value >= 50) return 'yellow';
    return 'green';
  };

  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    // Header
    React.createElement(
      Box,
      { marginBottom: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, 'SystemOSC - CPU Monitor for Ableton Live')
    ),
    // Target Info
    React.createElement(
      Box,
      { marginBottom: 1 },
      React.createElement(
        Text,
        null,
        'OSC Target: ',
        React.createElement(Text, { color: 'blue' }, `${OSC_HOST}:${OSC_PORT}`)
      )
    ),
    React.createElement(
      Box,
      { marginBottom: 1 },
      React.createElement(
        Text,
        { dimColor: true },
        `Interval: ${INTERVAL_MS / 1000}s | Hostname: ${os.hostname()}`
      )
    ),
    // Divider
    React.createElement(
      Box,
      { marginBottom: 1 },
      React.createElement(Text, { dimColor: true }, '─'.repeat(60))
    ),
    // CPU Stats
    isLoading
      ? React.createElement(
          Box,
          null,
          React.createElement(Text, { color: 'yellow' }, 'Loading CPU statistics...')
        )
      : cpuStats
      ? React.createElement(
          Box,
          { flexDirection: 'column', marginBottom: 1 },
          React.createElement(
            Box,
            { marginBottom: 1 },
            React.createElement(
              Text,
              { bold: true },
              'CPU: ',
              React.createElement(Text, { dimColor: true }, cpuStats.cpu.model),
              ' ',
              React.createElement(
                Text,
                { dimColor: true },
                `(${cpuStats.cpu.cores} cores @ ${cpuStats.cpu.speed} GHz)`
              )
            )
          ),
          React.createElement(
            Box,
            { flexDirection: 'column' },
            React.createElement(
              Box,
              null,
              React.createElement(Text, null, 'Total:  '),
              React.createElement(
                Text,
                { bold: true, color: getUsageColor(cpuStats.usage.total) },
                `${cpuStats.usage.total.toFixed(2)}%`
              )
            ),
            React.createElement(
              Box,
              null,
              React.createElement(Text, null, 'User:   '),
              React.createElement(
                Text,
                { color: getUsageColor(cpuStats.usage.user) },
                `${cpuStats.usage.user.toFixed(2)}%`
              )
            ),
            React.createElement(
              Box,
              null,
              React.createElement(Text, null, 'System: '),
              React.createElement(
                Text,
                { color: getUsageColor(cpuStats.usage.system) },
                `${cpuStats.usage.system.toFixed(2)}%`
              )
            ),
            React.createElement(
              Box,
              null,
              React.createElement(Text, null, 'Idle:   '),
              React.createElement(Text, { color: 'gray' }, `${cpuStats.usage.idle.toFixed(2)}%`)
            )
          )
        )
      : React.createElement(
          Box,
          { marginBottom: 1 },
          React.createElement(Text, { color: 'red' }, 'No CPU data available')
        ),
    // Divider
    React.createElement(
      Box,
      { marginBottom: 1 },
      React.createElement(Text, { dimColor: true }, '─'.repeat(60))
    ),
    // Last Send Status
    React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(
        Box,
        null,
        React.createElement(Text, null, 'Last Send: '),
        React.createElement(
          Text,
          { bold: true, color: getStatusColor(lastSend.status) },
          lastSend.status
        ),
        React.createElement(Text, { dimColor: true }, ' (OSC UDP)')
      ),
      lastSend.timestamp &&
        React.createElement(
          Box,
          null,
          React.createElement(Text, null, 'Timestamp: '),
          React.createElement(Text, { color: 'gray' }, formatTime(lastSend.timestamp))
        ),
      lastSend.error &&
        React.createElement(
          Box,
          { marginTop: 1 },
          React.createElement(Text, { color: 'red' }, `Error: ${lastSend.error}`)
        )
    ),
    // Footer
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(Text, { dimColor: true }, 'Press Ctrl+C to exit')
    )
  );
}

// Render the app
const { unmount } = render(React.createElement(App));

// Handle graceful shutdown
const shutdown = (): void => {
  if (oscPort) {
    oscPort.close();
  }
  unmount();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
