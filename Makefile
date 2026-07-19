.PHONY: api-install api-dev api-build db-up db-migrate mobile-get mobile-codegen mobile-test verify
api-install:
	cd apps/api && npm ci
api-dev:
	cd apps/api && npm run start:dev
api-build:
	cd apps/api && npm run build
db-up:
	docker compose up -d postgres redis
db-migrate:
	cd apps/api && npx prisma migrate deploy
mobile-get:
	cd apps/mobile && flutter pub get
mobile-codegen:
	cd apps/mobile && dart run build_runner build --delete-conflicting-outputs
mobile-test:
	cd apps/mobile && flutter analyze && flutter test
verify: api-build mobile-test
