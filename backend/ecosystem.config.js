module.exports = {
  apps: [{
    name: "whatsapp-saas-backend",
    script: "src/server.js",
    instances: "max",
    exec_mode: "cluster",
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 5000
    }
  }, {
    name: "whatsapp-broadcast-worker",
    script: "src/workers/broadcastWorker.js",
    instances: 1, // Keep strictly to 1 to respect Meta rate limits sequentially if needed
    watch: false,
    env: {
      NODE_ENV: "production"
    }
  }]
};