import BottomNav from '@/components/app/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  )
}
