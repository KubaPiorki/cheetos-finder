# Fix server for Cheetos Finder (fix/ping-admin-login-2026)

This folder contains a standalone, optional fix server that:

- Serves /admin_login (admin_login.html) so "Cannot GET /admin_login" is resolved when using this server.
- Adds two endpoints for ping functionality (server-side ICMP ping):
  - GET /api/ping?ip=1.2.3.4&timeout=5
  - POST /api/ping-multi { ips: [...], timeout: 5, concurrency: 10 }
- Provides a small frontend UI (public/admin_login.html) with Auto Ping (Nowość 2026) and without the label "Wszystkie IP na raz".

How to run (locally)

1. cd fix-server
2. npm install
3. npm start

The server listens on port 3000 by default (use PORT environment variable to change).

Notes

- This is provided as a safe, minimal fix inside a separate folder so it doesn't overwrite existing project files. You can merge the changes or copy only the files you need into your main project.
- The ping endpoints use the npm package `ping` which performs a system ICMP ping where possible. On some hosting environments ICMP may be restricted.
- If you prefer integrating the endpoints into your existing server, copy the handlers from server.js into your app and ensure express.static serves your public folder and you have CORS enabled if using different origins.
