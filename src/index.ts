#!/usr/bin/env node
import 'dotenv/config';
import React from 'react';
import { render, Box, Text } from 'ink';
import si from 'systeminformation';
import axios, { AxiosError } from 'axios';
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
  statusCode?: number;
  error?: string;
  timestamp: string;
}

// Configuration
const TARGET_URL = process.env.TARGET_URL;
const INTERVAL_MS = parseInt(process.env.INTERVAL_MS || '10000', 10);

// Validate configuration
if (!TARGET_URL) {
  console.error('ERROR: TARGET_URL not set in .env file');
  console.error('Please create a .env file based on .env.example');
  process.exit(1);
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
 * Sends CPU statistics to the target server via HTTP POST
 * @param stats - CPU statistics object to send
 * @returns Send result with status and timestamp
 */
async function sendStats(stats: CPUStats): Promise<SendResult> {
  try {
    const response = await axios.post(TARGET_URL!, stats, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });

    return {
      success: true,
      status: 'OK',
      statusCode: response.status,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    let errorMessage = 'Unknown error';

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        errorMessage = `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      } else if (axiosError.request) {
        errorMessage = 'Network error - Unable to reach target';
      } else {
        errorMessage = axiosError.message;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

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
        'Target: ',
        React.createElement(Text, { color: 'blue' }, TARGET_URL)
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
        lastSend.statusCode &&
          React.createElement(Text, { dimColor: true }, ` (HTTP ${lastSend.statusCode})`)
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
  unmount();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
