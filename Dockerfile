FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_RUNNER_URL
ENV VITE_RUNNER_URL=${VITE_RUNNER_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Simple static hosting; the app calls the runner via VITE_RUNNER_URL
EXPOSE 80
