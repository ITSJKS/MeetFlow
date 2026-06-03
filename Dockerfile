# Use the official Node.js Alpine base image for a lightweight container
FROM node:20-alpine

# Install system dependencies (openssl is required by Prisma ORM)
RUN apk add --no-cache openssl

WORKDIR /app

# Copy configuration files and database schema
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./
COPY prisma ./prisma/

# Install exact node modules (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Generate the Prisma ORM Client
RUN npx prisma generate

# Build the Next.js production bundle
ENV NODE_OPTIONS="--max-old-space-size=2048"
RUN npm run build

# Expose the default Next.js web server port
EXPOSE 3000

# By default, run the Next.js web server
CMD ["npm", "run", "start"]
