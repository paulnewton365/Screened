# Resolve API route

GET /api/titles/resolve?tmdbId=...&type=movie|tv

Get-or-create a title row in our database. Fetches certifications from
TMDB on first sight. Returns the internal title id.
