"use client"

import { track, EVENTS } from "@/lib/analytics"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import {
  Briefcase,
  Laptop,
  Shuffle,
  FileText,
  Search,
  GraduationCap,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { getResumeData } from "@/app/actions/resume"
import { getAllPrograms } from "@/app/actions/programs"
import { checkGitHubConnection, getGitHubAnalysis } from "@/app/actions/interview"

// ProgramInfo interface matching the server definition
interface ProgramInfo {
  id: string
  name: string
  category: string
  questionCount: number
}

interface GitHubAnalysisData {
  questions: Array<{ repo: string; question: string; difficulty: string }>
  repo_metadata?: Record<string, { complexity_score?: number }>
}

const standardCategories = [
  {
    id: "hr",
    label: "HR Interview",
    icon: Briefcase,
    description: "Behavioral questions, teamwork, leadership, and situational scenarios.",
    colorClass: "bg-[var(--color-interview-hr)] text-white shadow-[0_0_15px_rgba(59,130,246,0.25)]",
  },
  {
    id: "technical",
    label: "Technical Interview",
    icon: Laptop,
    description: "Data structures, algorithms, system design, and problem-solving.",
    colorClass: "bg-[var(--color-interview-technical)] text-white shadow-[0_0_15px_rgba(13,148,136,0.25)]",
  },
  {
    id: "mixed",
    label: "Mixed Interview",
    icon: Shuffle,
    description: "A blend of HR and technical questions simulating a real-world interview.",
    colorClass: "bg-[var(--color-interview-mock)] text-white shadow-[0_0_15px_rgba(99,102,241,0.25)]",
  },
]

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

export default function InterviewSetupPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [hasResume, setHasResume] = useState(false)
  const [useResume, setUseResume] = useState(false)
  const [persona, setPersona] = useState<string>("supportive")
  
  // GitHub Mode states
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubAnalysis, setGithubAnalysis] = useState<GitHubAnalysisData | null>(null)
  const [githubMode, setGithubMode] = useState(false)
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  
  // Specialized programs states
  const [programs, setPrograms] = useState<ProgramInfo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("general")
  const [loading, setLoading] = useState(true)

  // Dynamic domains tab list: General Tracks + unique categories
  const uniqueCategories = Array.from(new Set(programs.map(p => p.category))).sort()
  const tabCategories = [
    { id: "general", label: "General Tracks", icon: Shuffle },
    ...uniqueCategories.map(cat => ({
      id: cat,
      label: cat,
      icon: GraduationCap
    }))
  ]

  // Scroll controls for domain tab strip
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  const checkScroll = () => {
    const el = scrollContainerRef.current
    if (el) {
      // Use Math.ceil to handle fractional pixel values
      setShowLeftArrow(Math.ceil(el.scrollLeft) > 5)
      setShowRightArrow(Math.ceil(el.scrollLeft) < el.scrollWidth - el.clientWidth - 5)
    }
  }

  useEffect(() => {
    const el = scrollContainerRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll)
      checkScroll()
      window.addEventListener("resize", checkScroll)
    }
    return () => {
      if (el) el.removeEventListener("scroll", checkScroll)
      window.removeEventListener("resize", checkScroll)
    }
  }, [programs, searchQuery])

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScroll()
    }, 100)
    return () => clearTimeout(timer)
  }, [programs, searchQuery, activeTab])

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current
    if (el) {
      const scrollAmount = 200
      el.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      })
    }
  }

  useEffect(() => {
    async function checkResume() {
      try {
        const result = await getResumeData()
        if (result.success && result.data && result.data.resumeText) {
          setHasResume(true)
        }
      } catch (err) {
        console.error("Error checking resume data:", err)
      }
    }
    
    async function fetchPrograms() {
      try {
        const data = await getAllPrograms()
        setPrograms(data)
      } catch (err) {
        console.error("Error fetching programs list:", err)
      } finally {
        setLoading(false)
      }
    }

    async function checkGitHub() {
      try {
        const cookies = document.cookie.split(";").map(c => c.trim())
        const isDemo = cookies.some(c => c.startsWith("mockmate-demo-session="))
        setIsDemoMode(isDemo)

        if (isDemo) return

        const connected = await checkGitHubConnection()
        setGithubConnected(connected)

        if (connected) {
          const analysis = await getGitHubAnalysis()
          if (analysis) {
            setGithubAnalysis(analysis as unknown as GitHubAnalysisData)
          }
        }
      } catch (err) {
        console.error("Error checking GitHub in setup page:", err)
      }
    }

    checkResume()
    fetchPrograms()
    checkGitHub()
  }, [])

  // Handle Search filtering
  const filteredPrograms = searchQuery.length > 0
    ? programs.filter(prog => 
        prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : uniqueCategories.includes(activeTab)
    ? programs.filter(prog => prog.category === activeTab)
    : [];

  // Get currently selected item details
  const getSelectedLabel = () => {
    if (!selected) return ""
    const std = standardCategories.find(c => c.id === selected)
    if (std) return std.label
    const prog = programs.find(p => p.id === selected)
    return prog ? prog.name : selected
  }

  const getCategoryStyles = () => {
    if (!selected) return ""
    if (selected === "hr") {
      return "text-[var(--color-interview-hr)] bg-[var(--color-interview-hr)]/10 border-[var(--color-interview-hr)]/20"
    }
    if (selected === "technical") {
      return "text-[var(--color-interview-technical)] bg-[var(--color-interview-technical)]/10 border-[var(--color-interview-technical)]/20"
    }
    if (selected === "mixed") {
      return "text-[var(--color-interview-mock)] bg-[var(--color-interview-mock)]/10 border-[var(--color-interview-mock)]/20"
    }
    const prog = programs.find(p => p.id === selected)
    if (prog) {
      if (prog.category === "Sciences & Tech") {
        return "text-[var(--color-interview-technical)] bg-[var(--color-interview-technical)]/10 border-[var(--color-interview-technical)]/20"
      }
      if (prog.category === "Business & Law" || prog.category === "Health & Medicine") {
        return "text-[var(--color-interview-hr)] bg-[var(--color-interview-hr)]/10 border-[var(--color-interview-hr)]/20"
      }
    }
    return "text-[var(--color-interview-mock)] bg-[var(--color-interview-mock)]/10 border-[var(--color-interview-mock)]/20"
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background text-foreground text-left">
      {/* Background decorations */}
      <div className="fixed top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />

      <div className="relative z-10 w-full max-w-4xl pt-10 pb-16">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-flex items-center gap-1 font-semibold text-left">
            ← Back to Dashboard
          </Link>
          <div className="text-center mt-2">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 text-foreground" style={headingStyle}>
              Setup Your Practice Session
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              Choose a general track or practice with our specialized academic & professional program banks.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-xl mx-auto mb-8 relative flex items-center">
          <div className="absolute left-4 flex items-center pointer-events-none text-muted-foreground">
            <Search size={16} strokeWidth={1.75} />
          </div>
          <Input
            type="text"
            placeholder="Search 70+ specialized programs (e.g. Medicine, Law, Physics...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setActiveTab("search")
            }}
            className="w-full h-12 border-border focus:border-primary pl-12 pr-12 text-sm bg-card"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery("")
                setActiveTab("general")
              }}
              className="absolute right-4 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs / Filter list */}
        <div className="w-full flex items-center gap-2 mb-6 border-b border-border pb-2">
          <button
            onClick={() => scroll("left")}
            className="flex-shrink-0 z-20 h-9 w-9 rounded-full bg-background hover:bg-muted shadow-sm flex items-center justify-center border border-border cursor-pointer text-foreground transition-all"
            style={{ visibility: showLeftArrow ? "visible" : "hidden" }}
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={scrollContainerRef}
            className="flex-1 flex overflow-x-auto gap-2 scrollbar-none scroll-smooth"
          >
            {tabCategories.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "outline"}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSearchQuery("")
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer h-9 text-foreground"
                >
                  <tab.icon size={14} strokeWidth={1.75} />
                  {tab.label}
                </Button>
              )
            })}
          </div>

          <button
            onClick={() => scroll("right")}
            className="flex-shrink-0 z-20 h-9 w-9 rounded-full bg-background hover:bg-muted shadow-sm flex items-center justify-center border border-border cursor-pointer text-foreground transition-all"
            style={{ visibility: showRightArrow ? "visible" : "hidden" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Grid Content Selection */}
        <div className="min-h-[260px] mb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-muted-foreground">Loading specialized question banks...</p>
            </div>
          ) : activeTab === "general" ? (
            /* General Tracks Grid using ToggleGroup */
            <ToggleGroup
              value={selected ? [selected] : []}
              onValueChange={(val) => {
                if (val && val.length > 0) setSelected(val[0])
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full"
            >
              {standardCategories.map((cat) => {
                return (
                  <ToggleGroupItem
                    key={cat.id}
                    value={cat.id}
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-center text-center cursor-pointer data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground rounded-2xl w-full"
                  >
                    <div className={`size-14 rounded-2xl ${cat.colorClass} flex items-center justify-center mb-4 opacity-90`}>
                      <cat.icon size={24} strokeWidth={1.75} />
                    </div>
                    <h3 className="text-base font-bold mb-2">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
          ) : activeTab === "search" || uniqueCategories.includes(activeTab) ? (
            /* Programs Search Grid */
            <div>
              <div className="text-xs text-muted-foreground mb-3 px-1">
                {activeTab === "search" 
                  ? `Found ${filteredPrograms.length} specialized program${filteredPrograms.length !== 1 ? 's' : ''} matching "${searchQuery}"`
                  : `${filteredPrograms.length} specialized program${filteredPrograms.length !== 1 ? 's' : ''} in "${activeTab}"`
                }
              </div>

              {filteredPrograms.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border bg-card rounded-2xl">
                  <GraduationCap size={28} strokeWidth={1.75} className="text-muted-foreground/40 mb-3 mx-auto" />
                  <p className="text-sm font-semibold text-muted-foreground">No specialized programs found</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Try searching with a different keyword</p>
                </div>
              ) : (
                <ToggleGroup
                  value={selected ? [selected] : []}
                  onValueChange={(val) => {
                    if (val && val.length > 0) {
                      setSelected(val[0])
                      setActiveTab(val[0])
                      setSearchQuery("")
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full"
                >
                  {filteredPrograms.map((prog) => {
                    return (
                      <ToggleGroupItem
                        key={prog.id}
                        value={prog.id}
                        variant="outline"
                        className="p-4 rounded-xl flex flex-col justify-between h-28 relative overflow-hidden bg-card cursor-pointer data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-foreground w-full text-left items-stretch"
                      >
                        <div className="flex flex-col flex-1 justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs md:text-sm font-bold leading-tight line-clamp-2 pr-4 text-foreground">
                                {prog.name}
                              </h4>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 block">
                              {prog.category}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md self-start mt-2">
                            {prog.questionCount} Questions
                          </span>
                        </div>
                      </ToggleGroupItem>
                    )
                  })}
                </ToggleGroup>
              )}
            </div>
          ) : (
            /* Selected Program Detail View */
            <div className="max-w-xl mx-auto animate-in fade-in duration-300">
              {programs
                .filter((p) => p.id === activeTab)
                .map((prog) => (
                  <Card key={prog.id} className="shadow-md border-primary/20 bg-primary/5 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-3 py-1">
                          {prog.category}
                        </Badge>
                        <span className="text-xs font-bold text-muted-foreground">{prog.questionCount} Questions</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-1 font-serif">{prog.name}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Tailored curriculum focusing on {prog.name.replace(/\(A\)|\(B\)/g, "").trim()} core concepts, analytical problem solving, and behavioral alignment.
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>

        {/* Selected Category Label Display */}
        {selected && (
          <div className="text-center mb-6 animate-in fade-in duration-300">
            <span className="text-xs text-muted-foreground">Selected Track: </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getCategoryStyles()}`}>
              {getSelectedLabel()}
            </span>
          </div>
        )}

        {/* GitHub-Focused Interview Mode */}
        {selected === "technical" && (
          <Card className="p-5 mb-4 border-border shadow-sm animate-in fade-in duration-300">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <span className="size-2 rounded-full bg-primary animate-pulse" />
                GitHub-Focused Technical Interview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isDemoMode ? (
                <p className="text-xs text-muted-foreground leading-relaxed bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                  ⚠️ GitHub Mode is not available in Demo Mode. Please sign in and connect GitHub to practice using your repositories.
                </p>
              ) : !githubConnected ? (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex flex-col gap-2">
                  <p className="text-xs text-red-500 font-semibold">
                    ⚠️ Your GitHub account is not connected.
                  </p>
                  <p className="text-xs text-muted-foreground leading-normal">
                    Connect GitHub on the profile page or login again using the GitHub OAuth button to enable repository-based interview questions.
                  </p>
                  <Link href="/dashboard/profile" className="text-xs text-primary hover:underline font-semibold self-start">
                    Go to Profile →
                  </Link>
                </div>
              ) : !githubAnalysis ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex flex-col gap-2">
                  <p className="text-xs text-yellow-500 font-semibold">
                    ⚠️ GitHub analysis has not been run yet.
                  </p>
                  <p className="text-xs text-muted-foreground leading-normal">
                    You need to analyze your repositories before you can practice questions based on them. Run the analyzer on your profile page first.
                  </p>
                  <Link href="/dashboard/profile" className="text-xs text-primary hover:underline font-semibold self-start">
                    Go to Profile to Analyze Repos →
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                      Toggle this mode to interleave questions tailored specifically to your projects (60%) with general technical questions (40%).
                    </p>
                    <Switch
                      checked={githubMode}
                      onCheckedChange={(checked) => {
                        setGithubMode(checked)
                        setSelectedRepos([])
                      }}
                      className="cursor-pointer"
                    />
                  </div>

                  {githubMode && (
                    <div className="border-t border-border pt-4 animate-in slide-in-from-top-2 duration-300">
                      <h5 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                        Select Repositories to Focus On (Select 2 to 5)
                      </h5>
                      
                      <ToggleGroup
                        multiple
                        value={selectedRepos}
                        onValueChange={(val) => {
                          if (val.length > 5) {
                            alert("You can select a maximum of 5 repositories.")
                            return
                          }
                          setSelectedRepos(val)
                        }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full"
                      >
                        {Array.from(new Set(githubAnalysis.questions.map((q) => q.repo))).map((repoName) => {
                          const repoMeta = githubAnalysis.repo_metadata?.[repoName]
                          
                          return (
                            <ToggleGroupItem
                              key={repoName}
                              value={repoName}
                              variant="outline"
                              className="p-3 rounded-xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between items-stretch h-auto w-full"
                            >
                              <div className="flex items-start justify-between w-full">
                                <span className="font-semibold text-xs truncate max-w-[85%] text-foreground">{repoName}</span>
                              </div>
                              
                              {repoMeta && (
                                <div className="flex gap-1.5 items-center mt-2">
                                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium">
                                    Complexity: {repoMeta.complexity_score}/10
                                  </Badge>
                                </div>
                              )}
                            </ToggleGroupItem>
                          )
                        })}
                      </ToggleGroup>
                      
                      <div className="mt-3 flex justify-between items-center">
                        <p className="text-[11px] text-muted-foreground">
                          Selected: <span className="font-bold text-foreground">{selectedRepos.length} / 5</span> (Minimum 2 required)
                        </p>
                        {selectedRepos.length < 2 && (
                          <p className="text-[10px] text-amber-500 font-semibold animate-pulse">
                            ⚠️ Please select at least 2 repositories to start.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Persona Selector */}
        <Card className="p-5 mb-4 border-border shadow-sm">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-pulse" /> Select Interviewer Persona
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ToggleGroup
              value={[persona]}
              onValueChange={(val) => {
                if (val && val.length > 0) setPersona(val[0])
              }}
              className="flex flex-col sm:flex-row gap-3 w-full"
            >
              {[
                { id: "supportive", label: "Supportive", desc: "Warm, encouraging, friendly" },
                { id: "strict", label: "Strict", desc: "Cold, formal, intense questions" },
                { id: "roast", label: "Roast Mode 💀", desc: "Brutally honest, sarcastic" },
              ].map((p) => (
                <ToggleGroupItem
                  key={p.id}
                  value={p.id}
                  variant="outline"
                  className="flex-1 p-3.5 h-auto rounded-xl flex flex-col items-start text-left cursor-pointer data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary w-full"
                >
                  <div className="text-xs md:text-sm font-bold mb-1">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">{p.desc}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>
        </Card>

        {/* Resume Toggle Box */}
        <Card className="p-5 mb-8 border-dashed border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-foreground">
              <FileText className="text-primary" size={14} strokeWidth={1.75} /> Resume-Focused Customization
            </h4>
            {hasResume ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Saved resume detected! Enable this option to integrate your specific background, projects, and experiences with the selected interview questions.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No resume detected. To tailor questions specifically to your background, upload your resume in the{" "}
                <Link href="/dashboard/resume" className="text-primary hover:underline font-semibold">
                  Resume Analyzer
                </Link>
                .
              </p>
            )}
          </div>
          {hasResume && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground">{useResume ? "Enabled" : "Disabled"}</span>
              <Switch
                checked={useResume}
                onCheckedChange={setUseResume}
                className="cursor-pointer"
              />
            </div>
          )}
        </Card>

        <div className="flex justify-center">
          <Link 
            href={
              !selected || (selected === "technical" && githubMode && selectedRepos.length < 2)
                ? "#"
                : selected === "technical" && githubMode
                ? `/interview/technical?resume=${useResume}&persona=${persona}&githubMode=true&repos=${encodeURIComponent(selectedRepos.join(","))}`
                : `/interview/${selected}?resume=${useResume}&persona=${persona}`
            }
          >
            <Button
              disabled={!selected || (selected === "technical" && githubMode && selectedRepos.length < 2)}
              onClick={() => track(EVENTS.INTERVIEW_STARTED, { track: selected, persona, github_mode: selected === "technical" && githubMode })}
              className="h-12 px-12 text-sm md:text-base font-semibold cursor-pointer"
            >
              Begin Interview Track <ArrowRight size={16} className="ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
