import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Brain,
  Code2,
  GitBranch,
  Layers3,
  Lock,
  MousePointer2,
  Play,
  Route,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Timer,
  WandSparkles,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1];

const story = (delay = 0, duration = 5.8) => ({
  duration,
  delay,
  repeat: Infinity,
  ease,
  times: [0, 0.16, 0.32, 0.72, 1],
});

function FeatureHeader() {
  return (
    <div className="mb-10 grid gap-6 md:grid-cols-12 md:items-end">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease }}
        className="md:col-span-8"
      >
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          <GitBranch size={13} className="text-zinc-400" />
          Built for serious practice
        </div>
        <h2 className="landing-display max-w-[760px] text-4xl leading-[0.98] text-white sm:text-5xl lg:text-6xl">
          Solved problems do not disappear. They return exactly when revision matters.
        </h2>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.08, ease }}
        className="landing-copy md:col-span-4 max-w-[420px] text-sm leading-6"
      >
        DeepFocus blocks shortcuts, guides your next problem, remembers weak spots,
        and turns every mistake into a focused review loop.
      </motion.p>
    </div>
  );
}

function BentoCard({ children, className = "" }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.75, ease }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-[16px] border border-white/[0.075] bg-[#0D0C10]/95 backdrop-blur-[18px] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.13] hover:bg-[#111016]/96 ${className}`}
      style={{
        boxShadow: "0 26px 76px -36px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.055)",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.08]" />
      <div className="relative flex h-full flex-col">{children}</div>
    </motion.article>
  );
}

function CardText({ icon: Icon, label, title, body }) {
  return (
    <div className="relative z-20 p-5 pb-3">
      <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
        <Icon size={13} className="text-zinc-400" />
        {label}
      </div>
      <h3 className="landing-display max-w-[520px] text-xl font-semibold leading-[1.1] text-[#F8FAFC] md:text-2xl">
        {title}
      </h3>
      <p className="landing-copy mt-3 max-w-[460px] text-xs leading-5">{body}</p>
    </div>
  );
}

