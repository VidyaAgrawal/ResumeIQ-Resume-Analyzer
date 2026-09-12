import { useMemo, useRef, useState } from 'react';
import { useAnalyzeResume, useHealthCheck, type ResumeAnalysis } from '@workspace/api-client-react';
import { Check, ChevronDown, CircleAlert, FileCheck2, FileText, Loader2, Mail, RotateCcw, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { ResultsList } from '@/components/results-list';
import { ScoreRing } from '@/components/score-ring';

const roles = [
  'Backend Developer',
  'Frontend Developer',
  'Full Stack Developer',
  'Java Developer',
  'Node.js Developer',
  'Python Developer',
  'Software Engineer',
  'Data Analyst',
  'HR / Human Resources',
  'Other',
];

function Header({ hasResults, onReset }: { hasResults: boolean; onReset: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10" data-testid="header-main">
      <BrandMark />
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 text-[11px] font-semibold text-muted-foreground sm:flex" data-testid="status-health">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Private by design
        </div>
        {hasResults && (
          <button onClick={onReset} className="group flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[11px] font-bold transition hover:border-primary hover:bg-primary hover:text-primary-foreground" data-testid="button-new-analysis">
            <RotateCcw className="h-3.5 w-3.5 transition-transform group-hover:-rotate-45" />
            New review
          </button>
        )}
      </div>
    </header>
  );
}

function UploadBox({ file, onFile, onError, disabled }: { file: File | null; onFile: (file: File | null) => void; onError: (message: string) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const chooseFile = (candidate?: File) => {
    if (!candidate) return;
    const isPdf = candidate.type === 'application/pdf' || candidate.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      onFile(null);
      onError('PDF files only, please.');
      return;
    }
    if (candidate.size > 8 * 1024 * 1024) {
      onFile(null);
      onError('That PDF is too large. Please choose a file under 8 MB.');
      return;
    }
    onError('');
    onFile(candidate);
  };
  return (
    <div
      className={`relative rounded-2xl border border-dashed p-6 transition-all sm:p-8 ${dragging ? 'border-accent bg-accent/10' : file ? 'border-accent/70 bg-accent/5' : 'border-border bg-background hover:border-primary/50 hover:bg-secondary/40'} ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
      data-testid="dropzone-resume"
    >
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} data-testid="input-resume" />
      {file ? (
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-primary"><FileCheck2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{file.name}</p>
            <p className="mt-1 font-mono-ui text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} mb · PDF ready</p>
          </div>
          <button type="button" onClick={() => onFile(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Remove resume" data-testid="button-remove-resume"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center text-center" data-testid="button-choose-resume">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-secondary text-primary transition-transform group-hover:-translate-y-1"><Upload className="h-5 w-5" /></div>
          <span className="text-sm font-extrabold">Drop your resume here</span>
          <span className="mt-1 text-xs text-muted-foreground">or <span className="font-bold text-primary underline decoration-accent decoration-2 underline-offset-4">browse a PDF</span> · up to 8 MB</span>
        </button>
      )}
    </div>
  );
}

function FormSkeleton() {
  return <div className="space-y-4" data-testid="loading-analysis" aria-live="polite">
    <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Loader2 className="h-4 w-4 animate-spin" /></div>
        <div><p className="text-sm font-extrabold">Review in progress</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Uploading securely, extracting your resume, and asking Gemini to review it. This may take a minute.</p></div>
      </div>
      <div className="mt-5 grid gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:grid-cols-2">
        <span>Uploading resume</span><span>Extracting PDF content</span><span>Checking ATS compatibility</span><span>Generating your report</span>
      </div>
    </div>
    <div className="skeleton h-12 rounded-xl" />
    <div className="skeleton h-12 rounded-xl" />
  </div>;
}

function AnalysisForm({ onComplete }: { onComplete: (result: ResumeAnalysis) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const analysis = useAnalyzeResume();
  const isPending = analysis.isPending;
  const canSubmit = Boolean(file && email && email.includes('@') && (role !== 'Other' || customRole.trim()));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!file) return setError('Add your resume PDF to start the review.');
    if (!email || !email.includes('@')) return setError('Enter a valid email so we can send your review.');
    if (role === 'Other' && !customRole.trim()) return setError('Tell us which role you are targeting.');
    analysis.mutate({ data: { resume: file, email: email.trim(), role: role === 'Other' ? 'Other' : role, customRole: role === 'Other' ? customRole.trim() : undefined } }, {
      onSuccess: (result) => onComplete(result),
      onError: (requestError) => setError(requestError instanceof Error ? requestError.message : 'We could not analyze that file. Please try again.'),
    });
  };
  if (isPending) return <FormSkeleton />;
  return (
    <form onSubmit={submit} className="space-y-5" data-testid="form-analysis">
      <UploadBox file={file} onFile={setFile} onError={setError} disabled={isPending} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block" data-testid="field-role">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">Target role <span className="font-normal normal-case tracking-normal">(optional)</span></span>
          <div className="relative">
            <select value={role} onChange={(event) => setRole(event.target.value)} className="h-12 w-full appearance-none rounded-xl border border-input bg-card px-4 pr-10 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-accent/40" data-testid="select-role">
              <option value="">No specific role</option>
              {roles.map((option) => <option value={option} key={option}>{option}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-4 h-4 w-4 text-muted-foreground" />
          </div>
        </label>
        <label className="block" data-testid="field-email">
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">Send review to</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-accent/40" data-testid="input-email" />
          </div>
        </label>
      </div>
      {role === 'Other' && <label className="block animate-fade" data-testid="field-custom-role"><span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.13em] text-muted-foreground">Your target role</span><input value={customRole} onChange={(event) => setCustomRole(event.target.value)} placeholder="e.g. Content strategist" className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm font-semibold outline-none focus:border-primary focus:ring-2 focus:ring-accent/40" data-testid="input-custom-role" /></label>}
      {error && <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs font-semibold leading-5 text-destructive" data-testid="status-analysis-error"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <button type="submit" disabled={!canSubmit || isPending} className="group flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-extrabold text-primary-foreground transition hover:-translate-y-0.5 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-analyze">
        <Sparkles className="h-4 w-4 text-accent transition-transform group-hover:rotate-12" />
        Review my resume
      </button>
      <p className="flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-accent" />Your resume is used for this review only.</p>
    </form>
  );
}

function Landing({ onComplete }: { onComplete: (result: ResumeAnalysis) => void }) {
  const health = useHealthCheck({ query: { queryKey: ['/api/healthz'], staleTime: 30000 } });
  const healthLabel = health.isLoading ? 'Checking reviewer' : health.data?.status === 'ok' ? 'Reviewer online' : 'Ready when you are';
  return (
    <main className="mx-auto grid w-full max-w-[1240px] flex-1 gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center lg:gap-20 lg:px-10 lg:pb-24">
      <div className="animate-rise">
        <div className="mb-7 flex items-center gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{healthLabel}</div>
        <h1 className="max-w-[700px] text-balance font-display text-[clamp(3.5rem,7.7vw,7.4rem)] leading-[.88] tracking-[-0.055em] text-primary">Your next role<br /><em className="text-[hsl(var(--chart-5))]">starts here.</em></h1>
        <p className="mt-8 max-w-[510px] text-[15px] leading-7 text-muted-foreground sm:text-base">A focused review of your resume, grounded in the role you want. Get the clear, specific feedback a senior recruiter would give you — without the guesswork.</p>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-bold text-primary">
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />Evidence over opinions</span>
          <span className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />Built for one resume at a time</span>
        </div>
      </div>
      <div className="animate-rise rounded-[24px] border border-card-border bg-card p-5 shadow-[var(--shadow-md)] [animation-delay:120ms] sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.13em] text-accent">01 / Start review</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.05em]">Bring your resume.</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">PDF in. A sharper point of view out.</p></div>
          <FileText className="mt-1 h-5 w-5 text-muted-foreground/60" />
        </div>
        <AnalysisForm onComplete={onComplete} />
      </div>
    </main>
  );
}

function Results({ result, onReset }: { result: ResumeAnalysis; onReset: () => void }) {
  const roleLabel = result.role || 'General review';
  const emailSent = result.emailStatus === 'sent';
  const resultMeta = useMemo(() => `${roleLabel} · ${emailSent ? 'Review sent' : 'Review on screen'}`, [emailSent, roleLabel]);
  return (
    <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-10">
      <div className="animate-rise mb-10 flex flex-col justify-between gap-5 border-b border-border pb-8 sm:flex-row sm:items-end">
        <div><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.14em] text-accent">02 / Your review</p><h1 className="mt-2 font-display text-5xl tracking-[-0.05em] text-primary sm:text-6xl">A clear read on your fit.</h1><p className="mt-3 text-sm text-muted-foreground" data-testid="text-result-meta">{resultMeta}</p></div>
        <button onClick={onReset} className="flex w-fit items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-xs font-extrabold transition hover:border-primary hover:bg-secondary" data-testid="button-review-again"><RotateCcw className="h-3.5 w-3.5" />Review another resume</button>
      </div>
      {!emailSent && <div className="mb-7 flex items-start gap-3 rounded-xl border border-[hsl(var(--chart-4))]/40 bg-[hsl(var(--chart-4))]/10 px-4 py-3 text-xs leading-5 text-foreground" data-testid="status-email-error"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--chart-4))]" /><span><strong>We could not send the email.</strong> Your complete review is below{result.emailError ? ` — ${result.emailError}` : '.'}</span></div>}
      {emailSent && <div className="mb-7 flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-xs font-semibold text-foreground" data-testid="status-email-sent"><Mail className="h-4 w-4 text-[hsl(var(--chart-5))]" />A copy of this review is on its way to your inbox.</div>}
      <section className="animate-rise grid gap-6 rounded-[24px] bg-primary p-6 text-primary-foreground shadow-[var(--shadow-md)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><div className="mb-4 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.14em] text-accent"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Recruiter readout</div><h2 className="max-w-[650px] font-display text-3xl leading-tight tracking-[-0.035em] sm:text-4xl" data-testid="text-summary">{result.summary}</h2><p className="mt-5 max-w-[640px] text-sm leading-6 text-primary-foreground/65">Role focus: <span className="font-bold text-primary-foreground">{roleLabel}</span></p></div>
        <div className="flex items-center gap-5 border-t border-primary-foreground/15 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><ScoreRing score={result.score} label="overall" accent /><div className="hidden sm:block"><div className="font-mono-ui text-[10px] uppercase tracking-[0.1em] text-primary-foreground/55">Signal strength</div><div className="mt-1 text-sm font-bold">{result.roleMatch}</div></div></div>
      </section>
      <section className="my-7 grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-5 rounded-2xl border border-card-border bg-card p-5 shadow-[var(--shadow-sm)]" data-testid="card-ats-score"><ScoreRing score={result.atsScore} label="ATS score" /><div><div className="font-mono-ui text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Machine readability</div><p className="mt-2 text-sm font-bold leading-6">Your resume's signal<br />in the first scan.</p></div></div>
        <div className="flex flex-col justify-center rounded-2xl border border-card-border bg-[hsl(var(--chart-5))] p-6 text-primary-foreground shadow-[var(--shadow-sm)]" data-testid="card-recommendation"><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[0.1em] text-primary-foreground/65"><Sparkles className="h-3.5 w-3.5 text-accent" />Bottom line</div><p className="font-display text-2xl leading-tight tracking-[-0.03em]">{result.finalRecommendation}</p></div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <ResultsList kind="strength" items={result.strengths} />
        <ResultsList kind="gap" items={[...result.missingSkills, ...result.missingSections]} />
        <ResultsList kind="suggestion" items={result.keywordSuggestions} />
        <ResultsList kind="improvement" items={result.improvements} />
      </div>
      <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center"><p className="max-w-[600px] text-xs leading-5 text-muted-foreground">Use this as your editing brief, not a verdict. The strongest resume is still the one that sounds like you.</p><button onClick={onReset} className="flex items-center gap-2 text-xs font-extrabold text-primary underline decoration-accent decoration-2 underline-offset-4" data-testid="button-start-over">Start over <RotateCcw className="h-3.5 w-3.5" /></button></div>
    </main>
  );
}

export default function Home() {
  const [result, setResult] = useState<ResumeAnalysis | null>(null);
  return (
    <div className="grain flex min-h-[100dvh] flex-col overflow-hidden">
      <Header hasResults={Boolean(result)} onReset={() => setResult(null)} />
      {result ? <Results result={result} onReset={() => setResult(null)} /> : <Landing onComplete={setResult} />}
      <footer className="mx-auto flex w-full max-w-[1240px] items-center justify-between border-t border-border px-5 py-5 text-[10px] font-semibold text-muted-foreground sm:px-8 lg:px-10"><span>ResumeIQ · Better questions for better applications.</span><span className="font-mono-ui uppercase tracking-[0.1em]">v1.0 / candidate review</span></footer>
    </div>
  );
}