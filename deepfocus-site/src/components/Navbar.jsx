import { Icon } from "@iconify/react"

export default function Navbar(){

return(

<nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/60 border-b border-white/5">

<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

<div className="flex items-center gap-2">

<Icon icon="solar:target-linear" width="24"/>

<span className="text-lg font-medium tracking-tighter text-white">
DEEPFOCUS
</span>

</div>


<div className="hidden md:flex items-center gap-8 text-sm text-gray-400 font-medium">

<a href="#features" className="hover:text-white transition-colors">
Features
</a>

<a href="#how-it-works" className="hover:text-white transition-colors">
How it works
</a>

        <a href="/today" className="hover:text-white transition-colors">
          Mission
        </a>

        <a href="/revision" className="hover:text-white transition-colors">
          Revision Sheet
        </a>

        <a href="/insights" className="hover:text-white transition-colors">
          Insights
        </a>

      </div>


      <a href="/today" className="bg-yellow-400 text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-yellow-300 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-yellow-400/10">
        My Dashboard
      </a>

</div>

</nav>

)

}