import os

import pytest

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")


@pytest.fixture()
def client():
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL is not set")

    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    from app.core.config import settings
    from app.db.base import Base
    from app.db.session import get_db
    from app.main import app

    if TEST_DATABASE_URL == settings.database_url:
        pytest.fail("TEST_DATABASE_URL must NOT be the same as DATABASE_URL")

    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    yield TestClient(app)

    app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)
    engine.dispose()
