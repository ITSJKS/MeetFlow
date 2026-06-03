// page.tsx
// Root landing page that redirects users to dashboard or login depending on session status.

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  } else {
    redirect('/dashboard');
  }
}
