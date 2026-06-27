FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Railway sets PORT env var automatically
ENV PORT=8000

# Use shell form so $PORT is expanded at runtime
CMD uvicorn server:app --host 0.0.0.0 --port $PORT
