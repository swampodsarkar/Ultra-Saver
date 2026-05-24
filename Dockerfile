FROM node:18-alpine

RUN apk add --no-cache yt-dlp ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

RUN mkdir -p temp data

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "src/index.js"]