function DemoSurface({ children, className = "" }) {
  return (
    <div className={`relative mx-5 mb-5 flex-1 overflow-hidden rounded-lg border border-white/[0.075] bg-black/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-md ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.035),transparent_42%,rgba(255,255,255,0.022)),radial-gradient(circle_at_1px_1px,rgba(248,250,252,0.03)_1px,transparent_0)] bg-[length:auto,22px_22px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/[0.10]" />
      {children}
    </div>
  );
}

function CodeLines({ active = 3, color = "rgba(245,245,245,0.72)", compact = false }) {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {Array.from({ length: compact ? 5 : 7 }).map((_, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-white/[0.12]" />
          <span
            className="h-1.5 rounded-full"
            style={{
              width: `${44 + ((index * 17) % 42)}%`,
              background: index <= active ? color : "rgba(255,255,255,0.08)",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function SolutionLockdown({ reduceMotion }) {
  return (
    <BentoCard className="min-h-[470px] md:col-span-6 lg:col-span-7">
      <CardText
        icon={ShieldCheck}
        label="No solution peeking"
        title="When you reach for answers, DeepFocus keeps you in the problem."
        body="Solutions, tab switches, and shortcut habits get blocked so your brain has to do the hard work."
      />
      <DemoSurface>
        <div className="absolute inset-x-0 top-0 flex h-10 items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/35" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">problem workspace</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 top-10 grid grid-cols-12">
          <div className="col-span-7 border-r border-white/[0.06] p-4">
            <div className="mb-4 flex gap-2 text-xs text-zinc-500">
              <motion.span
                className="rounded px-2 py-1"
                animate={reduceMotion ? undefined : {
                  backgroundColor: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.035)", "rgba(255,255,255,0.035)", "rgba(255,255,255,0.08)"],
                  color: ["#d4d4d8", "#d4d4d8", "#71717a", "#71717a", "#d4d4d8"],
                }}
                transition={story(0.2, 5.8)}
              >
                Description
              </motion.span>
              <motion.span
                className="relative rounded px-2 py-1"
                animate={reduceMotion ? undefined : {
                  backgroundColor: ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.04)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0.04)"],
                  color: ["#71717a", "#71717a", "#f4f4f5", "#f4f4f5", "#71717a"],
                  scale: [1, 1, 0.96, 1, 1],
                  boxShadow: [
                    "0 0 0 rgba(255,255,255,0)",
                    "0 0 0 rgba(255,255,255,0)",
                    "0 0 24px rgba(255,255,255,0.16)",
                    "0 0 24px rgba(255,255,255,0.12)",
                    "0 0 0 rgba(255,255,255,0)",
                  ],
                }}
                transition={story(0.2, 5.8)}
              >
                <motion.span
                  className="absolute inset-0 rounded border border-white/25"
                  animate={reduceMotion ? undefined : { opacity: [0, 0, 0.7, 0, 0], scale: [0.88, 0.88, 1.16, 1.22, 1.22] }}
                  transition={story(0.2, 5.8)}
                />
                Solutions
              </motion.span>
            </div>
            <div className="mb-4 text-sm font-semibold text-white">Two Sum</div>
            <CodeLines active={4} />
          </div>
          <motion.div
            className="col-span-5 bg-[#0d0d14]/95 p-4"
            animate={reduceMotion ? undefined : { x: [54, 54, 0, 0, 54], opacity: [0, 0, 1, 1, 0] }}
            transition={story(0.45, 5.8)}
          >
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">solution loading</div>
            <div className="mt-5 space-y-2">
              <div className="h-2 w-4/5 rounded bg-white/[0.12]" />
              <div className="h-2 w-full rounded bg-white/[0.08]" />
              <div className="h-2 w-2/3 rounded bg-white/[0.08]" />
            </div>
          </motion.div>
        </div>
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-30 text-white drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
          animate={reduceMotion ? undefined : {
            x: [70, 70, 158, 158, 158],
            y: [124, 124, 61, 61, 61],
            opacity: [0, 1, 1, 1, 0],
            scale: [0.96, 1, 0.86, 1, 1],
          }}
          transition={{
            duration: 5.8,
            repeat: Infinity,
            ease,
            times: [0, 0.16, 0.34, 0.43, 1],
          }}
        >
          <motion.span
            className="absolute -left-2 -top-2 h-8 w-8 rounded-full bg-white/10 blur-md"
            animate={reduceMotion ? undefined : { opacity: [0, 0.35, 0.65, 0.2, 0] }}
            transition={story(0.05, 5.8)}
          />
          <MousePointer2 size={22} fill="rgba(255,255,255,0.94)" strokeWidth={1.8} />
          <motion.span
            className="absolute -right-1 top-0 h-6 w-6 rounded-full border border-white/45"
            animate={reduceMotion ? undefined : { opacity: [0, 0, 0.9, 0, 0], scale: [0.45, 0.45, 1.55, 2.1, 2.1] }}
            transition={story(0.2, 5.8)}
          />
        </motion.div>
        <motion.div
          className="absolute left-1/2 top-1/2 z-20 w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.16] bg-white/[0.12] p-5 text-center backdrop-blur-2xl"
          animate={reduceMotion ? undefined : { opacity: [0, 0, 1, 1, 0], y: [22, 22, 0, 0, 14], scale: [0.9, 0.9, 1, 1, 0.96] }}
          transition={story(1.0, 5.8)}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 22px 70px rgba(0,0,0,0.45)" }}
        >
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.055] ring-1 ring-white/[0.12]">
            <Lock size={22} className="text-white" />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">Focus Mode Active</div>
          <div className="mt-3 text-[11px] font-medium text-zinc-300">Returned to problem</div>
        </motion.div>
      </DemoSurface>
    </BentoCard>
  );
}

function AiPlanner({ reduceMotion }) {
  const topics = [
    { label: "Arrays", x: 46, y: 70 },
    { label: "Two Pointers", x: 126, y: 48 },
    { label: "Sliding Window", x: 212, y: 82 },
    { label: "Trees", x: 292, y: 52 },
    { label: "Graphs", x: 374, y: 72 },
  ];
  const [activeTopic, setActiveTopic] = useState(0);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const interval = window.setInterval(() => {
      setActiveTopic((current) => (current + 1) % topics.length);
    }, 1250);

    return () => window.clearInterval(interval);
  }, [topics.length, reduceMotion]);

  return (
    <BentoCard className="min-h-[470px] md:col-span-6 lg:col-span-5">
      <CardText
        icon={Route}
        label="Smart study plan"
        title="Know exactly what to practice next."
        body="Set an interview goal and DeepFocus maps topics, revision days, and weak spots into a clear path."
      />
      <DemoSurface>
        <motion.div
          className="absolute left-5 right-5 top-5 flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200"
          animate={reduceMotion ? undefined : {
            borderColor: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.18)", "rgba(255,255,255,0.08)"],
            backgroundColor: ["rgba(255,255,255,0.04)", "rgba(255,255,255,0.07)", "rgba(255,255,255,0.04)"],
          }}
          transition={{ duration: 3.8, repeat: Infinity, ease }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <Sparkles size={14} className="shrink-0 text-zinc-300" />
            <motion.span
              className="truncate"
              animate={reduceMotion ? undefined : { opacity: [1, 0.78, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease }}
            >
              Prepare for interviews
            </motion.span>
          </div>
          <motion.span
            key={topics[activeTopic].label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 rounded-full border border-white/[0.10] bg-white/[0.055] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-300"
          >
            {topics[activeTopic].label}
          </motion.span>
        </motion.div>

        <svg className="absolute inset-x-6 top-[74px] h-36 w-[calc(100%-48px)]" viewBox="0 0 420 140" fill="none">
          <path
            d="M46 70 C86 28 108 34 126 48 C160 75 178 106 212 82 C246 58 260 28 292 52 C320 73 344 94 374 72"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="2"
          />
          <motion.path
            d="M46 70 C86 28 108 34 126 48 C160 75 178 106 212 82 C246 58 260 28 292 52 C320 73 344 94 374 72"
            stroke="rgba(255,255,255,0.68)"
            strokeWidth="2.4"
            strokeLinecap="round"
            animate={reduceMotion ? undefined : {
              pathLength: [(activeTopic + 1) / topics.length],
            }}
            transition={{ duration: 0.75, ease }}
          />
          {topics.map((topic, index) => {
            const active = activeTopic === index;
            const complete = activeTopic >= index;

            return (
              <g key={topic.label}>
                <motion.circle
                  cx={topic.x}
                  cy={topic.y}
                  r="16"
                  fill="rgba(255,255,255,0.035)"
                  stroke="rgba(255,255,255,0.08)"
                  animate={{
                    opacity: active ? 1 : 0.36,
                    scale: active ? 1.12 : 0.92,
                  }}
                  transition={{ duration: 0.45, ease }}
                />
                <motion.circle
                  cx={topic.x}
                  cy={topic.y}
                  r="4.5"
                  fill={complete ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.22)"}
                  animate={reduceMotion ? undefined : {
                    scale: active ? [1, 1.5, 1] : 1,
                  }}
                  transition={{ duration: 0.8, repeat: active ? Infinity : 0, ease }}
                />
              </g>
            );
          })}
        </svg>

        <div className="absolute left-6 right-6 top-[180px] grid grid-cols-5 gap-2">
          {topics.map((topic, index) => (
            <motion.div
              key={topic.label}
              className="flex h-9 items-center justify-center rounded-md border px-1 text-center text-[9px] font-semibold leading-tight"
              animate={{
                y: reduceMotion ? 0 : activeTopic === index ? -3 : 0,
                opacity: activeTopic >= index ? 1 : 0.46,
                color: activeTopic === index ? "rgba(255,255,255,0.96)" : "rgba(212,212,216,0.62)",
                borderColor: activeTopic === index ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)",
                backgroundColor: activeTopic === index ? "rgba(255,255,255,0.075)" : "rgba(255,255,255,0.025)",
              }}
              transition={{ duration: 0.5, ease }}
            >
              {topic.label}
            </motion.div>
          ))}
        </div>

        <div className="absolute bottom-5 left-6 right-6 grid grid-cols-7 gap-1.5">
          {Array.from({ length: 14 }).map((_, index) => (
            <div key={index} className="h-7 rounded-md bg-white/[0.035] p-1 ring-1 ring-white/[0.055]">
              <motion.div
                className="rounded-sm bg-white/45"
                style={{ height: `${36 + (index % 5) * 12}%` }}
                animate={reduceMotion ? undefined : {
                  opacity: activeTopic * 3 + 2 >= index ? 0.64 : 0.12,
                  scaleY: activeTopic * 3 + 2 >= index ? 1 : 0.45,
                }}
                transition={{ duration: 0.48, delay: (index % 3) * 0.04, ease }}
              />
            </div>
          ))}
        </div>
      </DemoSurface>
    </BentoCard>
  );
}

function RevisionMemory({ reduceMotion }) {
  const queueStates = [
    ["three-sum", "container", "palindrome"],
    ["container", "three-sum", "palindrome"],
    ["container", "palindrome", "three-sum"],
    ["three-sum", "container", "palindrome"],
  ];
  const problemCards = {
    container: {
      id: "container",
      title: "Container With Most Water",
      focus: "+68",
      reason: "Review soon",
    },
    "three-sum": {
      id: "three-sum",
      title: "3Sum",
      focus: "+85",
      reason: "Stable",
    },
    palindrome: {
      id: "palindrome",
      title: "Longest Palindromic",
      focus: "+92",
      reason: "Low urgency",
    },
  };
  const [queueStep, setQueueStep] = useState(0);
  const order = queueStates[queueStep];
  const activeId = order[0];
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 420, damping: 38, mass: 0.72 };

  useEffect(() => {
    if (reduceMotion) return undefined;

    const interval = window.setInterval(() => {
      setQueueStep((current) => (current + 1) % queueStates.length);
    }, 1850);

    return () => window.clearInterval(interval);
  }, [queueStates.length, reduceMotion]);

  return (
    <BentoCard className="min-h-[420px] md:col-span-3 lg:col-span-4">
      <CardText
        icon={Brain}
        label="Never forget solved problems"
        title="Weak problems come back before they fade."
        body="DeepFocus watches your focus quality and brings back questions that need another pass."
      />
      <DemoSurface>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_50%_0%,rgba(248,250,252,0.045),transparent_42%)]" />
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          <span>Revision Queue</span>
          <span className="text-zinc-300">Focus Quality</span>
        </div>

        <div className="absolute inset-x-0 bottom-4 top-10 overflow-hidden px-4 pt-4">
          <motion.div
            className="mx-auto flex w-[min(350px,100%)] flex-col gap-2"
            layout
            transition={spring}
          >
            {order.map((cardId) => {
              const card = problemCards[cardId];
              const active = card.id === activeId;

              return (
                <motion.div
                  key={card.id}
                  layout
                  className="relative h-[70px] overflow-hidden rounded-xl border bg-[#0a0a0a]/92 px-4 py-3 backdrop-blur-xl will-change-transform"
                  animate={{
                    scale: active ? 1 : 0.975,
                    opacity: active ? 1 : 0.66,
                    borderColor: active ? "rgba(249,115,22,0.34)" : "rgba(255,255,255,0.08)",
                    boxShadow: active
                      ? "0 18px 42px rgba(0,0,0,0.56), inset 0 1px 0 rgba(255,255,255,0.12)"
                      : "0 10px 24px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.055)",
                  }}
                  transition={spring}
                >
                  <motion.div
                    className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.055),transparent_46%,rgba(255,255,255,0.028))]"
                    animate={{ opacity: active ? 1 : 0.42 }}
                    transition={{ duration: 0.35, ease }}
                  />
                  <div className="relative z-10 flex h-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-[15px] font-semibold leading-5 text-white">{card.title}</h4>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Solved Problem</span>
                        {active && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-full border border-amber-300/[0.22] bg-amber-300/[0.08] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-100"
                          >
                            {card.reason}
                          </motion.span>
                        )}
                      </div>
                    </div>
                    <motion.div
                      className="shrink-0 rounded-full border px-2.5 py-1.5 text-[11px] font-bold"
                      animate={{
                        borderColor: active ? "rgba(249,115,22,0.42)" : "rgba(249,115,22,0.16)",
                        backgroundColor: active ? "rgba(249,115,22,0.20)" : "rgba(249,115,22,0.06)",
                        color: active ? "rgba(255,237,213,0.98)" : "rgba(255,237,213,0.58)",
                      }}
                      transition={{ duration: 0.35, ease }}
                    >
                      Focus {card.focus}
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </DemoSurface>
    </BentoCard>
  );
}

function AiInsights({ reduceMotion }) {
  const flow = (delay = 0) => ({
    duration: 8.4,
    delay,
    repeat: Infinity,
    ease,
  });

  return (
    <BentoCard className="min-h-[470px] md:col-span-3 lg:col-span-4">
      <CardText
        icon={ScanLine}
        label="Learn from failed submits"
        title="Mistakes turn into clear next steps."
        body="After a wrong attempt, DeepFocus explains the gap and saves what you should review."
      />
      <DemoSurface>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(248,250,252,0.04),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent_45%)]" />
        <div className="absolute inset-x-0 top-0 flex h-9 items-center justify-between border-b border-white/[0.06] bg-white/[0.025] px-3">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-zinc-600">
            <span className="h-2 w-2 rounded-full bg-white/20" />
            LeetCode
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" className="flex h-6 w-6 items-center justify-center rounded bg-white/[0.055] text-zinc-300 ring-1 ring-white/[0.08]">
              <Play size={11} fill="currentColor" />
            </button>
            <button type="button" className="rounded bg-white px-2.5 py-1 text-[10px] font-bold text-black shadow-[0_10px_24px_rgba(255,255,255,0.10)]">
              Submit
            </button>
          </div>
        </div>
        <motion.div
          className="absolute bottom-4 left-4 right-4 top-12 grid grid-cols-[0.95fr_1.15fr] overflow-hidden rounded-lg border border-white/[0.07] bg-black/30"
          animate={reduceMotion ? undefined : {
            opacity: [1, 1, 0.58, 0.58, 0.78, 1],
            filter: ["blur(0px)", "blur(0px)", "blur(1.2px)", "blur(1.2px)", "blur(0px)", "blur(0px)"],
          }}
          transition={{ ...flow(), times: [0, 0.34, 0.48, 0.72, 0.9, 1] }}
        >
          <div className="min-w-0 border-r border-white/[0.06] p-3">
            <div className="mb-3 flex min-w-0 gap-1 text-[9px] font-semibold">
              <span className="truncate rounded bg-white/[0.10] px-1.5 py-1 text-zinc-200">Description</span>
              <span className="truncate rounded bg-white/[0.035] px-1.5 py-1 text-zinc-500">Solutions</span>
            </div>
            <div className="mb-3 text-xs font-bold text-white">Two Sum</div>
            <CodeLines active={3} compact />
          </div>
          <div className="min-w-0 p-3">
            <div className="mb-3 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
              <span>Code</span>
              <span>C++</span>
            </div>
            <CodeLines active={4} color="rgba(212,212,216,0.68)" compact />
          </div>
        </motion.div>
        <motion.div
          className="absolute right-5 top-14 z-10 w-[min(184px,calc(100%-40px))] rounded-xl border border-white/[0.14] bg-[#111113]/95 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.58)] backdrop-blur-2xl"
          animate={reduceMotion ? undefined : {
            opacity: [0, 1, 1, 0, 0],
            y: [-8, 0, 0, -8, -8],
            scale: [0.98, 1, 1, 0.985, 0.985],
          }}
          transition={{ ...flow(), times: [0, 0.08, 0.34, 0.43, 1] }}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.11), 0 24px 70px rgba(0,0,0,0.58)" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-300">
              <Timer size={11} />
              DeepFocus
            </div>
            <span className="text-[10px] font-semibold text-zinc-400">18:42</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-md border border-white/[0.06] bg-white/[0.055] px-2 py-1.5 text-[9px] font-semibold text-zinc-400">
              <span>Score</span>
              <span className="text-emerald-300">94</span>
            </div>
            <motion.button
              type="button"
              className="w-full rounded-md bg-white px-2 py-1.5 text-[9px] font-bold text-black shadow-[0_10px_24px_rgba(255,255,255,0.13)]"
              animate={reduceMotion ? undefined : { scale: [1, 1, 0.94, 1, 1] }}
              transition={{ ...flow(), times: [0, 0.25, 0.29, 0.34, 1] }}
            >
              Stop Focus
            </motion.button>
          </div>
        </motion.div>
        <motion.div
          className="absolute left-1/2 top-[48%] z-20 w-[min(220px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.15] bg-[#171719]/95 p-4 backdrop-blur-2xl"
          animate={reduceMotion ? undefined : {
            opacity: [0, 0, 1, 1, 0, 0],
            y: [18, 18, 0, 0, -10, -10],
            scale: [0.96, 0.96, 1, 1, 0.985, 0.985],
          }}
          transition={{
            duration: 8.4,
            repeat: Infinity,
            ease,
            times: [0, 0.42, 0.5, 0.66, 0.72, 1],
          }}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 60px rgba(0,0,0,0.5)" }}
        >
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">
            <WandSparkles size={12} />
            AI Check
          </div>
          <div className="text-sm font-semibold leading-5 text-white">Analyze this attempt?</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              className="min-w-0 rounded-md bg-white px-3 py-2 text-xs font-bold text-black shadow-[0_12px_28px_rgba(255,255,255,0.12)]"
              animate={reduceMotion ? undefined : { scale: [1, 1, 0.96, 1, 1] }}
              transition={{ ...flow(), times: [0, 0.55, 0.59, 0.66, 1] }}
            >
              Analyze
            </motion.button>
            <button type="button" className="min-w-0 rounded-md border border-white/[0.10] bg-white/[0.045] px-3 py-2 text-xs font-semibold text-zinc-400">
              Skip
            </button>
          </div>
        </motion.div>
        <motion.div
          className="pointer-events-none absolute left-0 top-0 z-30 text-white drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
          animate={reduceMotion ? undefined : {
            x: ["calc(100% - 84px)", "calc(100% - 84px)", "calc(100% - 84px)", "calc(50% - 30px)", "calc(50% - 30px)", "calc(50% - 30px)"],
            y: [145, 145, 145, 204, 204, 204],
            opacity: [0, 1, 1, 1, 1, 0],
            scale: [0.95, 1, 0.86, 1, 0.86, 1],
          }}
          transition={{
            duration: 8.4,
            repeat: Infinity,
            ease,
            times: [0, 0.12, 0.29, 0.52, 0.6, 1],
          }}
        >
          <MousePointer2 size={20} fill="rgba(255,255,255,0.94)" strokeWidth={1.8} />
          <motion.span
            className="absolute -right-1 top-0 h-6 w-6 rounded-full border border-white/45"
            animate={reduceMotion ? undefined : { opacity: [0, 0.9, 0, 0, 0.9, 0], scale: [0.45, 1.65, 2.1, 0.45, 1.65, 2.1] }}
            transition={{
              duration: 8.4,
              repeat: Infinity,
              ease,
              times: [0, 0.29, 0.36, 0.52, 0.6, 1],
            }}
          />
        </motion.div>
        <motion.div
          className="absolute bottom-5 left-5 right-5 z-20 rounded-xl border border-white/[0.14] bg-[#101012]/96 p-3.5 backdrop-blur-2xl"
          animate={reduceMotion ? undefined : {
            opacity: [0, 0, 1, 1, 0],
            y: [16, 16, 0, 0, 10],
            scale: [0.98, 0.98, 1, 1, 0.99],
          }}
          transition={{ ...flow(), times: [0, 0.72, 0.79, 0.94, 1] }}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.11), 0 24px 70px rgba(0,0,0,0.52)" }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-200">
              <WandSparkles size={12} />
              AI Explanation
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80 shadow-[0_0_18px_rgba(52,211,153,0.5)]" />
          </div>
          <div className="grid gap-1.5 text-[10px] leading-4 text-zinc-300">
            <div className="rounded-md bg-white/[0.055] px-2 py-1">Track complements in a map.</div>
            <div className="rounded-md bg-white/[0.055] px-2 py-1">Return as soon as target is found.</div>
            <div className="px-2 text-zinc-500">Improvement saved for revision.</div>
          </div>
        </motion.div>
      </DemoSurface>
    </BentoCard>
  );
}

function RevisionWorkspace({ reduceMotion }) {
  return (
    <BentoCard className="min-h-[420px] md:col-span-6 lg:col-span-4">
      <CardText
        icon={Layers3}
        label="Focused review desk"
        title="Review the mistake without losing context."
        body="Code, notes, pseudocode, and prompts stay together so revision feels fast and useful."
      />
      <DemoSurface>
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-zinc-600">
          <span>Workspace</span>
          <motion.button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-white/[0.10] bg-white/[0.045] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-200 shadow-[0_12px_30px_rgba(0,0,0,0.28)]"
            animate={reduceMotion ? undefined : {
              backgroundColor: ["rgba(255,255,255,0.045)", "rgba(255,255,255,0.045)", "rgba(255,255,255,0.14)", "rgba(255,255,255,0.10)", "rgba(255,255,255,0.045)"],
              scale: [1, 1, 0.96, 1, 1],
            }}
            transition={story(0.72, 5.8)}
          >
            <WandSparkles size={12} />
            AI
          </motion.button>
        </div>
        <div className="absolute bottom-5 left-5 right-5 top-16 grid grid-cols-2 gap-3">
          <motion.div
            className="rounded-lg bg-white/[0.04] p-3 ring-1 ring-white/[0.07]"
            animate={reduceMotion ? undefined : { opacity: [0.35, 1, 1, 1, 0.5], x: [-12, 0, 0, 0, -8] }}
            transition={story(0.1, 5.8)}
          >
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              <Code2 size={12} />
              Code
            </div>
            <CodeLines active={4} compact />
          </motion.div>
          <motion.div
            className="rounded-lg border border-white/[0.10] bg-white/[0.045] p-3"
            animate={reduceMotion ? undefined : { opacity: [0, 0, 1, 1, 0.35], x: [12, 12, 0, 0, 8] }}
            transition={story(0.3, 5.8)}
          >
            <div className="mb-3 text-[10px] uppercase tracking-[0.14em] text-zinc-400">Pseudocode</div>
            <CodeLines active={3} color="rgba(212,212,216,0.62)" compact />
          </motion.div>
        </div>
        <motion.div
          className="absolute left-1/2 top-1/2 z-20 w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.15] bg-[#1a1a1d]/85 p-4 backdrop-blur-2xl"
          animate={reduceMotion ? undefined : { opacity: [0, 0, 1, 1, 0], y: [18, 18, 0, 0, 12], scale: [0.92, 0.92, 1, 1, 0.96] }}
          transition={story(1.05, 5.8)}
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 22px 60px rgba(0,0,0,0.5)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-200">
              <WandSparkles size={13} />
              AI Analysis
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-300/75" />
          </div>
          <div className="space-y-2">
            {["Pattern: sliding window", "Bug: stale left pointer", "Fix: shrink before score"].map((item, index) => (
              <motion.div
                key={item}
                className="rounded-md bg-white/[0.055] px-2.5 py-2 text-[11px] font-medium text-zinc-300 ring-1 ring-white/[0.07]"
                animate={reduceMotion ? undefined : { opacity: [0, 0, 1, 1, 0.25], x: [10, 10, 0, 0, 6] }}
                transition={story(1.18 + index * 0.12, 5.8)}
              >
                {item}
              </motion.div>
            ))}
          </div>
        </motion.div>
        <motion.div
          className="pointer-events-none absolute right-8 top-8 z-30 text-white drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
          animate={reduceMotion ? undefined : {
            opacity: [0, 1, 1, 1, 0],
            x: [-66, -66, 0, 0, 0],
            y: [58, 58, 0, 0, 0],
            scale: [0.95, 1, 0.86, 1, 1],
          }}
          transition={{
            duration: 5.8,
            repeat: Infinity,
            ease,
            times: [0, 0.18, 0.32, 0.42, 1],
          }}
        >
          <MousePointer2 size={20} fill="rgba(255,255,255,0.94)" strokeWidth={1.8} />
          <motion.div
            className="absolute -right-1 top-0 h-6 w-6 rounded-full border border-white/45"
            animate={reduceMotion ? undefined : { opacity: [0, 0, 0.9, 0, 0], scale: [0.45, 0.45, 1.55, 2.1, 2.1] }}
            transition={story(0.78, 5.8)}
          />
        </motion.div>
      </DemoSurface>
    </BentoCard>
  );
}

export default function Features() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className="landing-section text-white sm:px-8">
      <div className="pointer-events-none absolute right-[-16rem] top-24 h-[860px] w-[860px] rounded-full bg-[rgba(139,125,255,0.09)] blur-[320px]" />
      <div className="relative z-10 mx-auto max-w-[1240px]">
        <FeatureHeader />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
          <SolutionLockdown reduceMotion={reduceMotion} />
          <AiPlanner reduceMotion={reduceMotion} />
          <RevisionMemory reduceMotion={reduceMotion} />
          <AiInsights reduceMotion={reduceMotion} />
          <RevisionWorkspace reduceMotion={reduceMotion} />
        </div>
      </div>
    </section>
  );
}
