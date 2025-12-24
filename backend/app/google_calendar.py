"""Google Calendar API連携用のモジュール"""
import os
from datetime import datetime, timedelta
from typing import Optional
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Google Calendar APIのスコープ
SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_credentials() -> Optional[Credentials]:
    """保存された認証情報を取得"""
    creds = None
    token_path = os.getenv('GOOGLE_CALENDAR_TOKEN_PATH', 'token.json')
    credentials_path = os.getenv('GOOGLE_CALENDAR_CREDENTIALS_PATH', 'credentials.json')
    
    # 既存のトークンを読み込む
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    # トークンが無効または存在しない場合
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            # トークンをリフレッシュ
            creds.refresh(Request())
        else:
            # 認証フローを開始（初回のみ）
            if not os.path.exists(credentials_path):
                return None
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        
        # トークンを保存
        with open(token_path, 'w') as token:
            token.write(creds.to_json())
    
    return creds

def create_calendar_event(
    title: str,
    due_date: datetime,
    subject: Optional[str] = None,
    description: Optional[str] = None,
    calendar_id: str = 'primary'
) -> Optional[str]:
    """
    Googleカレンダーにイベントを作成
    
    Args:
        title: イベントのタイトル
        due_date: 期限日時
        subject: 科目（オプション）
        description: 説明（オプション）
    
    Returns:
        作成されたイベントのID、失敗時はNone
    """
    try:
        creds = get_credentials()
        if not creds:
            return None
        
        service = build('calendar', 'v3', credentials=creds)
        
        # イベントのタイトルを作成
        event_title = f"【{subject}】{title}" if subject else title
        
        # イベントの説明を作成
        event_description = description or ""
        if subject:
            event_description = f"科目: {subject}\n" + event_description
        
        # イベントの開始時刻と終了時刻を設定（終日イベントとして設定）
        start_date = due_date.date()
        end_date = start_date + timedelta(days=1)
        
        event = {
            'summary': event_title,
            'description': event_description,
            'start': {
                'date': start_date.isoformat(),
                'timeZone': 'Asia/Tokyo',
            },
            'end': {
                'date': end_date.isoformat(),
                'timeZone': 'Asia/Tokyo',
            },
        }
        
        # イベントを作成
        created_event = service.events().insert(
            calendarId=calendar_id,
            body=event
        ).execute()
        
        return created_event.get('id')
    
    except HttpError as error:
        print(f'Google Calendar API error: {error}')
        return None
    except Exception as error:
        print(f'Unexpected error: {error}')
        return None

