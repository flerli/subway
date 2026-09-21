# Debian-based node runtime: the TTS engine needs glibc (onnxruntime has no
# musl wheels), so this image cannot be alpine like the other services.
FROM node:22-slim

WORKDIR /app

COPY package.json ./package.json
RUN npm install --omit=dev

# Runtime modules: server + TTS voice bridge/cache + Supertonic helper.
COPY server.mjs ./server.mjs
COPY voice/ ./voice/
COPY tts_helper/ ./tts_helper/
COPY scripts/ ./scripts/

# TTS engine (SW-REQ-013-02): python3 + venv with supertonic, then stage the
# Supertonic-3 weights (~380 MB) into /app/tts-models. Build-time network only;
# the kiosk never downloads weights at runtime (helper runs --offline).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/tts-venv \
  && /opt/tts-venv/bin/pip install --no-cache-dir supertonic==1.3.1 \
  && python3 scripts/fetch-tts-models.py /app/tts-models

ENV HOST=0.0.0.0
ENV PORT=8787
ENV TTS_MODEL_DIR=/app/tts-models
ENV TTS_PYTHON_BIN=/opt/tts-venv/bin/python

EXPOSE 8787

CMD ["npm", "start"]
