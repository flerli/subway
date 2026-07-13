FROM python:3.13-alpine

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./server.py

ENV HOST=0.0.0.0
ENV PORT=8789

EXPOSE 8789

CMD ["python", "server.py"]