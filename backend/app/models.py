from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
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
    # 分析機能のための追加フィールド
    actual_time = Column(Float, nullable=True)  # 実際にかかった時間（時間）
    target_time = Column(Float, nullable=True)  # 目標としていた標準時間（時間）
    variance_reason = Column(String(200), nullable=True)  # 差異の原因（「集中力欠如」「難易度高」など）
    theory_calculation_ratio = Column(Float, nullable=True)  # 理論と計算の比率（0.0-1.0）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(500), nullable=False)  # プロジェクト名（例：租税法レギュラー答練1回目）
    due_date = Column(DateTime(timezone=True), nullable=True)  # プロジェクトの期限日
    description = Column(Text, nullable=True)  # 説明
    completed = Column(Boolean, default=False)  # 完了/未完了
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Todo(Base):
    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)  # ToDoのタイトル
    subject = Column(String(100), nullable=True)  # 科目（財務会計、管理会計など）
    due_date = Column(DateTime(timezone=True), nullable=True)  # 日時
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)  # プロジェクトID
    completed = Column(Boolean, default=False)  # 完了/未完了
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # リレーションシップ
    project = relationship("Project", backref="todos")

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)  # 設定キー
    value = Column(Text, nullable=False)  # 設定値（JSON文字列）
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

