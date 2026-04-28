FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-noto-cjk fontconfig ca-certificates \
    && fc-cache -fv \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md LICENSE ./
COPY design_bot ./design_bot

RUN pip install ".[server]"

EXPOSE 8000

CMD ["python", "-m", "design_bot.server"]
