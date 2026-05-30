from backend.settings import Settings


def test_cors_origins_parses_comma_separated_env(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000")
    settings = Settings()
    assert settings.cors_origins == ["http://localhost:3000", "http://localhost:8000"]
