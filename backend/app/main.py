from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import logging

from .database import engine, get_db, Base
from . import models, schemas, crud

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# データベーステーブルの作成
Base.metadata.create_all(bind=engine)

# 初期データの投入（設定が存在しない場合のみ）
def init_default_settings():
    """デフォルトの設定を投入"""
    db = next(get_db())
    try:
        import json
        # 科目リストの設定をチェック
        subjects_setting = crud.get_setting(db, 'subjects')
        if not subjects_setting:
            # デフォルトの科目リスト（フロントエンドのSettingsView.tsxと一致させる）
            default_subjects = [
                {"id": 1, "name": "財務会計", "color": "#4285F4"},
                {"id": 2, "name": "管理会計", "color": "#EA4335"},
                {"id": 3, "name": "監査論", "color": "#FBBC04"},
                {"id": 4, "name": "企業法", "color": "#34A853"},
                {"id": 5, "name": "租税法", "color": "#FF6D01"},
            ]
            crud.create_or_update_setting(db, 'subjects', json.dumps(default_subjects, ensure_ascii=False))
            logger.info("デフォルトの科目リストを投入しました")
    except Exception as e:
        logger.error(f"初期データの投入に失敗しました: {e}")
    finally:
        db.close()

# アプリケーション起動時に初期データを投入
init_default_settings()

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
    return crud.create_todo(db, todo)

@app.put("/api/todos/{todo_id}", response_model=schemas.TodoResponse)
async def update_todo(
    todo_id: int,
    todo_update: schemas.TodoUpdate,
    db: Session = Depends(get_db)
):
    """ToDoを更新"""
    # デバッグ: リクエストボディの内容をログ出力
    try:
        # Pydantic v2対応
        if hasattr(todo_update, 'model_dump'):
            all_data = todo_update.model_dump(exclude_unset=False)
            fields_set = getattr(todo_update, 'model_fields_set', set())
        else:
            all_data = todo_update.dict(exclude_unset=False)
            fields_set = getattr(todo_update, '__fields_set__', set())
        
        logger.info(f"Update todo {todo_id}: all_data={all_data}, fields_set={fields_set}, project_id in all_data={'project_id' in all_data}, project_id in fields_set={'project_id' in fields_set}, project_id value={all_data.get('project_id')}")
    except Exception as e:
        logger.error(f"Error logging update request: {e}")
    
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

# プロジェクトのCRUDエンドポイント
@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
async def get_all_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """すべてのプロジェクトを取得"""
    return crud.get_all_projects(db, skip=skip, limit=limit)

@app.get("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """IDでプロジェクトを取得"""
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return project

@app.post("/api/projects", response_model=schemas.ProjectResponse, status_code=201)
async def create_project(project: schemas.ProjectCreate, db: Session = Depends(get_db)):
    """新しいプロジェクトを作成"""
    return crud.create_project(db, project)

@app.put("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
async def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    db: Session = Depends(get_db)
):
    """プロジェクトを更新"""
    project = crud.update_project(db, project_id, project_update)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return project

@app.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """プロジェクトを削除"""
    project = crud.delete_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="プロジェクトが見つかりません")
    return None

