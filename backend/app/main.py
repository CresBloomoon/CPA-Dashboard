from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from .database import engine, get_db, Base
from . import models, schemas, crud

# データベーステーブルの作成
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CPA Dashboard API",
    description="公認会計士の勉強進捗管理API",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://frontend:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "CPA Dashboard API"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

# 勉強進捗のCRUDエンドポイント
@app.get("/api/progress", response_model=List[schemas.StudyProgressResponse])
async def get_all_progress(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """すべての勉強進捗を取得"""
    return crud.get_all_study_progress(db, skip=skip, limit=limit)

@app.get("/api/progress/{progress_id}", response_model=schemas.StudyProgressResponse)
async def get_progress(progress_id: int, db: Session = Depends(get_db)):
    """IDで進捗を取得"""
    progress = crud.get_study_progress(db, progress_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="進捗が見つかりません")
    return progress

@app.post("/api/progress", response_model=schemas.StudyProgressResponse, status_code=201)
async def create_progress(progress: schemas.StudyProgressCreate, db: Session = Depends(get_db)):
    """新しい進捗を作成"""
    return crud.create_study_progress(db, progress)

@app.put("/api/progress/{progress_id}", response_model=schemas.StudyProgressResponse)
async def update_progress(
    progress_id: int,
    progress_update: schemas.StudyProgressUpdate,
    db: Session = Depends(get_db)
):
    """進捗を更新"""
    progress = crud.update_study_progress(db, progress_id, progress_update)
    if progress is None:
        raise HTTPException(status_code=404, detail="進捗が見つかりません")
    return progress

@app.delete("/api/progress/{progress_id}", status_code=204)
async def delete_progress(progress_id: int, db: Session = Depends(get_db)):
    """進捗を削除"""
    progress = crud.delete_study_progress(db, progress_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="進捗が見つかりません")
    return None

@app.get("/api/progress/subject/{subject}", response_model=List[schemas.StudyProgressResponse])
async def get_progress_by_subject(subject: str, db: Session = Depends(get_db)):
    """科目で進捗を取得"""
    return crud.get_study_progress_by_subject(db, subject)

@app.get("/api/summary")
async def get_summary(db: Session = Depends(get_db)):
    """科目ごとの集計を取得"""
    return crud.get_subjects_summary(db)

# ToDoのCRUDエンドポイント
@app.get("/api/todos", response_model=List[schemas.TodoResponse])
async def get_all_todos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """すべてのToDoを取得"""
    return crud.get_all_todos(db, skip=skip, limit=limit)

@app.get("/api/todos/{todo_id}", response_model=schemas.TodoResponse)
async def get_todo(todo_id: int, db: Session = Depends(get_db)):
    """IDでToDoを取得"""
    todo = crud.get_todo(db, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="ToDoが見つかりません")
    return todo

@app.post("/api/todos", response_model=schemas.TodoResponse, status_code=201)
async def create_todo(todo: schemas.TodoCreate, db: Session = Depends(get_db)):
    """新しいToDoを作成"""
    # Googleカレンダー連携の設定を確認
    sync_to_google = False
    calendar_id = 'primary'  # デフォルトはプライマリカレンダー
    try:
        google_calendar_setting = crud.get_setting(db, 'google_calendar_enabled')
        if google_calendar_setting and google_calendar_setting.value.lower() == 'true':
            sync_to_google = True
            # カレンダーIDの設定を確認
            calendar_id_setting = crud.get_setting(db, 'google_calendar_id')
            if calendar_id_setting and calendar_id_setting.value:
                calendar_id = calendar_id_setting.value
    except Exception:
        pass
    
    return crud.create_todo(db, todo, sync_to_google_calendar=sync_to_google, calendar_id=calendar_id)

@app.put("/api/todos/{todo_id}", response_model=schemas.TodoResponse)
async def update_todo(
    todo_id: int,
    todo_update: schemas.TodoUpdate,
    db: Session = Depends(get_db)
):
    """ToDoを更新"""
    todo = crud.update_todo(db, todo_id, todo_update)
    if todo is None:
        raise HTTPException(status_code=404, detail="ToDoが見つかりません")
    return todo

@app.delete("/api/todos/{todo_id}", status_code=204)
async def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    """ToDoを削除"""
    todo = crud.delete_todo(db, todo_id)
    if todo is None:
        raise HTTPException(status_code=404, detail="ToDoが見つかりません")
    return None

# 設定のエンドポイント
@app.get("/api/settings", response_model=List[schemas.SettingsResponse])
async def get_all_settings(db: Session = Depends(get_db)):
    """すべての設定を取得"""
    return crud.get_all_settings(db)

@app.get("/api/settings/{key}", response_model=schemas.SettingsResponse)
async def get_setting(key: str, db: Session = Depends(get_db)):
    """キーで設定を取得"""
    setting = crud.get_setting(db, key)
    if setting is None:
        raise HTTPException(status_code=404, detail="設定が見つかりません")
    return setting

@app.post("/api/settings", response_model=schemas.SettingsResponse, status_code=201)
async def create_or_update_setting(
    setting_data: schemas.SettingsCreate,
    db: Session = Depends(get_db)
):
    """設定を作成または更新"""
    return crud.create_or_update_setting(db, setting_data.key, setting_data.value)

@app.put("/api/subjects/update-name", response_model=schemas.SubjectUpdateResponse)
async def update_subject_name(
    request: schemas.SubjectUpdateRequest,
    db: Session = Depends(get_db)
):
    """科目名を更新し、関連するToDoとStudyProgressも更新"""
    updated_count = crud.update_subject_name(db, request.old_name, request.new_name)
    return schemas.SubjectUpdateResponse(updated_count=updated_count)

