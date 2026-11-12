FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js sim_host.js game_index.html ./
COPY web ./web
ENV PORT=8080 LIHL_WEB=/app/web
EXPOSE 8080
USER node
CMD ["node", "server.js"]
