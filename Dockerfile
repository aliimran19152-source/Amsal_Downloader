

FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    git

RUN python3 -m pip install --break-system-packages -U \
    "yt-dlp[default,curl-cffi]" \
    bgutil-ytdlp-pot-provider

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
