import os
import logging

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)


def _mask_database_url(url: str) -> str:
    # パスワードをログに出さない
    try:
        from sqlalchemy.engine.url import make_url

        u = make_url(url)
        if u.password:
            u = u.set(password="***")
        return str(u)
    except Exception:
        # パースできない場合はそのまま（ただし機密が含まれる可能性があるので極力避ける）
        return "<unparseable DATABASE_URL>"


SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError("DATABASE_URL が未設定です。PostgreSQL 接続文字列を設定してください。")

# 起動時に使用している DATABASE_URL をログ出力（パスワードはマスク）
if not logging.getLogger().handlers:
    # 直接このモジュールを呼ぶケースでもログが出るよう最低限設定
    logging.basicConfig(level=logging.INFO)
logger.info(f"[DB] DATABASE_URL={_mask_database_url(SQLALCHEMY_DATABASE_URL)}")

# エンジン設定（PostgreSQL想定）
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """DBセッションの依存性注入"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

