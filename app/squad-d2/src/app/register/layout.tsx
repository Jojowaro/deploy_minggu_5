import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registration Form - Squad D2 | Andima HRMS',
  description: 'Portal Pendaftaran Multi-Jalur Kandidat PT Andima Transportindo',
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
