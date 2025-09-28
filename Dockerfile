# Use the official Node.js 22 slim image
FROM node:22-slim

# Enable pnpm using Corepack dan set ke versi 10.13.1
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Set working directory inside the container
WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the project files
COPY . .

# Start the Telegram bot
CMD ["pnpm", "start"]
