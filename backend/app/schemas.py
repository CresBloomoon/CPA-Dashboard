from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class StudyProgressBase(BaseModel):
    subject: str = Field(..., description="科目名")
    topic: str = Field(..., description="トピック名")
    progress_percent: float = Field(0.0, ge=0.0, le=100.0, description="進捗率（0-100）")
    study_hours: float = Field(0.0, ge=0.0, description="学習時間（時間）")
    notes: Optional[str] = Field(None, description="メモ")

class StudyProgressCreate(StudyProgressBase):
    pass

class StudyProgressUpdate(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    study_hours: Optional[float] = Field(None, ge=0.0)
    notes: Optional[str] = None

class StudyProgressResponse(StudyProgressBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ToDoスキーマ
class TodoBase(BaseModel):
    title: str = Field(..., description="ToDoのタイトル")
    subject: Optional[str] = Field(None, description="科目")
    due_date: datetime = Field(..., description="期限（日付）")
    completed: bool = Field(False, description="完了/未完了")

class TodoCreate(BaseModel):
    title: str = Field(..., description="ToDoのタイトル")
    subject: Optional[str] = Field(None, description="科目")
    due_date: datetime = Field(..., description="期限（日付）")

class TodoUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    due_date: Optional[datetime] = None
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

