"use client"

import { useState, useRef } from "react"
import {
  FileText,
  Star,
  ListChecks,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Compass,
  Laptop,
  Upload,
  Loader2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { saveAndAnalyzeResume, ResumeAnalysis } from "@/app/actions/resume"
import { parseDocument } from "@/app/actions/parse-document"

interface ResumeContentProps {
  initialResumeText: string
  initialAnalysis: ResumeAnalysis | null
}

const loadingSteps = [
  "Uploading resume context...",
  "Running Mock AI deep parser...",
  "Mapping professional achievements...",
  "Extracting core skills & badges...",
  "Formulating mock interview recommendations..."
]

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-head), serif",
  letterSpacing: "-0.015em",
  fontWeight: 600,
}

export default function ResumeContent({
  initialResumeText,
  initialAnalysis,
}: ResumeContentProps) {
  const [resumeText, setResumeText] = useState(initialResumeText)
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(initialAnalysis)
  const [isEditing, setIsEditing] = useState(!initialResumeText)
  const [loading, setLoading] = useState(false)
  const [loadingStepIdx, setLoadingStepIdx] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await handleFileUpload(file)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsParsing(true)
    setError(null)
    const formData = new FormData()
    formData.append("file", file)
    
    const result = await parseDocument(formData)
    
    if (result.success && result.text) {
      setResumeText(result.text)
    } else {
      setError(result.error || "Failed to parse document. Please try pasting the text instead.")
    }
    setIsParsing(false)
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeText.trim()) return

    setLoading(true)
    setError(null)
    setLoadingStepIdx(0)

    const stepInterval = setInterval(() => {
      setLoadingStepIdx((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 1800)

    const result = await saveAndAnalyzeResume(resumeText)

    clearInterval(stepInterval)

    if (result.success && result.data) {
      setAnalysis(result.data.analysis)
      setIsEditing(false)
    } else {
      setError(result.error || "An error occurred during analysis. Please check your Gemini API key.")
    }
    setLoading(false)
  }

  return (
    <div className="w-full text-left">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 max-w-lg mx-auto text-center">
          <div className="relative mb-8">
            <div className="size-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-3xl animate-bounce">
              <Star size={32} strokeWidth={1.75} className="animate-spin duration-3000 text-secondary" />
            </div>
            <span className="absolute inset-0 size-20 rounded-2xl border-2 border-primary border-t-transparent animate-spin" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground" style={headingStyle}>Analyzing Your Resume</h3>
          <p className="text-sm text-muted-foreground h-5 animate-pulse transition-all">
            {loadingSteps[loadingStepIdx]}
          </p>
          <div className="w-full max-w-xs mt-6">
            <Progress value={((loadingStepIdx + 1) / loadingSteps.length) * 100} className="h-1.5 w-full" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Editor / Resume Text Input */}
          <div className={`lg:col-span-6 flex flex-col gap-4 ${!isEditing ? "opacity-90" : ""}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2 text-foreground" style={headingStyle}>
                <FileText className="text-primary" size={20} strokeWidth={1.75} />
                Resume Plain Text
              </h2>
              <div className="flex items-center gap-3">
                {isEditing && !isDragging && !isParsing && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border hover:bg-muted/70 text-xs font-semibold transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <Upload size={14} strokeWidth={1.75} />
                    Upload File
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Edit Resume
                  </button>
                )}
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
                <div 
                  className="relative group"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt"
                    className="hidden"
                  />
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder={`Paste the text version of your resume here, or drag & drop a .pdf, .docx, or .txt file...

Example:
John Doe
Software Engineer
Email: john@example.com

SKILLS:
JavaScript, React, Node.js, Next.js, Python, PostgreSQL

EXPERIENCE:
Software Engineer at TechCorp (2024-Present)
- Developed and optimized dashboard page, reducing bundle size by 30%
- Integrated third-party Supabase auth and customized database schemas...`}
                    required
                    className={`w-full h-[450px] rounded-2xl p-5 text-sm bg-input border ${isDragging ? 'border-primary border-dashed bg-primary/5' : 'border-border'} focus:border-ring focus:ring-1 focus:ring-ring/30 outline-none transition-all placeholder:text-muted-foreground/30 leading-relaxed font-mono resize-none text-body`}
                  />
                  <div className="absolute bottom-4 right-4 text-[10px] text-muted-foreground font-semibold bg-background/50 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/5 z-10">
                    {resumeText.length} chars
                  </div>
                  
                  {isDragging && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center border-2 border-primary border-dashed z-20 pointer-events-none">
                      <Upload className="text-4xl text-primary mb-4 animate-bounce" size={40} strokeWidth={1.75} />
                      <p className="text-lg font-bold text-primary" style={headingStyle}>Drop Resume File Here</p>
                      <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, and TXT</p>
                    </div>
                  )}

                  {isParsing && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center z-20">
                      <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary text-xl mb-4 animate-spin">
                        <Loader2 size={24} strokeWidth={1.75} />
                      </div>
                      <p className="font-bold text-primary mt-2" style={headingStyle}>Extracting Text...</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-medium">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={!resumeText.trim()} className="h-12 w-full cursor-pointer font-semibold">
                  Analyze with Mock AI
                </Button>
              </form>
            ) : (
              <div className="relative group">
                <div className="w-full h-[450px] rounded-2xl p-5 text-xs bg-input/40 border border-border/50 text-muted-foreground overflow-y-auto leading-relaxed font-mono whitespace-pre-wrap">
                  {resumeText}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent pointer-events-none rounded-2xl" />
              </div>
            )}
          </div>

          {/* Right Column: AI Analysis Report */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-foreground" style={headingStyle}>
              <Star className="text-secondary" size={20} strokeWidth={1.75} />
              AI Resume Review & Insights
            </h2>

            {analysis ? (
              <div className="flex flex-col gap-6">
                {/* Summary */}
                <Card className="shadow-sm relative overflow-hidden text-left">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full blur-2xl pointer-events-none" />
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-secondary">Candidate Profile</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed italic">
                      &ldquo;{analysis.summary}&rdquo;
                    </p>
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card className="shadow-sm text-left">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-primary">Detected Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-2 flex-wrap">
                    {analysis.skills.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs font-semibold px-3 py-1 rounded-full cursor-default hover:bg-muted"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                {/* Highlights */}
                <Card className="shadow-sm text-left">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5" style={headingStyle}>
                      <CheckCircle className="text-green-500" size={14} strokeWidth={1.75} />
                      Key Accomplishments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-2.5 list-none pl-0">
                      {analysis.highlights.map((highlight, idx) => (
                        <li key={idx} className="flex gap-2 items-start leading-relaxed">
                          <span className="text-primary font-bold shrink-0">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Recommended Interview Topics - Custom Table */}
                <Card className="shadow-sm text-left overflow-hidden">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-accent flex items-center gap-1.5" style={headingStyle}>
                      <Compass className="animate-pulse" size={14} strokeWidth={1.75} />
                      Recommended Interview Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-[10px] font-bold text-muted-foreground h-9 px-4">Topic</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground h-9 px-4">Focus Track</TableHead>
                          <TableHead className="text-[10px] font-bold text-muted-foreground h-9 px-4">Priority</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.interviewTopics.map((topic, idx) => {
                          const isEngineering = /algorithm|data structure|system design|coding|concurrency|database|api|backend|frontend|react|python|java|javascript|network/i.test(topic)
                          const track = isEngineering ? "Engineering" : "Admissions / HR"
                          const priority = idx < 2 ? "High" : "Medium"
                          const priorityBadgeColor = priority === "High" 
                            ? "bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse" 
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          return (
                            <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="text-xs font-semibold text-foreground px-4 py-3">{topic}</TableCell>
                              <TableCell className="text-xs text-muted-foreground px-4 py-3">{track}</TableCell>
                              <TableCell className="text-xs px-4 py-3">
                                <Badge variant="outline" className={`${priorityBadgeColor} text-[9px] font-bold py-0 h-5`}>
                                  {priority}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Improvements */}
                <Card className="shadow-sm border-yellow-500/10 text-left bg-yellow-500/[0.02]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs uppercase tracking-wider text-yellow-500 flex items-center gap-1.5" style={headingStyle}>
                      <AlertTriangle size={14} strokeWidth={1.75} />
                      Suggested Resume Updates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-xs text-muted-foreground space-y-2.5 list-none pl-0">
                      {analysis.improvements.map((improvement, idx) => (
                        <li key={idx} className="flex gap-2 items-start leading-relaxed">
                          <span className="text-yellow-500 font-bold shrink-0">•</span>
                          <span>{improvement}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center flex flex-col items-center justify-center py-20 text-muted-foreground border-dashed border-2 bg-card">
                <ListChecks className="text-muted-foreground/30 mb-4" size={40} strokeWidth={1.75} />
                <h3 className="text-base font-semibold mb-1 text-foreground" style={headingStyle}>No Resume Analysis Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Paste your resume details on the left and run analysis to get personalized feedback and unlock resume-based mock interviews.
                </p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
