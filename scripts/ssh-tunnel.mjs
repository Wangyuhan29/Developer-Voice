import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...loadEnv("development", root, ""), ...process.env };
const cliArgs = process.argv.slice(2);
const checkOnly = cliArgs.includes("--check");

function port(value, name) {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1 || Number(value) > 65535) {
    throw new Error(`${name} 必须是 1 至 65535 的端口号`);
  }
  return String(Number(value));
}

try {
  const target = (cliArgs.find(arg => arg !== "--check") || env.SSH_TARGET || "").trim();
  if (!target || target === "your-user@your-server") {
    throw new Error("请在 .env.development.local 填写 SSH_TARGET，或执行 npm run tunnel -- user@host");
  }
  if (target.startsWith("-") || /[\s\x00-\x1f]/.test(target)) {
    throw new Error("SSH_TARGET 必须是有效的 SSH 别名或 user@host，不得包含空白或选项");
  }
  const api = new URL(env.DEV_API_TARGET || "http://127.0.0.1:18000");
  if (api.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(api.hostname)
      || api.username || api.password || api.search || api.hash || api.pathname !== "/") {
    throw new Error("SSH 开发模式的 DEV_API_TARGET 必须为 http://127.0.0.1:端口 或 http://localhost:端口");
  }
  const localPort = port(api.port || 80, "DEV_API_TARGET 端口");
  const localHost = api.hostname;
  const remotePort = port(env.SSH_REMOTE_PORT || 8000, "SSH_REMOTE_PORT");
  const args = ["-N", "-T", "-o", "ExitOnForwardFailure=yes",
    "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=3"];
  if (env.SSH_PORT) args.push("-p", port(env.SSH_PORT, "SSH_PORT"));
  if (env.SSH_IDENTITY_FILE) {
    const identity = env.SSH_IDENTITY_FILE.replace(/^~[\\/]/, `${homedir()}/`);
    args.push("-i", resolve(root, identity));
  }
  // Binding is limited to this computer. No remote command is run.
  args.push("-L", `${localHost}:${localPort}:127.0.0.1:${remotePort}`, target);
  if (checkOnly) {
    console.log(JSON.stringify({ target, devApiTarget: api.origin,
      forward: `${localHost}:${localPort} -> 服务器 127.0.0.1:${remotePort}`,
      executable: "ssh", args }, null, 2));
  } else {
    console.log(`正在启动 SSH 隧道：${localHost}:${localPort} -> ${target} 的 127.0.0.1:${remotePort}`);
    console.log("保持此终端打开；另一个终端运行 npm run dev。Ctrl+C 关闭隧道。");
    const ssh = spawn("ssh", args, { stdio: "inherit", shell: false });
    ssh.once("error", error => {
      console.error(`无法启动 OpenSSH：${error.message}`);
      process.exitCode = 1;
    });
    ssh.once("exit", code => { process.exitCode = code ?? 0; });
    process.once("SIGINT", () => ssh.kill("SIGINT"));
    process.once("SIGTERM", () => ssh.kill("SIGTERM"));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
