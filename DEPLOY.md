# Деплой Transcriber SaaS на Contabo VPS (Portainer)

## Вариант 1: Через GitHub (рекомендуется)

### 1. Пуш проекта на GitHub

```bash
cd transcriber-saas
git init
git add .
git commit -m "Transcriber SaaS v9 - backend"
git remote add origin git@github.com:YOUR_USER/transcriber-saas.git
git push -u origin main
```

### 2. На VPS — клонируй

```bash
ssh your-vps
cd /opt
git clone https://github.com/YOUR_USER/transcriber-saas.git
cd transcriber-saas
```

### 3. Создай .env

```bash
cp .env.example .env
nano .env
```

Заполни ВСЕ ключи:
- `NCB_SECRET_KEY` — из NCB панели (Settings → API Keys)
- `S3_ACCESS_KEY`, `S3_SECRET_KEY` — из Contabo Object Storage
- `SALAD_API_KEY` — из Salad dashboard
- `STRAICO_API_KEY` — из Straico account
- `DOMAIN` — твой домен (например `transcriber.kotto.com`)
- `CORS_ORIGIN` — URL Lovable приложения (например `https://chatterbox-ai.lovable.app`)

### 4. Запуск через Docker Compose

```bash
docker compose up -d --build
```

Caddy автоматически получит SSL сертификат для `DOMAIN`.

### 5. Проверка

```bash
# Проверить что контейнеры работают
docker compose ps

# Проверить логи
docker compose logs -f app
docker compose logs -f caddy

# Тест API
curl https://your-domain.com/api/auth/session
# Должен вернуть null (нет сессии) — не 500
```

---

## Вариант 2: Через Portainer

### 1. Portainer → Stacks → Add Stack

**Name:** `transcriber-saas`

**Build method:** Git Repository

**Repository URL:** `https://github.com/YOUR_USER/transcriber-saas`
**Branch:** `main`
**Compose path:** `docker-compose.yml`

### 2. Environment variables

В Portainer → Stack → Environment variables, добавь ВСЕ переменные из `.env.example`:

| Variable | Value |
|----------|-------|
| `NCB_INSTANCE` | `55446_crm_transcriber_system` |
| `NCB_AUTH_URL` | `https://app.nocodebackend.com/api/user-auth` |
| `NCB_DATA_URL` | `https://openapi.nocodebackend.com` |
| `NCB_SECRET_KEY` | `***` |
| `S3_ENDPOINT` | `https://eu2.contabostorage.com` |
| `S3_BUCKET` | `transcriber-files` |
| `S3_ACCESS_KEY` | `***` |
| `S3_SECRET_KEY` | `***` |
| `S3_REGION` | `EU` |
| `SALAD_API_KEY` | `***` |
| `SALAD_ORG_NAME` | `***` |
| `STRAICO_API_KEY` | `***` |
| `DOMAIN` | `transcriber.your-domain.com` |
| `CORS_ORIGIN` | `https://chatterbox-ai.lovable.app` |
| `NEXT_PUBLIC_APP_URL` | `https://transcriber.your-domain.com` |
| `NODE_ENV` | `production` |

### 3. Deploy the stack

Portainer сам сделает `docker compose up -d`.

---

## DNS

Добавь A-запись для домена:
```
transcriber.your-domain.com → IP_ВАШЕГО_VPS
```

Caddy сам получит SSL через Let's Encrypt после того как DNS пропагируется.

---

## После деплоя — чеклист

1. ✅ `curl https://domain/api/auth/session` → `null` (не ошибка)
2. ✅ `curl https://domain/api/usage` → `401` (нет авторизации — это ОК)
3. ✅ Создать первого юзера: `curl -X POST https://domain/api/auth/sign-up -H 'Content-Type: application/json' -d '{"name":"Admin","email":"you@email.com","password":"your-pass"}'`
4. ✅ Создать workspace в NCB панели (вручную через NCB UI)
5. ✅ Создать app_user запись, привязать к workspace через organization_members
6. ✅ Настроить лимиты workspace (salad_minutes_limit, straico_coins_limit и т.д.)
7. ✅ В Lovable — установить `VITE_API_URL=https://transcriber.your-domain.com`

---

## Обновление

```bash
cd /opt/transcriber-saas
git pull
docker compose up -d --build
```

Или в Portainer: Stack → "Pull and redeploy".

---

## Порты

| Порт | Сервис | Примечание |
|------|--------|------------|
| 80 | Caddy | HTTP → HTTPS redirect |
| 443 | Caddy | HTTPS (Let's Encrypt) |
| 3000 | Next.js | Внутренний, доступен только через Caddy |

**Убедись что порты 80 и 443 открыты в firewall VPS.**
