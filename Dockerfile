FROM node:18-alpine

RUN apk add --no-cache yt-dlp ffmpeg python3 py3-pip
RUN pip3 install --no-cache-dir yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

RUN mkdir -p temp data

ENV NODE_ENV=production

EXPOSE 10000

CMD ["node", "src/index.js"]
