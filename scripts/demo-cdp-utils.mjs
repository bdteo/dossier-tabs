import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export const defaultHost = '127.0.0.1';
export const defaultChromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const httpReadyAttempts = 600;

export function assertWebSocketRuntime(commandName) {
  if (typeof WebSocket !== 'function') {
    throw new Error(`${commandName} requires a Node.js runtime with a built-in WebSocket client. Use Node 22 or newer.`);
  }
}

export class CdpClient {
  constructor(webSocketUrl) {
    this.closed = false;
    this.eventWaiters = new Set();
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.webSocket = new WebSocket(webSocketUrl);
    this.readySettled = false;
    this.rejectReady = () => {};
    this.ready = new Promise((resolve, reject) => {
      this.rejectReady = (error) => {
        if (this.readySettled) {
          return;
        }

        this.readySettled = true;
        reject(error);
      };
      this.webSocket.addEventListener('open', () => {
        this.readySettled = true;
        resolve();
      }, { once: true });
      this.webSocket.addEventListener('error', () => {
        this.rejectReady(new Error('Chrome DevTools websocket failed before it was ready.'));
      }, { once: true });
    });
    this.webSocket.addEventListener('close', () => {
      const error = new Error('Chrome DevTools websocket closed before the demo QA run finished.');

      this.rejectReady(error);
      this.rejectOpenWork(error);
    });
    this.webSocket.addEventListener('error', () => {
      const error = new Error('Chrome DevTools websocket failed before the demo QA run finished.');

      this.rejectReady(error);
      this.rejectOpenWork(error);
    });
    this.webSocket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { reject, resolve } = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (message.error) {
          reject(new Error(message.error.message));
          return;
        }

        resolve(message.result ?? {});
        return;
      }

      for (const listener of this.events.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;

    if (this.closed) {
      throw new Error(`Cannot send ${method}; Chrome DevTools websocket is already closed.`);
    }

    const id = this.nextId;
    this.nextId += 1;

    const response = new Promise((resolve, reject) => {
      this.pending.set(id, { reject, resolve });
    });

    try {
      this.webSocket.send(JSON.stringify({ id, method, params }));
    } catch (error) {
      this.pending.delete(id);
      throw error;
    }

    return await response;
  }

  waitFor(method) {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        reject(new Error(`Cannot wait for ${method}; Chrome DevTools websocket is already closed.`));
        return;
      }

      const listeners = this.events.get(method) ?? [];
      const listener = (params) => {
        this.events.set(method, listeners.filter((candidate) => candidate !== listener));
        this.eventWaiters.delete(waiter);
        resolve(params);
      };
      const waiter = { method, listener, reject };

      this.eventWaiters.add(waiter);
      listeners.push(listener);
      this.events.set(method, listeners);
    });
  }

  on(method, listener) {
    if (this.closed) {
      throw new Error(`Cannot listen for ${method}; Chrome DevTools websocket is already closed.`);
    }

    const listeners = this.events.get(method) ?? [];

    listeners.push(listener);
    this.events.set(method, listeners);

    return () => {
      const currentListeners = this.events.get(method) ?? [];

      this.events.set(method, currentListeners.filter((candidate) => candidate !== listener));
    };
  }

  close() {
    const error = new Error('Chrome DevTools websocket closed.');

    this.rejectReady(error);
    this.rejectOpenWork(error);
    this.webSocket.close();
  }

  rejectOpenWork(error) {
    if (this.closed) {
      return;
    }

    this.closed = true;

    for (const { reject } of this.pending.values()) {
      reject(error);
    }

    this.pending.clear();

    for (const waiter of this.eventWaiters) {
      const listeners = this.events.get(waiter.method) ?? [];

      this.events.set(waiter.method, listeners.filter((listener) => listener !== waiter.listener));
      waiter.reject(error);
    }

    this.eventWaiters.clear();
  }
}

