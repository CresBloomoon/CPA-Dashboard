from sqlalchemy.orm import Session
import logging
from . import models, schemas
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

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

# ----------------------------
# Study time sync (timer)
# ----------------------------

def _date_key_to_range(date_key: str):
    """
    yyyy-MM-dd の日付キーから、その日の [00:00, 24:00) の範囲を返す（ローカルタイム前提）
    """
    day = datetime.strptime(date_key, "%Y-%m-%d")
    start = datetime(day.year, day.month, day.day, 0, 0, 0)
    end = start + timedelta(days=1)
    return start, end

def _get_week_range(date_key: str):
    """
    週開始を月曜(ISO)として、基準日の週 [Mon 00:00, next Mon 00:00) を返す
    """
    day = datetime.strptime(date_key, "%Y-%m-%d")
    # Monday=0 ... Sunday=6
    start = datetime(day.year, day.month, day.day, 0, 0, 0) - timedelta(days=day.weekday())
    end = start + timedelta(days=7)
    return start, end

def _get_or_create_daily_study_progress(db: Session, subject: str, date_key: str):
    """
    topic='学習時間' の日次レコードを、created_at の日付範囲で探してなければ作成する。
    """
    start, end = _date_key_to_range(date_key)
    progress = (
        db.query(models.StudyProgress)
        .filter(models.StudyProgress.subject == subject)
        .filter(models.StudyProgress.topic == "学習時間")
        .filter(models.StudyProgress.created_at >= start)
        .filter(models.StudyProgress.created_at < end)
        .order_by(models.StudyProgress.created_at.desc())
        .first()
    )
    if progress:
        return progress

    db_progress = models.StudyProgress(
        subject=subject,
        topic="学習時間",
        progress_percent=0.0,
        study_hours=0.0,
        notes="(auto) timer sync",
    )
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress

def apply_study_time_total_ms(
    db: Session,
    user_id: str,
    date_key: str,
    subject: str,
    client_session_id: str,
    total_ms: int,
):
    """
    クライアントから送られる累計(total_ms)を基に、差分だけをStudyProgressへ加算する。

    冪等性:
      同一 (user_id, date_key, subject, client_session_id) で last_total_ms を保持し、
      delta_ms = max(total_ms - last_total_ms, 0) のみを加算する。
    """
    sess = (
        db.query(models.StudyTimeSyncSession)
        .filter(models.StudyTimeSyncSession.user_id == user_id)
        .filter(models.StudyTimeSyncSession.date_key == date_key)
        .filter(models.StudyTimeSyncSession.subject == subject)
        .filter(models.StudyTimeSyncSession.client_session_id == client_session_id)
        .first()
    )
    if sess is None:
        sess = models.StudyTimeSyncSession(
            user_id=user_id,
            date_key=date_key,
            subject=subject,
            client_session_id=client_session_id,
            last_total_ms=0,
        )
        db.add(sess)
        db.commit()
        db.refresh(sess)

    last_ms = int(sess.last_total_ms or 0)
    delta_ms = max(int(total_ms) - last_ms, 0)

    # 進捗へ加算（差分があるときだけ）
    if delta_ms > 0:
        progress = _get_or_create_daily_study_progress(db, subject=subject, date_key=date_key)
        progress.study_hours = float(progress.study_hours or 0.0) + (delta_ms / 3_600_000.0)
        sess.last_total_ms = int(total_ms)
        db.commit()
        db.refresh(progress)
        db.refresh(sess)
    else:
        # 差分なしでも last_total_ms は最大値で維持
        if int(total_ms) > last_ms:
            sess.last_total_ms = int(total_ms)
            db.commit()
            db.refresh(sess)

    return int(delta_ms)

def get_study_time_summary_ms(db: Session, user_id: str, date_key: str):
    """
    server(DB)を正として、topic='学習時間' のStudyProgressから今日/今週の合計(ms)を返す。
    """
    day_start, day_end = _date_key_to_range(date_key)
    week_start, week_end = _get_week_range(date_key)

    def _sum_hours(start: datetime, end: datetime) -> float:
        from sqlalchemy import func
        hours = (
            db.query(func.sum(models.StudyProgress.study_hours))
            .filter(models.StudyProgress.topic == "学習時間")
            .filter(models.StudyProgress.created_at >= start)
            .filter(models.StudyProgress.created_at < end)
            .scalar()
        )
        return float(hours or 0.0)

    today_hours = _sum_hours(day_start, day_end)
    week_hours = _sum_hours(week_start, week_end)

    return int(round(today_hours * 3_600_000.0)), int(round(week_hours * 3_600_000.0))

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

def create_todo(db: Session, todo: schemas.TodoCreate):
    """新しいToDoを作成"""
    db_todo = models.Todo(
        title=todo.title,
        subject=todo.subject,
        due_date=todo.due_date,
        project_id=todo.project_id,
        completed=False
    )
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

