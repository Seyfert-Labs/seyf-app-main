import { notFound } from 'next/navigation'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'
import PocOmnibusClient from './poc-omnibus-client'

export default function PocOmnibusPage() {
  if (!isEtherfuseDevPanelEnabled()) {
    notFound()
  }
  return <PocOmnibusClient />
}
