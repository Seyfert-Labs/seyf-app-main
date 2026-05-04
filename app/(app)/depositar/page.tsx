import { redirect } from 'next/navigation'

/**
 * Página legacy (Bitso CLABE). Se mantiene implementación backend, pero UX
 * principal migra a /anadir (Etherfuse).
 */
export default function DepositarPage() {
  redirect('/anadir')
}
