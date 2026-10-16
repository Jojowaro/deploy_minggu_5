import { JobPost } from '../types/candidate';

/**
 * Default fallback active job positions (derived from d1_job_positions)
 * Placed in shared constants so client components do not bundle server-only code.
 */
export const DEFAULT_ACTIVE_JOB_POSTS: JobPost[] = [
  {
    id: 'b1333b20-de39-4e9c-a768-59bbf9a8e94f',
    title: 'Accounting Associate 1 (Billing)',
    department: 'Finance, Accounting & Tax',
    status: 'active',
    description: 'Menangani proses penagihan, pencatatan faktur, dan rekonsiliasi billing.',
    tags: ['JP003', 'Billing', 'Finance', 'Full Time'],
    location: 'HQ - Menara MTH',
  },
  {
    id: '0870af53-59f3-4086-a7bc-9d7bb227d1e8',
    title: 'Accounting Associate 2 (Billing)',
    department: 'Finance, Accounting & Tax',
    status: 'active',
    description: 'Mendukung operasional penagihan piutang dan verifikasi transaksi keuangan.',
    tags: ['JP004', 'Billing', 'Finance', 'Full Time'],
    location: 'HQ - Menara MTH',
  },
  {
    id: '9a20b5d6-6ac3-4824-93cd-98efc1c2d3fd',
    title: 'HR Manager',
    department: 'Human Capital & Culture',
    status: 'active',
    description: 'Mengelola operasional HR, manajemen talenta, dan hubungan industrial.',
    tags: ['JP011', 'HR Management', 'Human Capital', 'Full Time'],
    location: 'HQ - Menara MTH',
  },
  {
    id: '3ec8499c-b00d-489e-980a-5936275a3b69',
    title: 'Sales Executive 1',
    department: 'Commercial & Customer Success',
    status: 'active',
    description: 'Melakukan ekspansi pasar, penawaran produk, dan pencapaian target penjualan.',
    tags: ['JP018', 'Sales B2B', 'Commercial', 'Full Time'],
    location: 'HQ - Menara MTH',
  },
  {
    id: 'placeholder-xxx-future',
    title: 'XXX',
    department: 'Future Operations',
    status: 'coming_soon' as any,
    isPlaceholder: true,
    description: '',
    tags: [],
    location: 'Location Pending',
  },
];
