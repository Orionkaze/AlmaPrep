"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { GlowButton } from "@/components/ui/glow-button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { 
  faBriefcase, 
  faLaptopCode, 
  faShuffle, 
  faFileLines,
  faSearch,
  faGraduationCap,
  faScaleBalanced,
  faStethoscope,
  faMasksTheater,
  faMicrochip,
  faGlobe
} from "@fortawesome/free-solid-svg-icons"
import { getResumeData } from "@/app/actions/resume"
import { getAllPrograms } from "@/app/actions/programs"
import { checkGitHubConnection } from "@/app/actions/interview"
import { createClient } from "@/lib/supabase/client"

// ProgramInfo interface matching the server definition
interface ProgramInfo {
  id: string
  name: string
  category: string
  questionCount: number
}

const standardCategories = [
  {
    id: "hr",
    label: "HR Interview",
    icon: faBriefcase,
    description: "Behavioral questions, teamwork, leadership, and situational scenarios.",
    gradient: "from-primary to-primary/60",
  },
  {
    id: "technical",
    label: "Technical Interview",
    icon: faLaptopCode,
    description: "Data structures, algorithms, system design, and problem-solving.",
    gradient: "from-secondary to-secondary/60",
  },
  {
    id: "mixed",
    label: "Mixed Interview",
    icon: faShuffle,
    description: "A blend of HR and technical questions simulating a real-world interview.",
    gradient: "from-accent to-accent/60",
  },
]

const tabCategories = [
  { id: "general", label: "General Tracks", icon: faShuffle },
  { id: "Business & Law", label: "Business & Law", icon: faScaleBalanced },
  { id: "Health & Medicine", label: "Health & Medicine", icon: faStethoscope },
  { id: "Humanities & Social Sciences", label: "Humanities & Social", icon: faMasksTheater },
  { id: "Sciences & Tech", label: "Sciences & Tech", icon: faMicrochip },
  { id: "Universal", label: "Universal Banks", icon: faGlobe },
]

