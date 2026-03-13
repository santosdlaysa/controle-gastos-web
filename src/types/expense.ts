export type ExpenseCategory = 'transporte' | 'alimentacao' | 'moradia' | 'saude' | 'educacao' | 'lazer' | 'outro';

export interface Expense {
  id: string;
  name: string;
  category: ExpenseCategory;
  quantity?: string;
  value: number;
  date: string;
  month: string;
  paid?: boolean;
  source?: "manual" | "pluggy" | "nubank";
}

export interface Income {
  salary: number;
  vale: number;
  other: number;
}

export type CategoryBudgets = Partial<Record<ExpenseCategory, number>>;

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  transporte: '#3B82F6',
  alimentacao: '#10B981',
  moradia: '#F59E0B',
  saude: '#EC4899',
  educacao: '#8B5CF6',
  lazer: '#06B6D4',
  outro: '#6B7280',
};

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  transporte: 'Transporte',
  alimentacao: 'Alimentação',
  moradia: 'Moradia',
  saude: 'Saúde',
  educacao: 'Educação',
  lazer: 'Lazer',
  outro: 'Outro',
};
