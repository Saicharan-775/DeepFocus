import Navbar from "../components/Navbar"
import Hero from "../components/Hero"
import ProblemSection from "../components/ProblemSection"
import Features from "../components/Features"
import Timeline from "../components/Timeline"
import RevisionPreview from "../components/RevisionPreview"
import Philosophy from "../components/Philosophy"
import FinalCTA from "../components/FinalCTA"
import Footer from "../components/Footer"

export default function LandingPage(){

return(

<div className="bg-black text-white">

<Navbar/>
<Hero/>
<ProblemSection/>
<Features/>
<Timeline/>
<FinalCTA/>

</div>

)

}