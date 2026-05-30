FROM node:22-bookworm-slim AS builder

WORKDIR /app/frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS runtime

RUN addgroup -g 1000 app \
    && adduser -u 1000 -G app -s /sbin/nologin -D app \
    && mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
    && chown -R app:app /tmp /var/cache/nginx /var/log/nginx /usr/share/nginx/html \
    && touch /tmp/nginx.pid \
    && chown app:app /tmp/nginx.pid

COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder --chown=app:app /app/frontend/out /usr/share/nginx/html

USER app

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
