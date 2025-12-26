"""
データベースに新しいカラムを追加するマイグレーションスクリプト
"""
import sqlite3
import os

# データベースファイルのパス
DB_PATH = os.path.join(os.path.dirname(__file__), 'cpa_dashboard.db')

def migrate():
    """study_progressテーブルに新しいカラムを追加"""
    if not os.path.exists(DB_PATH):
        print(f"データベースファイルが見つかりません: {DB_PATH}")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # 既存のカラムを確認
        cursor.execute("PRAGMA table_info(study_progress)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # 新しいカラムを追加（存在しない場合のみ）
        if 'actual_time' not in columns:
            cursor.execute("ALTER TABLE study_progress ADD COLUMN actual_time REAL")
            print("[OK] actual_timeカラムを追加しました")
        else:
            print("[SKIP] actual_timeカラムは既に存在します")
        
        if 'target_time' not in columns:
            cursor.execute("ALTER TABLE study_progress ADD COLUMN target_time REAL")
            print("[OK] target_timeカラムを追加しました")
        else:
            print("[SKIP] target_timeカラムは既に存在します")
        
        if 'variance_reason' not in columns:
            cursor.execute("ALTER TABLE study_progress ADD COLUMN variance_reason VARCHAR(200)")
            print("[OK] variance_reasonカラムを追加しました")
        else:
            print("[SKIP] variance_reasonカラムは既に存在します")
        
        if 'theory_calculation_ratio' not in columns:
            cursor.execute("ALTER TABLE study_progress ADD COLUMN theory_calculation_ratio REAL")
            print("[OK] theory_calculation_ratioカラムを追加しました")
        else:
            print("[SKIP] theory_calculation_ratioカラムは既に存在します")
        
        conn.commit()
        print("\nマイグレーションが完了しました！")
        
    except sqlite3.Error as e:
        print(f"エラーが発生しました: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()