export default function InterviewSetupPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [hasResume, setHasResume] = useState(false)
  const [useResume, setUseResume] = useState(false)
  const [persona, setPersona] = useState<string>("supportive")
  
  // GitHub Mode states
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [githubConnected, setGithubConnected] = useState(false)
  const [githubAnalysis, setGithubAnalysis] = useState<any>(null)
  const [githubMode, setGithubMode] = useState(false)
  const [selectedRepos, setSelectedRepos] = useState<string[]>([])
  
  // Specialized programs states
  const [programs, setPrograms] = useState<ProgramInfo[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("general")
  const [loading, setLoading] = useState(true)

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
          const supabase = createClient()
          const { data: analysis } = await supabase
            .from("github_analysis")
            .select("*")
            .maybeSingle()
          
          if (analysis) {
            setGithubAnalysis(analysis)
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
  const filteredPrograms = programs.filter(prog => 
    prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prog.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get currently selected item details
  const getSelectedLabel = () => {
    if (!selected) return ""
    const std = standardCategories.find(c => c.id === selected)
    if (std) return std.label
    const prog = programs.find(p => p.id === selected)
    return prog ? prog.name : selected
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-background text-foreground">
      {/* Background decorations */}
      <div className="fixed top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-0 left-1/4 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />

      <div className="relative z-10 w-full max-w-4xl pt-10 pb-16">
        <div className="text-center mb-8">
          <Link href="/dashboard" className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors mb-4 inline-block font-medium">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50">
            Setup Your Practice Session
          </h1>
          <p className="text-foreground/60 text-sm md:text-base max-w-xl mx-auto">
            Choose a general track or practice with our specialized academic & professional program banks.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-xl mx-auto mb-8 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-foreground/40">
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <input
            type="text"
            placeholder="Search 70+ specialized programs (e.g. Medicine, Law, Physics...)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value && activeTab !== "search") {
                setActiveTab("search")
              } else if (!e.target.value && activeTab === "search") {
                setActiveTab("general")
              }
            }}
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 outline-none text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder-white/30"
          />
          {searchQuery && (
            <button 
              onClick={() => {
                setSearchQuery("")
                setActiveTab("general")
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-foreground/45 hover:text-foreground/80"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-none border-b border-white/5">
          {tabCategories.map((tab) => {
            // Hide search tab unless searching
            if (tab.id === "search" && !searchQuery) return null;
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  if (tab.id !== "search") {
                    setSearchQuery("")
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "border-primary bg-primary/10 text-white ring-1 ring-primary/20" 
                    : "border-white/5 hover:border-white/10 hover:bg-white/5 text-foreground/60"
                }`}
              >
                <FontAwesomeIcon icon={tab.icon} className={isActive ? "text-primary" : "text-foreground/40"} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Grid Content Selection */}
        <div className="min-h-[260px] mb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-xs text-foreground/50">Loading specialized question banks...</p>
            </div>
          ) : activeTab === "general" ? (
            /* General Tracks Grid */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {standardCategories.map((cat) => {
                const isSelected = selected === cat.id
                return (
                  <button key={cat.id} onClick={() => setSelected(cat.id)} className="text-left cursor-pointer focus:outline-none">
                    <GlassCard
                      className={`h-full flex flex-col items-center text-center transition-all duration-300 hover:scale-[1.02] border-white/5 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]"
                          : "hover:border-white/15 hover:bg-white/5"
                      }`}
                    >
                      <div className={`size-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center mb-4 opacity-90 shadow-md`}>
                        <FontAwesomeIcon icon={cat.icon} className="text-xl text-white" />
                      </div>
                      <h3 className="text-base font-bold mb-2">{cat.label}</h3>
                      <p className="text-xs text-foreground/50 leading-relaxed">{cat.description}</p>
                    </GlassCard>
                  </button>
                )
              })}
            </div>
          ) : (
            /* Programs Grid (Tabs/Search) */
            <div>
              {activeTab === "search" && (
                <div className="text-xs text-foreground/50 mb-3 px-1">
                  Found {filteredPrograms.length} specialized program{filteredPrograms.length !== 1 ? 's' : ''} matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}

              {filteredPrograms.filter(p => activeTab === "search" || p.category === activeTab).length === 0 ? (
                <div className="text-center py-12 bg-white/5 border border-dashed border-white/10 rounded-2xl">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-2xl text-foreground/20 mb-3" />
                  <p className="text-sm font-semibold text-foreground/60">No specialized programs found</p>
                  <p className="text-xs text-foreground/40 mt-1">Try searching with a different keyword</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredPrograms
                    .filter(p => activeTab === "search" || p.category === activeTab)
                    .map((prog) => {
                      const isSelected = selected === prog.id
                      return (
                        <button 
                          key={prog.id} 
                          onClick={() => setSelected(prog.id)} 
                          className="text-left cursor-pointer focus:outline-none"
                        >
                          <div 
                            className={`p-4 rounded-xl border transition-all duration-200 hover:scale-[1.01] flex flex-col justify-between h-28 relative overflow-hidden bg-white/5 ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)]"
                                : "border-white/5 hover:border-white/10 hover:bg-white/10"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2 pr-4">
                                  {prog.name}
                                </h4>
                                {isSelected && (
                                  <div className="size-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-white shrink-0 absolute top-4 right-4">
                                    ✓
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] text-foreground/40 mt-1 block">
                                {prog.category}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md self-start mt-2">
                              {prog.questionCount} Questions
                            </span>
                          </div>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Category Label Display */}
        {selected && (
          <div className="text-center mb-6 animate-in fade-in duration-300">
            <span className="text-xs text-foreground/50">Selected Track: </span>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              {getSelectedLabel()}
            </span>
          </div>
        )}

        {/* GitHub-Focused Interview Mode */}
        {selected === "technical" && (
          <GlassCard className="p-5 mb-4 border-white/5 animate-in fade-in duration-300">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-2 text-foreground/90">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              GitHub-Focused Technical Interview
            </h4>
            
            {isDemoMode ? (
              <p className="text-xs text-foreground/50 leading-relaxed mt-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                ⚠️ GitHub Mode is not available in Demo Mode. Please sign in and connect GitHub to practice using your repositories.
              </p>
            ) : !githubConnected ? (
              <div className="mt-2 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex flex-col gap-2">
                <p className="text-xs text-red-400 font-medium">
                  ⚠️ Your GitHub account is not connected.
                </p>
                <p className="text-xs text-foreground/60 leading-normal">
                  Connect GitHub on the profile page or login again using the GitHub OAuth button to enable repository-based interview questions.
                </p>
                <Link href="/dashboard/profile" className="text-xs text-primary hover:underline font-semibold self-start">
                  Go to Profile →
                </Link>
              </div>
            ) : !githubAnalysis ? (
              <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex flex-col gap-2">
                <p className="text-xs text-yellow-500 font-medium">
                  ⚠️ GitHub analysis has not been run yet.
                </p>
                <p className="text-xs text-foreground/60 leading-normal">
                  You need to analyze your repositories before you can practice questions based on them. Run the analyzer on your profile page first.
                </p>
                <Link href="/dashboard/profile" className="text-xs text-primary hover:underline font-semibold self-start">
                  Go to Profile to Analyze Repos →
                </Link>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-foreground/60 leading-relaxed max-w-md">
                    Toggle this mode to interleave questions tailored specifically to your projects (60%) with general technical questions (40%).
                  </p>
                  <button
                    onClick={() => {
                      setGithubMode(!githubMode)
                      setSelectedRepos([])
                    }}
                    className="flex items-center gap-3 cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-foreground/80">{githubMode ? "Enabled" : "Disabled"}</span>
                    <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${githubMode ? "bg-primary" : "bg-white/10 border border-white/5"}`}>
                      <div className={`bg-white size-4 rounded-full shadow-md transform transition-all duration-300 ${githubMode ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                  </button>
                </div>

                {githubMode && (
                  <div className="border-t border-white/5 pt-4 animate-in slide-in-from-top-2 duration-300">
                    <h5 className="text-xs font-bold text-foreground/75 mb-2 uppercase tracking-wider">
                      Select Repositories to Focus On (Select 2 to 5)
                    </h5>
                    
                    {/* Repository list/grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {Array.from(new Set(githubAnalysis.questions.map((q: any) => q.repo))).map((repoName: any) => {
                        const isSelected = selectedRepos.includes(repoName)
                        const repoMeta = githubAnalysis.repo_metadata?.[repoName]
                        
                        return (
                          <button
                            key={repoName}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedRepos(selectedRepos.filter(r => r !== repoName))
                              } else {
                                if (selectedRepos.length >= 5) {
                                  alert("You can select a maximum of 5 repositories.")
                                  return
                                }
                                setSelectedRepos([...selectedRepos, repoName])
                              }
                            }}
                            className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                              isSelected
                                ? "border-primary bg-primary/10 text-white"
                                : "border-white/5 hover:border-white/10 bg-white/5 text-foreground/75"
                            }`}
                          >
                            <div className="flex items-start justify-between w-full">
                              <span className="font-semibold text-xs truncate max-w-[85%]">{repoName}</span>
                              {isSelected && <span className="text-[10px] text-primary font-bold">✓</span>}
                            </div>
                            
                            {repoMeta && (
                              <div className="flex gap-1.5 items-center mt-2">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary font-medium">
                                  Complexity: {repoMeta.complexity_score}/10
                                </span>
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <p className="text-[11px] text-foreground/50">
                        Selected: <span className="font-bold text-foreground">{selectedRepos.length} / 5</span> (Minimum 2 required)
                      </p>
                      {selectedRepos.length < 2 && (
                        <p className="text-[10px] text-amber-400 font-medium animate-pulse">
                          ⚠️ Please select at least 2 repositories to start.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        )}

        {/* Persona Selector */}
        <GlassCard className="p-5 mb-4 border-white/5">
          <h4 className="text-sm font-semibold mb-3 text-foreground/90 flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" /> Select Interviewer Persona
          </h4>
          <div className="flex flex-wrap gap-3">
            {[
              { id: "supportive", label: "Supportive", desc: "Warm, encouraging, friendly" },
              { id: "strict", label: "Strict", desc: "Cold, formal, intense questions" },
              { id: "roast", label: "Roast Mode 💀", desc: "Brutally honest, sarcastic" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={`flex-1 min-w-[150px] p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  persona === p.id 
                    ? "border-primary bg-primary/10 ring-1 ring-primary/20" 
                    : "border-white/5 hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="text-xs md:text-sm font-bold mb-1 text-white">{p.label}</div>
                <div className="text-[11px] text-foreground/50 leading-snug">{p.desc}</div>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Resume Toggle Box */}
        <GlassCard className="p-5 mb-8 border-dashed border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5 text-foreground/90">
              <FontAwesomeIcon icon={faFileLines} className="text-primary text-xs" /> Resume-Focused Customization
            </h4>
            {hasResume ? (
              <p className="text-xs text-foreground/50 leading-relaxed">
                Saved resume detected! Enable this option to integrate your specific background, projects, and experiences with the selected interview questions.
              </p>
            ) : (
              <p className="text-xs text-foreground/50 leading-relaxed">
                No resume detected. To tailor questions specifically to your background, upload your resume in the{" "}
                <Link href="/dashboard/resume" className="text-primary hover:underline font-semibold">
                  Resume Analyzer
                </Link>
                .
              </p>
            )}
          </div>
          {hasResume && (
            <button
              onClick={() => setUseResume(!useResume)}
              className="flex items-center gap-3 cursor-pointer select-none"
            >
              <span className="text-xs font-bold text-foreground/80">{useResume ? "Enabled" : "Disabled"}</span>
              <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${useResume ? "bg-primary" : "bg-white/10 border border-white/5"}`}>
                <div className={`bg-white size-4 rounded-full shadow-md transform transition-all duration-300 ${useResume ? "translate-x-5" : "translate-x-0"}`} />
              </div>
            </button>
          )}
        </GlassCard>

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
            <GlowButton
              disabled={!selected || (selected === "technical" && githubMode && selectedRepos.length < 2)}
              className={`h-12 px-12 text-sm md:text-base font-semibold ${
                (!selected || (selected === "technical" && githubMode && selectedRepos.length < 2))
                  ? "opacity-30 cursor-not-allowed" 
                  : ""
              }`}
            >
              Begin Interview Track →
            </GlowButton>
          </Link>
        </div>
      </div>
    </main>
  )
}
