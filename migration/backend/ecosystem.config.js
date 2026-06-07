// ============================================
// SM Elite Hajj Invoice API - PM2 Ecosystem
// LOCKED: name=smelitehajj-api, port=3012, db=sm_elite_hajj@5440
// IMPORTANT: This file owns the runtime env. PM2's saved dump must NOT
// override these. After editing, always restart with:
//   pm2 delete smelitehajj-api 2>/dev/null || true
//   pm2 start ecosystem.config.js --update-env
//   pm2 save
// The --update-env flag forces PM2 to drop any stale baked-in env from
// other projects (e.g. PORT=3013) and re-read everything below.
// ============================================
module.exports = {
  apps: [
    {
      name: 'smelitehajj-api',
      script: '/var/www/smelitehajjinvoice/migration/backend/server.js',
      cwd: '/var/www/smelitehajjinvoice/migration/backend',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      kill_timeout: 5000,
      min_uptime: '10s',
      max_restarts: 10,
      // Use the project .env as the single source of truth for secrets.
      // dotenv is loaded inside server.js via require('dotenv').config().
      env: {
        NODE_ENV: 'production',
        PORT: '3012',
        DB_HOST: 'localhost',
        DB_PORT: '5440',
        DB_NAME: 'sm_elite_hajj',
        DB_USER: 'sm_elite_user',
        DB_PASSWORD: 'SmEliteHajj2026Pass',
        CORS_ORIGIN: 'https://soft.smelitehajj.com',
        FRONTEND_URL: 'https://soft.smelitehajj.com',
        BASE_URL: 'https://soft.smelitehajj.com/api',
        UPLOADS_DIR: '/var/www/smelitehajjinvoice/migration/backend/uploads',
        // JWT_SECRET MUST come from .env on the server. Do NOT hardcode here.
        // server.js will refuse to start if JWT_SECRET is missing or weak.
      },
    },
  ],
};
