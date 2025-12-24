from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from .database import Base

class StudyProgress(Base):
    __tablename__ = "study_progress"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(100), nullable=False, index=True)  # 科目名（財務会計、管理会計など）
    topic = Column(String(200), nullable=False)  # トピック名
    progress_percent = Column(Float, default=0.0)  # 進捗率（0-100）
    study_hours = Column(Float, default=0.0)  # 学習時間（時間）
    notes = Column(Text, nullable=True)  # メモ
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)  # ToDoのタイトル
    subject = Column(String(100), nullable=True)  # 科目（財務会計、管理会計など）
    due_date = Column(DateTime(timezone=True), nullable=True)  # 日時
    completed = Column(Boolean, default=False)  # 完了/未完了
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)  # 設定キー
    value = Column(Text, nullable=False)  # 設定値（JSON文字列）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

