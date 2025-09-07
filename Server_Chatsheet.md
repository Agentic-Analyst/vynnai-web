# Your quick “change → deploy” cheat sheet

Frontend change

# local
cd gpt-web
npm test   # (if you have tests)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t fuzanwenn/gpt-web:latest \
  -t fuzanwenn/gpt-web:vYYYY.MM.DD-hhmm \
  --build-arg VITE_RUNNER_URL=https://api.vynnai.com \
  --push .

# server
ssh root@5.223.46.44
cd /root/vynn
docker compose pull web && docker compose up -d
curl -I https://app.vynnai.com


Backend change

# local
cd api-runner
pytest -q   # (if you have tests)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t fuzanwenn/api-runner:latest \
  -t fuzanwenn/api-runner:vYYYY.MM.DD-hhmm \
  --push .

# server
ssh root@5.223.46.44
cd /root/vynn
docker compose pull api && docker compose up -d
curl -I https://api.vynnai.com/health


Rotate a secret

# server
ssh root@5.223.46.44
cd /root/vynn
nano api.env            # update OPENAI_API_KEY / SESSION_SECRET / etc
docker compose up -d api


Check health

docker compose ps
docker compose logs -f api
docker compose logs -f caddy
docker stats
curl -I https://api.vynnai.com/health


Prune cruft

docker container prune -f
docker image prune -af
docker volume prune -f
docker system df