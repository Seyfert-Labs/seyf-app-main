import { redirect } from 'next/navigation'
import { isEtherfuseDevPanelEnabled } from '@/lib/seyf/etherfuse-dev-panel'
import EtherfuseTestnetBankDevClient from './etherfuse-testnet-bank-dev-client'

/** Alta CLABE sintética testnet sin pasar por la UI de Identidad. */
export default function DevEtherfuseTestnetBankPage() {
  if (!isEtherfuseDevPanelEnabled()) {
    redirect('/dashboard')
  }
  return <EtherfuseTestnetBankDevClient />
}
