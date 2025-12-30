from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class StudyProgressBase(BaseModel):
    subject: str = Field(..., description="科目名")
    topic: str = Field(..., description="トピック名")
    progress_percent: float = Field(0.0, ge=0.0, le=100.0, description="進捗率（0-100）")
    study_hours: float = Field(0.0, ge=0.0, description="学習時間（時間）")
    notes: Optional[str] = Field(None, description="メモ")
    # 分析機能のための追加フィールド
    actual_time: Optional[float] = Field(None, ge=0.0, description="実際にかかった時間（時間）")
    target_time: Optional[float] = Field(None, ge=0.0, description="目標としていた標準時間（時間）")
    variance_reason: Optional[str] = Field(None, description="差異の原因（「集中力欠如」「難易度高」など）")
    theory_calculation_ratio: Optional[float] = Field(None, ge=0.0, le=1.0, description="理論と計算の比率（0.0-1.0）")

class StudyProgressCreate(StudyProgressBase):
    pass

class StudyProgressUpdate(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    study_hours: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None
    actual_time: Optional[float] = Field(None, ge=0.0)
    target_time: Optional[float] = Field(None, ge=0.0)
    variance_reason: Optional[str] = None
    theory_calculation_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)

class StudyProgressResponse(StudyProgressBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# プロジェクトスキーマ
class ProjectBase(BaseModel):
    name: str = Field(..., description="プロジェクト名")
    due_date: Optional[datetime] = Field(None, description="プロジェクトの期限日")
    description: Optional[str] = Field(None, description="説明")

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    due_date: Optional[datetime] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: int
    completed: bool = Field(False, description="完了/未完了")
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectCompleteResponse(BaseModel):
    project: ProjectResponse
    updated_todos: int = Field(..., description="完了状態に更新されたToDo件数")

# ToDoスキーマ
class TodoBase(BaseModel):
    title: str = Field(..., description="ToDoのタイトル")
    subject: Optional[str] = Field(None, description="科目")
    due_date: datetime = Field(..., description="期限（日付）")
    project_id: Optional[int] = Field(None, description="プロジェクトID")
    completed: bool = Field(False, description="完了/未完了")

class TodoCreate(BaseModel):
    title: str = Field(..., description="ToDoのタイトル")
    subject: Optional[str] = Field(None, description="科目")
    due_date: datetime = Field(..., description="期限（日付）")
    project_id: Optional[int] = Field(None, description="プロジェクトID")

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[datetime] = None
    project_id: Optional[int] = None
    completed: Optional[bool] = None

class TodoResponse(TodoBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 設定スキーマ
class SettingsBase(BaseModel):
    key: str = Field(..., description="設定キー")
    value: str = Field(..., description="設定値（JSON文字列）")

class SettingsCreate(BaseModel):
    key: str = Field(..., description="設定キー")
    value: str = Field(..., description="設定値（JSON文字列）")

class SettingsUpdate(BaseModel):
    value: str = Field(..., description="設定値（JSON文字列）")

class SettingsResponse(SettingsBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# 科目名更新スキーマ
class SubjectUpdateRequest(BaseModel):
    old_name: str = Field(..., description="古い科目名")
    new_name: str = Field(..., description="新しい科目名")

class SubjectUpdateResponse(BaseModel):
    updated_count: int = Field(..., description="更新されたレコード数")

