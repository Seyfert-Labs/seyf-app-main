import DashboardClient from '@/components/app/dashboard-client'
import { buildDashboardViewModel } from '@/lib/seyf/dashboard-view-model'

/** Cookies + Etherfuse + ledger: no cachear como estático. */
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const vm = await buildDashboardViewModel()

  return <DashboardClient vm={vm} />
}
