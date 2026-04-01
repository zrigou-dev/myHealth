FROM node:18-alpine

# Installation des dépendances pour PDFKit
RUN apk add --no-cache msttcorefonts-installer fontconfig
RUN update-ms-fonts

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

EXPOSE 3005

CMD ["node", "src/server.js"]