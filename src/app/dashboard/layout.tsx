import AppHeader from "@/components/almaprep/AppHeader"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <div className="almaprep-theme" style={{ minHeight: 'auto', background: 'transparent' }}>
        <AppHeader />
      </div>
      {children}
    </div>
  )
}
