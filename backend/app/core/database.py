from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings


def _build_engine():
    url = settings.database_url
    kwargs: dict = {"pool_pre_ping": True}

    # Supabase (and other hosted Postgres providers) require SSL.
    # Detect by hostname so local dev is never affected.
    _host = url.split("@")[-1].split("/")[0].split(":")[0] if "@" in url else ""
    _is_supabase = "supabase.co" in _host or "supabase.com" in _host

    if _is_supabase:
        kwargs["connect_args"] = {"sslmode": "require"}
        # Supabase session pooler (port 5432) supports named prepared statements,
        # but transaction pooler (port 6543, pgbouncer) does not.
        # Detect transaction pooler by port and disable server-side cursors.
        _port = url.split("@")[-1].split(":")[1].split("/")[0] if ":" in url.split("@")[-1] else "5432"
        if _port == "6543":
            # pgbouncer transaction mode: disable prepared statement caching
            kwargs["connect_args"]["options"] = "-c standard_conforming_strings=on"
            kwargs["execution_options"] = {"no_parameters": True}

    return create_engine(url, **kwargs)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
