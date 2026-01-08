import type { CategoryKey } from '../types';

export interface CategoryConfig {
  key: CategoryKey;
  title: string;
  subtitle: string;
  accent: string;
  helper: string;
}

export const categoryList: CategoryConfig[] = [
  {
    key: 'raw',
    title: 'Сырье',
    subtitle: 'Вес или длина',
    accent: '#1c7c54',
    helper: 'Работает с тоннами или метрами',
  },
  {
    key: 'equipment',
    title: 'Оборудование',
    subtitle: 'Учёт по количеству',
    accent: '#0f74af',
    helper: 'Количество единиц на складе',
  },
  {
    key: 'supply',
    title: 'Расходники',
    subtitle: 'Учёт по количеству',
    accent: '#a246a0',
    helper: 'Шурупы, кабель, упаковка и т. п.',
  },
];

export const categoryMap: Record<CategoryKey, CategoryConfig> = categoryList.reduce(
  (acc, item) => ({ ...acc, [item.key]: item }),
  {} as Record<CategoryKey, CategoryConfig>,
);
