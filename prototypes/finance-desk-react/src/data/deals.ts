export interface Deal {
  id: string;
  org: string;
  contract: string;
  number: string;
  title: string;
  date: string;
  planned: string;
  amount: number;
  closed: boolean;
  acts: string[];
}
export const deals: Deal[] = [
  {
    id: 'deal1',
    org: 'kontur',
    contract: 'c1',
    number: 'СД-024',
    title: 'Новый сайт Меридиана',
    date: '2026-10-02',
    planned: '2026-11-30',
    amount: 78000000,
    closed: false,
    acts: ['d01', 'd16'],
  },
  {
    id: 'deal2',
    org: 'kontur',
    contract: 'c1b',
    number: 'СД-040',
    title: 'Поддержка сайта в ноябре',
    date: '2026-11-01',
    planned: '2026-11-30',
    amount: 6000000,
    closed: false,
    acts: ['d20'],
  },
  {
    id: 'deal3',
    org: 'kontur',
    contract: 'c2',
    number: 'СД-031',
    title: 'Айдентика и брендбук',
    date: '2026-10-20',
    planned: '2026-11-05',
    amount: 50000000,
    closed: true,
    acts: ['d09'],
  },
];
export const dealForDocument = (id: string) => deals.find((d) => d.acts.includes(id));
