import { Link } from "react-router-dom";
import { motion, useScroll, useMotionValueEvent, AnimatePresence, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import DeepFocusLogo from "./DeepFocusLogo";
import { cn } from "../lib/utils";

const navLinks = [
  { name: "Features", href: "/#features" },
  { name: "Workflow", href: "/#how-it-works" },
  { name: "Demo", href: "/#demo" },
];

export default function Navbar() {
  const { session, user, signOut } = useAuth();
  const linksRef = useRef(null);
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);
  
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverX, setHoverX] = useState(null);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious();
    if (latest > 100 && latest > previous && !isOpen && !avatarDropdownOpen) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    setScrolled(latest > 20);
  });

  const handleSignOut = async () => {
    setAvatarDropdownOpen(false);
    setIsOpen(false);
    await signOut();
  };

  const handleScrollToSection = (e, href) => {
    const matchingIndex = navLinks.findIndex((link) => link.href === href);
    if (matchingIndex >= 0) {
      setActiveIndex(matchingIndex);
    }

    if (href.startsWith("/#") && window.location.pathname === "/") {
      const id = href.split("#")[1];
      const element = document.getElementById(id);
      if (element) {
        e.preventDefault();
        element.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", href);
      }
    }
  };

  useEffect(() => {
    const syncActiveLink = () => {
      const currentHash = window.location.hash;
      const index = navLinks.findIndex((link) => link.href === `/${currentHash}`);
      if (index >= 0) {
        setActiveIndex(index);
      }
    };

    syncActiveLink();
    window.addEventListener("hashchange", syncActiveLink);
    return () => window.removeEventListener("hashchange", syncActiveLink);
  }, []);

  useEffect(() => {
    if (!linksRef.current) return;
    const nav = linksRef.current;

    const setActiveLight = () => {
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (!activeItem) return;

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;

      nav.style.setProperty("--ambience-x", `${targetX}px`);
      nav.style.setProperty("--spotlight-x", `${targetX}px`);
      ambienceX.current = targetX;
      spotlightX.current = targetX;
    };

    setActiveLight();
    window.addEventListener("resize", setActiveLight);
    return () => window.removeEventListener("resize", setActiveLight);
  }, [activeIndex]);

  useEffect(() => {
    if (!linksRef.current) return;
    const nav = linksRef.current;

    const handleMouseMove = (e) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (!activeItem) return;

      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;

      animate(spotlightX.current, targetX, {
        type: "spring",
        stiffness: 220,
        damping: 22,
        onUpdate: (value) => {
          spotlightX.current = value;
          nav.style.setProperty("--spotlight-x", `${value}px`);
        },
      });
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  useEffect(() => {
    if (!linksRef.current) return;
    const nav = linksRef.current;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
    if (!activeItem) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const targetX = itemRect.left - navRect.left + itemRect.width / 2;

    animate(ambienceX.current, targetX, {
      type: "spring",
      stiffness: 220,
      damping: 22,
      onUpdate: (value) => {
        ambienceX.current = value;
        nav.style.setProperty("--ambience-x", `${value}px`);
      },
    });
  }, [activeIndex]);

  return (
    <motion.div
      variants={{
        visible: { y: 0, opacity: 1 },
        hidden: { y: -80, opacity: 0 },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none"
    >
      <nav
        className={`
          relative
          pointer-events-auto
          flex items-center justify-between w-full max-w-[850px] h-12 px-2.5 rounded-full
          transition-all duration-500 border
          bg-zinc-950/60 border-white/[0.08] backdrop-blur-xl shadow-[0_24px_50px_-15px_rgba(0,0,0,0.8)]
          ${scrolled ? "border-white/[0.12] bg-black/75" : ""}
        `}
      >
        {/* Logo Section */}
        <Link to="/" className="px-3 py-1 group">
          <DeepFocusLogo
            markClassName="h-7 w-10 rounded-full border-white/[0.1] group-hover:border-white/20 group-hover:shadow-[0_0_24px_rgba(255,255,255,0.08)] transition-all"
            textClassName="text-[12px] uppercase tracking-[0.2em] group-hover:text-zinc-200 transition-colors"
          />
        </Link>

        {/* Center: Spotlight links */}
        <div
          ref={linksRef}
          className="hidden lg:flex relative h-full items-center overflow-hidden px-2"
        >
          <div
            className="pointer-events-none absolute inset-y-1 left-0 right-0 z-0 rounded-full transition-opacity duration-300"
            style={{
              opacity: hoverX !== null ? 1 : 0,
              background:
                "radial-gradient(120px circle at var(--spotlight-x) 100%, rgba(139,92,246,0.18) 0%, rgba(14,165,233,0.08) 28%, transparent 58%)",
            }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-2 right-2 z-[1] h-[2px]"
            style={{
              background:
                "radial-gradient(70px circle at var(--ambience-x) 0%, rgba(255,255,255,0.95) 0%, rgba(139,92,246,0.5) 38%, transparent 100%)",
            }}
          />

          {navLinks.map((link, idx) => (
            <a
              key={link.name}
              href={link.href}
              onClick={(e) => handleScrollToSection(e, link.href)}
              data-index={idx}
              className={cn(
                "relative z-10 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors duration-200 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/40",
                activeIndex === idx
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-100"
              )}
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Right Section: Auth Actions / Profile Menu */}
        <div className="flex items-center gap-2 relative pr-1.5">
          {session ? (
            <div className="relative flex items-center">
              {/* Click out overlay */}
              {avatarDropdownOpen && (
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setAvatarDropdownOpen(false)}
                />
              )}

              {/* Avatar trigger button */}
              <button
                onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                className="relative w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 border border-white/10 hover:border-violet-400 hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center justify-center overflow-hidden active:scale-95 cursor-pointer z-50"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-bold text-white uppercase">
                    {user?.email ? user.email[0] : "U"}
                  </span>
                )}
              </button>

              {/* Simple Standard Dropdown Menu */}
              <AnimatePresence>
                {avatarDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-full mt-3 w-52 p-2 rounded-2xl bg-zinc-950/95 border border-white/[0.08] backdrop-blur-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.9)] flex flex-col gap-0.5 z-50 overflow-hidden"
                  >
                    <div className="px-3 py-2 flex flex-col">
                      <span className="text-[9px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
                        Account
                      </span>
                      <span className="text-[11px] font-medium text-zinc-300 truncate mt-0.5">
                        {user?.email}
                      </span>
                    </div>

                    <div className="h-[1px] bg-white/[0.06] my-1" />

                    <Link
                      to="/revision"
                      onClick={() => setAvatarDropdownOpen(false)}
                      className="px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03]"
                    >
                      Revision Sheet
                    </Link>
                    <Link
                      to="/analytics"
                      onClick={() => setAvatarDropdownOpen(false)}
                      className="px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03]"
                    >
                      Analytics
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setAvatarDropdownOpen(false)}
                      className="px-3 py-2 text-[11px] font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.03]"
                    >
                      Settings
                    </Link>

                    <div className="h-[1px] bg-white/[0.06] my-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-3 py-2 text-[11px] font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/[0.04] transition-colors rounded-xl cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:block text-[11px] font-bold tracking-wider text-zinc-400 hover:text-zinc-100 uppercase px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wider text-black bg-white hover:bg-zinc-100 transition-all active:scale-95 shadow-[0_4px_12px_rgba(255,255,255,0.15)] uppercase"
              >
                Get Started
              </Link>
            </>
          )}

          {/* Mobile Menu trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white transition-all active:scale-90"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute top-full left-0 right-0 mt-2 p-3 rounded-3xl bg-zinc-950/95 border border-white/[0.08] backdrop-blur-xl flex flex-col gap-1 shadow-[0_20px_40px_rgba(0,0,0,0.9)] w-[85vw] max-w-[280px] mx-auto pointer-events-auto"
            >
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    setIsOpen(false);
                    handleScrollToSection(e, link.href);
                  }}
                  className="px-4 py-2 text-[11px] font-semibold tracking-wider text-zinc-400 hover:text-white uppercase transition-colors rounded-xl hover:bg-white/[0.03] cursor-pointer"
                >
                  {link.name}
                </a>
              ))}
              <div className="h-[1px] bg-white/[0.06] my-1" />
              {session ? (
                <div className="flex flex-col gap-1">
                  <Link
                    to="/revision"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-2 rounded-xl text-[11px] font-bold tracking-wider text-white border border-white/10 bg-white/[0.02] uppercase hover:bg-white/[0.04] transition-colors"
                  >
                    Revision Sheet
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-center py-2 rounded-xl text-[11px] font-bold tracking-wider text-rose-400 border border-rose-500/10 bg-rose-500/[0.02] uppercase hover:bg-rose-500/[0.04] transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-2 text-[11px] font-bold tracking-wider text-zinc-400 hover:text-white uppercase transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-2 rounded-xl text-[11px] font-bold tracking-wider text-black bg-white uppercase hover:bg-zinc-100 transition-colors shadow-lg"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.div>
  );
}
