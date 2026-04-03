const steps = [
  {
    title: "Install & Pin",
    desc: "Add DeepFocus to Chrome and pin it so focus mode is one click away.",
    time: "30 sec",
    cue: "Setup",
  },
  {
    title: "Open the Problem",
    desc: "Start any LeetCode challenge the way you already do.",
    time: "Instant",
    cue: "Start",
  },
  {
    title: "Lock the Noise",
    desc: "Solutions and shortcut paths stay hidden while your timer is active.",
    time: "15 min",
    cue: "Guard",
  },
  {
    title: "Queue Revisions",
    desc: "Missed attempts are logged automatically so weak areas get revisited.",
    time: "Auto",
    cue: "Review",
  },
];

export default function Timeline() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#030303] timeline-v5-shell">
      <div className="timeline-v5-wash" aria-hidden="true" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="timeline-v5-kicker">How It Works</p>
          <h2 className="text-4xl md:text-5xl text-white tracking-tight mb-4">
            Seamless integration into workflow
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            A clean four-step flow that keeps your process intentional, focused, and reviewable.
          </p>
        </div>

        <div className="timeline-v5-grid">
          {steps.map((step, index) => (
            <article key={step.title} className="timeline-v5-card" style={{ animationDelay: `${index * 120}ms` }}>
              <div className="timeline-v5-head">
                <span className="timeline-v5-step">{String(index + 1).padStart(2, "0")}</span>
                <span className="timeline-v5-cue">{step.cue}</span>
              </div>

              <h4 className="text-white text-xl font-medium tracking-tight mb-2">{step.title}</h4>
              <p className="text-gray-300 leading-relaxed mb-5">{step.desc}</p>

              <div className="timeline-v5-foot">
                <span className="timeline-v5-time">{step.time}</span>
                <span className="timeline-v5-seed" aria-hidden="true" />
              </div>
            </article>
          ))}
        </div>

        <div className="timeline-v5-divider" aria-hidden="true" />
      </div>
    </section>
  );
}