def update_todo(db: Session, todo_id: int, todo_update: schemas.TodoUpdate):
    """ToDoを更新"""
    db_todo = get_todo(db, todo_id)
    if db_todo is None:
        return None
    
    # Pydantic v2対応: model_dump()を使用
    try:
        if hasattr(todo_update, 'model_dump'):
            # Pydantic v2
            update_data = todo_update.model_dump(exclude_unset=True)
            all_data = todo_update.model_dump(exclude_unset=False)
            fields_set = getattr(todo_update, 'model_fields_set', set())
        else:
            # Pydantic v1
            update_data = todo_update.dict(exclude_unset=True)
            all_data = todo_update.dict(exclude_unset=False)
            fields_set = getattr(todo_update, '__fields_set__', set())
    except Exception as e:
        logger.error(f"Error getting update data: {e}")
        # フォールバック: dict()を使用
        update_data = todo_update.dict(exclude_unset=True) if hasattr(todo_update, 'dict') else {}
        all_data = todo_update.dict(exclude_unset=False) if hasattr(todo_update, 'dict') else {}
        fields_set = set()
    
    logger.info(f"update_todo: todo_id={todo_id}, update_data before={update_data}, all_data={all_data}, fields_set={fields_set}, project_id in update_data={'project_id' in update_data}, project_id in all_data={'project_id' in all_data}, project_id in fields_set={'project_id' in fields_set}")
    
    # project_idがリクエストに明示的に含まれている場合のみ更新する
    # fields_setに含まれている場合のみ、project_idがリクエストに含まれていることを意味する
    # all_dataには、リクエストに含まれていないフィールドもNoneとして含まれるため、使用しない
    if 'project_id' in fields_set:
        # fields_setに含まれている場合は必ず更新（Noneでも）
        update_data['project_id'] = todo_update.project_id
        logger.info(f"Setting project_id from fields_set to: {todo_update.project_id}")
    elif 'project_id' in update_data:
        # update_dataに既に含まれている場合（exclude_unset=Trueでも含まれる場合）
        # これは、リクエストにproject_idが含まれていることを意味する
        logger.info(f"project_id already in update_data: {update_data['project_id']}")
    # all_dataから取得する処理は削除（リクエストに含まれていないフィールドもNoneとして含まれるため）
    
    logger.info(f"update_todo: final update_data={update_data}")
    
    for field, value in update_data.items():
        setattr(db_todo, field, value)
    
    db.commit()
    db.refresh(db_todo)
    logger.info(f"update_todo: after update, db_todo.project_id={db_todo.project_id}")
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
    """科目名を更新し、関連するToDo、StudyProgress、ReviewTimingも更新"""
    # ToDoの科目名を更新
    todos = db.query(models.Todo).filter(models.Todo.subject == old_name).all()
    for todo in todos:
        todo.subject = new_name
    
    # StudyProgressの科目名を更新
    progress_list = db.query(models.StudyProgress).filter(models.StudyProgress.subject == old_name).all()
    for progress in progress_list:
        progress.subject = new_name
    
    # ReviewTiming設定の科目名を更新
    import json
    review_timing_setting = db.query(models.Settings).filter(models.Settings.key == 'review_timing').first()
    if review_timing_setting:
        try:
            review_timings = json.loads(review_timing_setting.value)
            if isinstance(review_timings, list):
                updated = False
                for timing in review_timings:
                    if isinstance(timing, dict) and timing.get('subject_name') == old_name:
                        timing['subject_name'] = new_name
                        updated = True
                if updated:
                    review_timing_setting.value = json.dumps(review_timings)
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Error parsing review_timing setting: {e}")
    
    # Projectにはsubject属性がないため、更新不要
    
    db.commit()
    return len(todos) + len(progress_list)

# プロジェクトCRUD操作
def get_project(db: Session, project_id: int):
    """IDでプロジェクトを取得"""
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_all_projects(db: Session, skip: int = 0, limit: int = 100):
    """すべてのプロジェクトを取得（期限日の昇順）"""
    return db.query(models.Project).order_by(
        models.Project.due_date.asc().nulls_last(),
        models.Project.created_at.desc()
    ).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate):
    """新しいプロジェクトを作成"""
    db_project = models.Project(**project.dict())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    """プロジェクトを更新"""
    db_project = get_project(db, project_id)
    if db_project is None:
        return None
    
    update_data = project_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    db.commit()
    db.refresh(db_project)
    return db_project

def delete_project(db: Session, project_id: int):
    """プロジェクトを削除（関連するToDoのproject_idをnullに設定）"""
    db_project = get_project(db, project_id)
    if db_project is None:
        return None
    
    # 関連するToDoのproject_idをnullに設定
    todos = db.query(models.Todo).filter(models.Todo.project_id == project_id).all()
    for todo in todos:
        todo.project_id = None
    
    db.delete(db_project)
    db.commit()
    return db_project

def complete_project_and_todos(db: Session, project_id: int):
    """プロジェクトを完了し、紐づく未完了ToDoも一括で完了にする"""
    db_project = get_project(db, project_id)
    if db_project is None:
        return None

    # 既に完了済みでも、未完了ToDoが残っていれば完了に揃える
    db_project.completed = True

    updated_todos = (
        db.query(models.Todo)
        .filter(models.Todo.project_id == project_id)
        .filter(models.Todo.completed.is_(False))
        .update({models.Todo.completed: True}, synchronize_session=False)
    )

    db.commit()
    db.refresh(db_project)
    return db_project, int(updated_todos or 0)

