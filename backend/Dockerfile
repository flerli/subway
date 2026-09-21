FROM node:22-alpine

WORKDIR /app

COPY package.json ./package.json
RUN npm install --omit=dev

# Runtime modules: server + TTS voice bridge/cache + Supertonic helper.
# (TTS synthesis additionally requires python3 + supertonic + staged weights
# at runtime — see epic E-013 operating notes; until staged, voice routes
# fail closed via the status probe instead of crashing the app.)
COPY server.mjs ./server.mjs
COPY voice/ ./voice/
COPY tts_helper/ ./tts_helper/

ENV HOST=0.0.0.0
ENV PORT=8787

EXPOSE 8787

CMD ["npm", "start"]
