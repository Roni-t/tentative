.PHONY: up down restart test build seed logs

up:
	docker compose up --build -d

down:
	docker compose down

restart:
	docker compose down
	docker compose up --build -d

test:
	docker compose exec backend pytest

logs:
	docker compose logs -f

seed:
	docker compose exec backend python -c "from app.database import SessionLocal; from app.seed import seed_database; db = SessionLocal(); seed_database(db); db.close()"
