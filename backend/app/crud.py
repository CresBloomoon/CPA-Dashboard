from sqlalchemy.orm import Session
from . import models, schemas

def get_study_progress(db: Session, progress_id: int):
    """IDで進捗を取得"""
    return db.query(models.StudyProgress).filter(models.StudyProgress.id == progress_id).first()

def get_all_study_progress(db: Session, skip: int = 0, limit: int = 100):
    """すべての進捗を取得"""
    return db.query(models.StudyProgress).offset(skip).limit(limit).all()

def get_study_progress_by_subject(db: Session, subject: str):
    """科目で進捗を取得"""
    return db.query(models.StudyProgress).filter(models.StudyProgress.subject == subject).all()

def create_study_progress(db: Session, progress: schemas.StudyProgressCreate):
    """新しい進捗を作成"""
    db_progress = models.StudyProgress(**progress.dict())
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress

def update_study_progress(db: Session, progress_id: int, progress_update: schemas.StudyProgressUpdate):
    """進捗を更新"""
    db_progress = get_study_progress(db, progress_id)
    if db_progress is None:
        return None
    
    update_data = progress_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_progress, field, value)
    
    db.commit()
    db.refresh(db_progress)
    return db_progress

def delete_study_progress(db: Session, progress_id: int):
    """進捗を削除"""
    db_progress = get_study_progress(db, progress_id)
    if db_progress is None:
        return None
    
    db.delete(db_progress)
    db.commit()
    return db_progress

def get_subjects_summary(db: Session):
    """科目ごとの集計を取得"""
    from sqlalchemy import func
    
    results = db.query(
        models.StudyProgress.subject,
        func.count(models.StudyProgress.id).label('count'),
        func.sum(models.StudyProgress.study_hours).label('total_hours'),
        func.avg(models.StudyProgress.progress_percent).label('avg_progress')
    ).group_by(models.StudyProgress.subject).all()
    
    return [
        {
            "subject": result.subject,
            "count": result.count,
            "total_hours": float(result.total_hours or 0),
            "avg_progress": float(result.avg_progress or 0)
        }
        for result in results
    ]

# ToDo CRUD操作
def get_todo(db: Session, todo_id: int):
    """IDでToDoを取得"""
    return db.query(models.Todo).filter(models.Todo.id == todo_id).first()

def get_all_todos(db: Session, skip: int = 0, limit: int = 100):
    """すべてのToDoを取得（未完了を先に、作成日時の降順）"""
    return db.query(models.Todo).order_by(
        models.Todo.completed.asc(),
        models.Todo.created_at.desc()
    ).offset(skip).limit(limit).all()

def create_todo(db: Session, todo: schemas.TodoCreate, sync_to_google_calendar: bool = False, calendar_id: str = 'primary'):
    """新しいToDoを作成"""
    db_todo = models.Todo(
        title=todo.title,
        subject=todo.subject,
        due_date=todo.due_date,
        completed=False
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    
    # Googleカレンダーに同期する場合
    if sync_to_google_calendar and todo.due_date:
        try:
            from . import google_calendar
            google_calendar.create_calendar_event(
                title=todo.title,
                due_date=todo.due_date,
                subject=todo.subject,
                calendar_id=calendar_id
            )
        except Exception as e:
            # Googleカレンダーへの同期に失敗しても、ToDoの作成は成功とする
            print(f"Failed to sync to Google Calendar: {e}")
    
    return db_todo

def update_todo(db: Session, todo_id: int, todo_update: schemas.TodoUpdate):
    """ToDoを更新"""
    db_todo = get_todo(db, todo_id)
    if db_todo is None:
        return None
    
    update_data = todo_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_todo, field, value)
    
    db.commit()
    db.refresh(db_todo)
    return db_todo

def delete_todo(db: Session, todo_id: int):
    """ToDoを削除"""
    db_todo = get_todo(db, todo_id)
    if db_todo is None:
        return None
    
    db.delete(db_todo)
    db.commit()
    return db_todo

# 設定CRUD操作
def get_setting(db: Session, key: str):
    """キーで設定を取得"""
    return db.query(models.Settings).filter(models.Settings.key == key).first()

def get_all_settings(db: Session):
    """すべての設定を取得"""
    return db.query(models.Settings).all()

def create_or_update_setting(db: Session, key: str, value: str):
    """設定を作成または更新"""
    setting = get_setting(db, key)
    if setting:
        setting.value = value
        db.commit()
        db.refresh(setting)
        return setting
    else:
        db_setting = models.Settings(key=key, value=value)
        db.add(db_setting)
        db.commit()
        db.refresh(db_setting)
        return db_setting

def update_subject_name(db: Session, old_name: str, new_name: str):
    """科目名を更新し、関連するToDoとStudyProgressも更新"""
    # ToDoの科目名を更新
    todos = db.query(models.Todo).filter(models.Todo.subject == old_name).all()
    for todo in todos:
        todo.subject = new_name
    
    # StudyProgressの科目名を更新
    progress_list = db.query(models.StudyProgress).filter(models.StudyProgress.subject == old_name).all()
    for progress in progress_list:
        progress.subject = new_name
    
    db.commit()
    return len(todos) + len(progress_list)

