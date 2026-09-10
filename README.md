# University Merch API

Secure REST API for university merchandise management and student ordering.

## Stack

React, Vite, Node.js 22, TypeScript, Express, PostgreSQL, Prisma, Microsoft Entra ID, Azure Key Vault, Gemini, Docker, and Nginx.

## Local setup

1. Copy `.env.example` to `.env` and replace the development-only placeholders.
2. Install dependencies:

   ```sh
   npm ci
   ```

3. Start PostgreSQL:

   ```sh
   docker compose up -d database
   ```

4. Apply migrations and seed:

   ```sh
   npm run prisma:deploy
   npm run prisma:seed
   ```

5. Start the API:

   ```sh
   npm run dev
   ```

6. Check `http://localhost:3000/project/health`.

7. Copy `frontend/.env.example` to `frontend/.env.local`, configure the Entra public client, and start the storefront:

   ```sh
   npm run frontend:dev
   ```

8. Open `http://localhost:5173/store/`.

The local API can also be started with `docker compose up --build`, after applying migrations.

## Authentication

Protected routes accept Microsoft Entra access tokens:

```http
Authorization: Bearer <access-token>
```

Create Entra app roles matching `ENTRA_STUDENT_ROLE` and `ENTRA_STAFF_ROLE`, assign users or groups, and request an access token for `ENTRA_AUDIENCE`. The API validates signature, issuer, audience, expiry, and role claims. Client-provided roles are ignored.

## Main routes

- `GET /project/health`
- `GET /project/products`
- `GET /project/products/:id`
- `POST /project/products` (`STAFF`)
- `PATCH /project/products/:id` (`STAFF`)
- `DELETE /project/products/:id` (`STAFF`)
- `POST /project/products/:id/generate-description` (`STAFF`)
- `POST /project/orders` (`STUDENT`)
- `GET /project/orders/me` (`STUDENT`)
- `GET /project/orders/:id` (owner or `STAFF`)

See `docs/API.md` for the contract.

## Verification

```sh
npm run prisma:generate
npm run lint
npm run typecheck
npm test
npm run build
npm run frontend:build
```

Integration tests require PostgreSQL and use `TEST_DATABASE_URL`.

## Production

Production secrets are loaded from Azure Key Vault. The vault must contain:

- `database-url`
- `gemini-api-key`

Set non-secret Entra and runtime configuration in the deployment environment. Build the API image from the `runtime` target, the storefront from `frontend-build`, and run migrations once per release using the `migrate` target. Copy the storefront assets to `/var/www/university-merch-store/`. Add `deploy/nginx/university-merch.conf` to the existing HTTPS server block without changing `/content` or `/api`.

See `.cursor/guides/deployment.md` and `docs/SECURITY.md` before deploying.
