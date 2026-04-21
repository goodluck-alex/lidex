-- One-time: align _prisma_migrations with repo folder name (same SQL was applied under old name).
UPDATE "_prisma_migrations"
SET "migration_name" = '20260415120001_listed_token_display_meta'
WHERE "migration_name" = '20260403120000_listed_token_display_meta';
