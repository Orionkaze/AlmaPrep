import AppHeader from "@/components/almaprep/AppHeader"

export default function InterviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="almaprep-theme bg-background text-foreground min-h-screen flex flex-col">
      <AppHeader />
      {children}
    </div>
  )
}
