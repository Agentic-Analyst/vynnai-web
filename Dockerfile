FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Make VITE_RUNNER_URL available to `npm run build`
ARG VITE_RUNNER_URL
ENV VITE_RUNNER_URL=${VITE_RUNNER_URL}

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
