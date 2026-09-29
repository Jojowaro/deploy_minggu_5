import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kanban Pipeline & Audit Trail - Squad D2 | Andima HRMS',
  description: 'Dynamic Kanban Applicant Pipeline & Immutable Audit Trail for PT Andima Transportindo.',
};

export default function KanbanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
