# Refresh recommendations cron

GET /api/cron/refresh-recommendations

Monthly curation pass. Iterates all age bands, calls the curator,
resolves against TMDB, persists.
