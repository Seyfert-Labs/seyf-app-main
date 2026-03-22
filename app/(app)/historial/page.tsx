import HistorialClient from './historial-client'
import { getEtherfuseRampContext } from '@/lib/seyf/etherfuse-ramp-context'
import { fetchUserMovements } from '@/lib/seyf/user-movements'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  const ctx = await getEtherfuseRampContext()
  const movements = await fetchUserMovements(ctx)

  return <HistorialClient movements={movements} />
}