export function spawnViteServer({ host = defaultHost, port, rootDir }) {
  const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');

  if (!existsSync(viteBin)) {
    throw new Error(`Vite was not found at ${viteBin}. Run pnpm install first.`);
  }

  return spawn(process.execPath, [
    viteBin,
    '--host',
    host,
    '--port',
    String(port),
    '--strictPort',
  ], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function spawnChrome({
  chromePath = defaultChromePath,
  chromePort,
  profileDir,
}) {
  if (!existsSync(chromePath)) {
    throw new Error(`Chrome was not found at ${chromePath}. Set CHROME_PATH to override.`);
  }

  return spawn(chromePath, [
    '--headless=new',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-address=${defaultHost}`,
    `--remote-debugging-port=${chromePort}`,
    'about:blank',
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function collectOutput(child, label) {
  let output = '';

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });

  return () => `${label} output:\n${output.slice(-3000)}`;
}

export async function waitForHttp(url, label, readLogs) {
  for (let attempt = 0; attempt < httpReadyAttempts; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response;
      }
    } catch {
      // Process is still booting.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}\n${readLogs()}`);
}

export async function readChromeJson({ chromePort, host = defaultHost, method = 'GET', pathname }) {
  const url = `http://${host}:${chromePort}${pathname}`;

  for (let attempt = 0; attempt < httpReadyAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { method });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Chrome is still booting.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for Chrome DevTools at ${url}`);
}

export async function openCdpTab({ chromePort, host = defaultHost }) {
  const target = await readChromeJson({
    chromePort,
    host,
    method: 'PUT',
    pathname: `/json/new?${encodeURIComponent('about:blank')}`,
  });
  const client = new CdpClient(target.webSocketDebuggerUrl);

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');

  return client;
}

export async function evaluateInPage(client, expression) {
  const { exceptionDetails, result } = await client.send('Runtime.evaluate', {
    awaitPromise: true,
    expression,
    returnByValue: true,
  });

  if (exceptionDetails) {
    throw new Error(exceptionDetails.text ?? 'Browser evaluation failed.');
  }

  return result?.value;
}

export async function waitForDemoFrame(client) {
  await evaluateInPage(client, 'document.fonts && document.fonts.ready ? document.fonts.ready.then(() => true) : true');
  await evaluateInPage(client, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
}

export async function navigateDemo(client, { baseUrl, height, mobile = false, pathAndQuery = '', width }) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1,
    height,
    mobile,
    screenHeight: height,
    screenWidth: width,
    width,
  });

  const load = client.waitFor('Page.loadEventFired');
  await client.send('Page.navigate', { url: `${baseUrl}${pathAndQuery}` });
  await load;
  await waitForDemoFrame(client);
}

export async function createDemoRuntime({
  chromePort,
  commandName,
  host = defaultHost,
  port,
  profilePrefix,
  rootDir,
}) {
  assertWebSocketRuntime(commandName);

  const chromePath = process.env.CHROME_PATH ?? defaultChromePath;
  const profileDir = path.join(tmpdir(), `${profilePrefix}-${process.pid}`);
  const baseUrl = `http://${host}:${port}/`;
  let server;
  let chrome;
  let cdp;

  await rm(profileDir, { recursive: true, force: true });

  try {
    server = spawnViteServer({ host, port, rootDir });
    const readServerLogs = collectOutput(server, 'Vite');
    await waitForHttp(baseUrl, 'Vite demo server', readServerLogs);

    chrome = spawnChrome({ chromePath, chromePort, profileDir });
    const readChromeLogs = collectOutput(chrome, 'Chrome');
    await waitForHttp(`http://${host}:${chromePort}/json/version`, 'Chrome DevTools', readChromeLogs);

    cdp = await openCdpTab({ chromePort, host });

    return {
      baseUrl,
      cdp,
      async cleanup() {
        cdp?.close();
        await terminate(chrome);
        await terminate(server);
        await rm(profileDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    cdp?.close();
    await terminate(chrome);
    await terminate(server);
    await rm(profileDir, { recursive: true, force: true });
    throw error;
  }
}

export async function terminate(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill('SIGTERM');

  const exitedAfterTerminate = await waitForExit(child, 1000);

  if (exitedAfterTerminate) {
    return;
  }

  child.kill('SIGKILL');
  await waitForExit(child, 1000);
}

async function waitForExit(child, timeout) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return true;
  }

  return await Promise.race([
    new Promise((resolve) => {
      child.once('exit', () => resolve(true));
    }),
    delay(timeout).then(() => false),
  ]);
}
