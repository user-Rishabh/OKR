export interface Subtask {
  id: string;
  key_result_id: string;
  title: string;
  is_complete: boolean;
  order_index: number;
  created_at: string;
  completed_at?: string;
}

export interface KeyResult {
  id: string;
  kr_text: string;
  suggested_metric?: string;
  target_value?: number;
  current_value: number;
  unit?: string;
  progress_pct: number;
  kr_subtasks?: Subtask[];
  suggested_subtasks?: string[];
}

export interface Goal {
  id: string;
  objective_text: string;
  pillar_id?: string;
  pillar_title?: string;
  status: 'draft' | 'active' | 'completed' | 'at_risk';
  cycle: string;
  ai_generated: boolean;
  key_results: KeyResult[];
}

export interface User {
  id: string;
  full_name: string;
  role: 'employee' | 'manager' | 'admin';
  job_title: string;
  department: string;
  team_id?: string;
}
