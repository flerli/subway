FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ARG VITE_BASE_PATH=/
# Kiosk-local faster-whisper (each kiosk runs docker/stt on its own loopback;
# non-kiosk browsers fail the endpoint and fall back to in-browser models).
ARG VITE_STT_ENDPOINT=http://127.0.0.1:8080/transcribe
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_STT_ENDPOINT=${VITE_STT_ENDPOINT}

# Stage the offline STT runtime (Whisper-tiny q8 + ONNX WASM) into public/ so the
# kiosk browser never downloads models at runtime (SW-REQ-013-01 #4). Needs
# network at build time only; skips files already staged in the context.
RUN npm run fetch:voice-models

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
