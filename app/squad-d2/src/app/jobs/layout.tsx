import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Job List - Squad D2 | Andima HRMS',
  description: 'Track and Trace all jobs posted at PT Andima Transportindo.',
};

export default function JobsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
