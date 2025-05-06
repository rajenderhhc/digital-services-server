module.exports = {
  apps: [
    {
      name: 'digital_sevices_new',
      script: 'index.js',
      instance: 'MAX',
      autorestart: true,
      watch: true,
      max_memory_restart: '1G',
      exec_mode: 'fork',
      NODE_ENV: 'production',
    },
  ],
};
