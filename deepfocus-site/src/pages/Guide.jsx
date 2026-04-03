function Guide() {
  return (
    <div className="pt-24 pb-20">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-5xl md:text-6xl font-black mb-20 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent text-center">
          How DeepFocus Works
        </h1>
        <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
          <div>
            <h2 className="text-4xl font-bold mb-8 text-white">4 Simple Steps</h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              DeepFocus runs entirely in your browser. No accounts, no servers, just pure focus enforcement.
            </p>
            <ol className="space-y-8 text-lg">
              <li className="flex items-start">
                <div className="bg-emerald-500/80 w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold mr-4 mt-1 text-xl">1</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Install Extension</h3>
                  <p>Add to Chrome and pin to toolbar.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-emerald-500/80 w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold mr-4 mt-1 text-xl">2</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Start Session</h3>
                  <p>Click start on any LeetCode problem.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-emerald-500/80 w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold mr-4 mt-1 text-xl">3</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Solve Honestly</h3>
                  <p>Solutions blocked, tabs locked, paste disabled.</p>
                </div>
              </li>
              <li className="flex items-start">
                <div className="bg-emerald-500/80 w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center font-bold mr-4 mt-1 text-xl">4</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Review Progress</h3>
                  <p>Track failures and improve here.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="relative">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-12 border border-white/10 shadow-2xl">
              <div className="text-6xl mb-8 text-emerald-400">⚡</div>
              <h3 className="text-3xl font-bold mb-6 text-white">Real Focus</h3>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">No fake interviews. Build skills that actually land jobs.</p>
              <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-emerald-500/25 transform hover:-translate-y-1">
                Get Extension Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Guide;
