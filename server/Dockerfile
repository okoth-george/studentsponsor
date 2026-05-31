# ── BASE IMAGE ────────────────────────────────────────────────
# We use the official Node.js Alpine image.
# Alpine = minimal Linux (~5MB) — much smaller than full Ubuntu.
# node:18-alpine = Node 18 on Alpine Linux
FROM node:18-alpine

# ── WORKING DIRECTORY ─────────────────────────────────────────
# All commands from here run inside /app inside the container.
# Think of it as cd /app
WORKDIR /app

# ── INSTALL DEPENDENCIES ──────────────────────────────────────
# We copy package.json FIRST (before the rest of the code).
# Why? Docker caches each step. If package.json didn't change,
# Docker skips npm install on the next build — much faster.
COPY package*.json ./
RUN npm install --production

# ── COPY SOURCE CODE ──────────────────────────────────────────
# Now copy everything else. This layer re-runs on every code change
# but npm install above is still cached.
COPY . .

# ── CREATE UPLOADS FOLDER ────────────────────────────────────
# Ensure the uploads directory exists inside the container
RUN mkdir -p uploads

# ── PORT ──────────────────────────────────────────────────────
# Document which port the app listens on (doesn't actually open it —
# that's done in docker-compose.yml with the ports mapping)
EXPOSE 5000

# ── START COMMAND ─────────────────────────────────────────────
# Use node directly (not nodemon) in production
CMD ["node", "src/index.js"]