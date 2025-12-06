module.exports = {
  apps: [
    {
      name: "webapp",
      script: "npm",
      args: "run dev -- --port 3000 --host",
      env: {
        NODE_ENV: "development"
      }
    }
  ]
}