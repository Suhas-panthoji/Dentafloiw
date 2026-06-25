# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock* ./
RUN yarn install --frozen-lockfile || npm install
COPY frontend/ ./
ENV REACT_APP_BACKEND_URL=""
RUN npm run build

# Stage 2: Serve Backend & Frontend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy React build artifact from Stage 1
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Set environment variables and working directory
ENV PORT=7860
WORKDIR /app/backend

# Expose port 7860 (Hugging Face Spaces default port)
EXPOSE 7860

# Run uvicorn server on port 7860
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "7860"]
