import { notFound } from 'next/navigation'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'
import EtherfuseRampDevClient from './etherfuse-ramp-dev-client'

export default function EtherfuseRampDevPage() {
  if (!isEtherfuseDevPanelEnabled()) {
    notFound()
  }
  return <EtherfuseRampDevClient />
}
