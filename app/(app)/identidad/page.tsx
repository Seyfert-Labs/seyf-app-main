import { getEtherfuseOnboardingSession } from '@/lib/etherfuse/onboarding-session'
import IdentidadClient from './identidad-client'

export default async function IdentidadPage() {
  const session = await getEtherfuseOnboardingSession()
  return <IdentidadClient initialSession={session} />
}
