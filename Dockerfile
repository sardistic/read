FROM node:20

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Start the application
EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

CMD ["npm", "start"]
