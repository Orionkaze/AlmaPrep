import AppHeader from "@/components/almaprep/AppHeader"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      <div className="almaprep-theme">
        <AppHeader />
      </div>
      {children}
    </div>
  )
}
