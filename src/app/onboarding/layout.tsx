export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col">
      {children}
    </div>
  )
}
