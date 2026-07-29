export interface KeyResult {
  id: string;
  kr_text: string;
  suggested_metric?: string;
  target_value?: number;
  current_value: number;
  unit?: string;
  progress_pct: number;
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
  role: 'employee' | 'manager' | 'admin';
  job_title: string;
  department: string;
  team_id?: string;
}
