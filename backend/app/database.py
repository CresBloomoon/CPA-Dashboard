from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# SQLiteデータベースのパス
# 環境変数DATABASE_URLが設定されている場合はそれを使用、なければデフォルトパスを使用
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cpa_dashboard.db")

# SQLite用のエンジン設定
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite用
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# データベースセッションの依存性注入
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

