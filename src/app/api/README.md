# API routes

Server-side route handlers. Anything that needs to talk to a paid API
(Claude, TMDB) goes through here so secrets stay on the server.

Subfolders:

- `titles/` — title search, resolve, and analysis routes
