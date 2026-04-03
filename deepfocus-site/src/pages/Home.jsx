function Home() {
  return (
    <>
      {/* Hero */}
      <div className="pt-24 pb-32">
        <div className="container mx-auto px-4 max-w-7xl py-20 text-center">
          <h1 className="text-7xl md:text-8xl font-black mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent leading-tight">
            DeepFocus
          </h1>
          <p className="text-2xl md:text-3xl mb-12 max-w-3xl mx-auto text-gray-300 leading-relaxed">
            Stop cheating yourself on LeetCode. A ruthless focus mode that blocks solutions, kills distractions, and forces real interview discipline.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="#"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-xl font-semibold px-12 py-5 rounded-2xl transition-all shadow-2xl hover:shadow-blue-500/25 transform hover:-translate-y-1 inline-block text-center"
            >
              Install Extension
            </a>
            <a
              href="/revision"
              className="border-2 border-gray-700 hover:border-blue-500 hover:bg-blue-500/10 text-xl font-semibold px-12 py-5 rounded-2xl transition-all hover:shadow-lg transform hover:-translate-y-1 inline-block text-center"
            >
              View Revision Sheet
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="py-32 bg-white/3 backdrop-blur-sm">
        <div className="container mx-auto px-4 max-w-7xl">
          <h2 className="text-5xl font-black mb-20 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent text-center">
            Features That Force Focus
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🔒', title: 'Solution Blocker', desc: 'Automatically detects and blocks solution pages, hints, and discussions.' },
              { icon: '🚫', title: 'Tab Lockdown', desc: 'Prevents tab switching and monitors for LeetCode distraction patterns.' },
              { icon: '📋', title: 'Paste Protection', desc: 'Disables copy-paste during sessions to force actual typing.' },
              { icon: '📊', title: 'Revision Tracking', desc: 'Logs every failure to your personal revision sheet.' },
              { icon: '😂', title: 'Roast Mode', desc: 'Savage motivational roasts when you try to cheat.' },
              { icon: '⚡', title: 'Session Analytics', desc: 'Track your focus streaks and improvement over time.' },
            ].map((feature, index) => (
              <div key={index} className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-300 hover:-translate-y-4 hover:shadow-2xl cursor-pointer">
                <div className="text-5xl mb-6 opacity-80 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-6 text-white">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl md:text-5xl font-black mb-8 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Ready to Stop Cheating?
          </h2>
          <p className="text-xl md:text-2xl mb-12 text-gray-300 max-w-2xl mx-auto">
            Install now and start building real LeetCode skills.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a href="#" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-xl font-bold px-12 py-6 rounded-2xl transition-all shadow-2xl hover:shadow-emerald-500/25 transform hover:-translate-y-2">
              Get Started Free
            </a>
            <a href="/guide" className="border-2 border-gray-700 hover:border-emerald-500 text-xl font-semibold px-12 py-6 rounded-2xl transition-all hover:bg-emerald-500/10 transform hover:-translate-y-1">
              See How It Works
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default Home;
