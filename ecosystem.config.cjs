// PM2 process file for the VPS (no Docker). Nginx on :8081 proxies to the
// app, which listens on loopback only: Nginx must be its sole caller because
// the app trusts the X-Forwarded-* headers Nginx sets.
//
//   pm2 start ecosystem.config.cjs && pm2 save
//
// Secrets live in /etc/oak-banking.env (never in the repo), loaded by Node's
// --env-file before Next.js starts. A missing or short SESSION_SECRET makes
// the server exit with code 1; min_uptime + max_restarts stop PM2 from
// restarting it forever.
module.exports = {
  apps: [
    {
      name: "oak-banking",
      cwd: "/var/www/oak-banking",
      script: "node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 5050",
      interpreter: "/opt/node-24/bin/node",
      node_args: "--env-file=/etc/oak-banking.env",
      exec_mode: "fork",
      instances: 1,
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
      autorestart: true,
      restart_delay: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      kill_timeout: 5000,
      time: true,
    },
  ],
};
