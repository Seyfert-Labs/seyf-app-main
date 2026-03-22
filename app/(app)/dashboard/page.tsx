import DashboardClient from '@/components/app/dashboard-client'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'

export default function DashboardPage() {
  return (
    <DashboardClient showEtherfuseRampDev={isEtherfuseDevPanelEnabled()} />
  )
}
