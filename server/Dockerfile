FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server.js sim_host.js game_index.html ./
ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "server.js"]
