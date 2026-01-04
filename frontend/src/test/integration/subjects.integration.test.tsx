import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DashboardSummaryResponse, Settings, Subject, Todo } from '../../api/types';
import { TimerProvider } from '../../features/timer/hooks/TimerContext';
import App from '../../App';
import { DEFAULT_SUBJECTS } from '../../config/subjects';

// ---- API mocks ----
vi.mock('../../api/api', () => {
  return {
    studyProgressApi: {
      getAll: vi.fn(),
      getSummary: vi.fn(),
    },
    todoApi: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    projectApi: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    settingsApi: {
      getAll: vi.fn(),
      getByKey: vi.fn(),
      createOrUpdate: vi.fn(),
      updateSubjectName: vi.fn(),
    },
  };
});

import { projectApi, settingsApi, studyProgressApi, todoApi } from '../../api/api';

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function makeSettingsSubjects(subjects: Subject[]): Settings[] {
  const now = new Date().toISOString();
  return [
    {
      id: 1,
      key: 'subjects',
      value: JSON.stringify(subjects),
      created_at: now,
      updated_at: now,
    },
  ];
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const now = new Date().toISOString();
  return {
    id: 1,
    title: 'テストTODO',
    subject: DEFAULT_SUBJECTS[0].name,
    due_date: now,
    project_id: undefined,
    completed: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

async function renderApp() {
  const user = userEvent.setup();
  render(
    <TimerProvider>
      <App />
    </TimerProvider>
  );

  await waitForElementToBeRemoved(() => screen.getByText('読み込み中...'));
  return { user };
}

function makeDashboardSummary(): DashboardSummaryResponse {
  const today = new Date().toLocaleDateString('sv-SE');
  return {
    user_id: 'default',
    date_key: today,
    today_hours: 0,
    week_hours: 0,
    week_daily: [],
    week_daily_by_subject: [],
    streak: { current: 0, longest: 0, active_dates: [], active_hours_by_date: {} },
    subjects: [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('科目（id/name/color）の統合反映', () => {
  it('DBから取得した科目のcolorが Timer / Reminder / Project に一貫して反映される（DOM styleで検証）', async () => {
    const subjects = [
      { id: 101, name: '財務会計論', color: '#4285F4' },
      { id: 102, name: '管理会計論', color: '#EA4335' },
    ] satisfies Subject[];

    vi.mocked(settingsApi.getAll).mockResolvedValue(makeSettingsSubjects(subjects));
    vi.mocked(studyProgressApi.getAll).mockResolvedValue([]);
    vi.mocked(studyProgressApi.getSummary).mockResolvedValue(makeDashboardSummary());
    vi.mocked(projectApi.getAll).mockResolvedValue([]);
    vi.mocked(todoApi.getAll).mockResolvedValue([makeTodo({ subject: subjects[0].name })]);

    const { user } = await renderApp();

    // ---- Timer ----
    await user.click(screen.getByRole('button', { name: '学習時間' }));
    const timerSubjectButton = screen.getByRole('button', { name: /科目を選択/ });
    await user.click(timerSubjectButton);

    const timerOption = screen.getByRole('button', { name: subjects[0].name });
    const timerOptionDot = timerOption.querySelector('span.w-3.h-3.rounded-full') as HTMLElement | null;
    expect(timerOptionDot).not.toBeNull();
    expect(timerOptionDot).toHaveStyle({ backgroundColor: hexToRgb(subjects[0].color) });

    await user.click(timerOption);

    // アニメーション都合で同名ボタンが一瞬共存するため、セレクタ側（rounded-full）を優先して特定する
    const timerCandidates = screen.getAllByRole('button', { name: subjects[0].name });
    const selectedTimerSubjectButton =
      timerCandidates.find((b) => (b as HTMLElement).className.includes('rounded-full')) ?? timerCandidates[0];
    const selectedTimerDot = (selectedTimerSubjectButton as HTMLElement).querySelector('span.w-3.h-3.rounded-full') as HTMLElement | null;
    expect(selectedTimerDot).not.toBeNull();
    expect(selectedTimerDot).toHaveStyle({ backgroundColor: hexToRgb(subjects[0].color) });

    // ---- Reminder (Todo modal dropdown) ----
    await user.click(screen.getByRole('button', { name: 'リマインダ' }));
    await user.click(screen.getByLabelText('リマインダを追加'));

    const reminderSubjectButton = screen.getByRole('button', { name: /選択してください/ });
    await user.click(reminderSubjectButton);

    const reminderOption = screen.getByRole('button', { name: subjects[0].name });
    const reminderOptionDot = reminderOption.querySelector('span.w-3.h-3.rounded-full') as HTMLElement | null;
    expect(reminderOptionDot).not.toBeNull();
    expect(reminderOptionDot).toHaveStyle({ backgroundColor: hexToRgb(subjects[0].color) });

    await user.click(reminderOption);
    const selectedReminderButton = screen.getByRole('button', { name: new RegExp(subjects[0].name) });
    const selectedReminderDot = selectedReminderButton.querySelector('span.w-3.h-3.rounded-full') as HTMLElement | null;
    expect(selectedReminderDot).not.toBeNull();
    expect(selectedReminderDot).toHaveStyle({ backgroundColor: hexToRgb(subjects[0].color) });

    // モーダルが開いていると背面が aria-hidden になりタブが操作できないため、閉じる
    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.getByRole('dialog'));

    // ---- Project (Kanban card border color) ----
    await user.click(screen.getByRole('button', { name: 'プロジェクト' }));
    const todoTitle = await screen.findByText('テストTODO');
    const card = todoTitle.closest('div.border-l-4') as HTMLElement | null;
    expect(card).not.toBeNull();
    expect(card).toHaveStyle({ borderLeftColor: hexToRgb(subjects[0].color) });
  });

  it('ボリューム削除後（subjects設定なし）でもデフォルト科目が表示され、旧科目名（LocalStorage）も自動で正規化される', async () => {
    vi.mocked(settingsApi.getAll).mockResolvedValue([]); // settingsが空（初期状態）
    vi.mocked(studyProgressApi.getAll).mockResolvedValue([]);
    vi.mocked(studyProgressApi.getSummary).mockResolvedValue(makeDashboardSummary());
    vi.mocked(projectApi.getAll).mockResolvedValue([]);
    vi.mocked(todoApi.getAll).mockResolvedValue([]);

    // LocalStorageに旧科目名が残っているケース（例: 財計）
    localStorage.setItem(
      'studyTimerState',
      JSON.stringify({
        elapsedTime: 0,
        isRunning: false,
        selectedSubject: '財計',
        mode: 'pomodoro',
        pomodoroPhase: 'focus',
        pomodoroFocusMinutes: 25,
        pomodoroBreakMinutes: 5,
        pomodoroSets: 10,
        pomodoroCurrentSet: 1,
        pomodoroRemainingSeconds: 1500,
        manualHours: 0,
        manualMinutes: 0,
        startTime: null,
      })
    );

    const { user } = await renderApp();

    await user.click(screen.getByRole('button', { name: '学習時間' }));

    // 旧名「財計」→ 現行マスタ「財務会計」へ自動で寄せる
    const normalizedCandidates = await screen.findAllByRole('button', { name: '財務会計' });
    const normalizedSubjectButton =
      normalizedCandidates.find((b) => (b as HTMLElement).className.includes('rounded-full')) ?? normalizedCandidates[0];
    const dot = normalizedSubjectButton.querySelector('span.w-3.h-3.rounded-full') as HTMLElement | null;
    expect(dot).not.toBeNull();
    expect(dot).toHaveStyle({ backgroundColor: hexToRgb(DEFAULT_SUBJECTS[0].color) });

    // ドロップダウンにもデフォルト科目が入っている（初期状態の再現）
    await user.click(normalizedSubjectButton);
    const options = screen.getAllByRole('button', { name: DEFAULT_SUBJECTS[0].name });
    const dropdownOption =
      options.find((b) => (b as HTMLElement).className.includes('text-left')) ?? options[0];
    expect(dropdownOption).toBeInTheDocument();
  });

  it('空配列で保存した科目リストが、タブ切り替え後もデフォルト科目に復活しない', async () => {
    // 空配列の設定を返すモック
    vi.mocked(settingsApi.getAll).mockResolvedValue([
      {
        id: 1,
        key: 'subjects',
        value: '[]', // 空配列
        created_at: '2025-01-01T00:00:00Z',
      },
    ]);

    const { user } = await renderApp();

    // 設定画面に移動
    await user.click(screen.getByRole('button', { name: '設定' }));
    await waitFor(() => {
      expect(screen.getByText('科目が登録されていません')).toBeInTheDocument();
    });

    // 別タブに移動
    await user.click(screen.getByRole('button', { name: '学習時間' }));
    await waitFor(() => {
      expect(screen.getByText('学習時間')).toBeInTheDocument();
    });

    // 再び設定画面に戻る
    await user.click(screen.getByRole('button', { name: '設定' }));

    // 空配列のまま維持され、デフォルト科目が復活していないことを確認
    await waitFor(() => {
      expect(screen.getByText('科目が登録されていません')).toBeInTheDocument();
      expect(screen.queryByText('財務会計')).not.toBeInTheDocument();
      expect(screen.queryByText('管理会計')).not.toBeInTheDocument();
    });
  });
});


