"use client";

import { useEffect, useState } from "react";
import { Logo, LogoMark } from "@/components/Logo";
import { StaffConsole } from "@/components/StaffConsole";

const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

type VerifyState = "checking" | "success" | "error" | "unconfigured";

const FEATURES = [
  {
    icon: "🛡️",
    title: "Verified students only",
    body: "Every member proves they're a real student with a school ID and course form, reviewed before they're let in. No outsiders, ever.",
    accent: "green" as const,
  },
  {
    icon: "🔥",
    title: "The Dope reward system",
    body: "Earn XP and gems for genuine participation — not vanity metrics. Climb 15 levels from Freshman to GOAT.",
    accent: "green" as const,
  },
  {
    icon: "💬",
    title: "Real-time messaging & calls",
    body: "Private DMs, group chats, voice notes, and crisp WebRTC voice & video calls with your campus crew.",
    accent: "cyan" as const,
  },
  {
    icon: "📍",
    title: "Campus discovery",
    body: "Find friends on the live map, drop into events and stories, and see what your campus is doing right now.",
    accent: "cyan" as const,
  },
  {
    icon: "🛍️",
    title: "Student marketplace",
    body: "Buy, sell, and back student-run brands inside a trusted, campus-only marketplace.",
    accent: "green" as const,
  },
  {
    icon: "🤖",
    title: "CC, your campus AI",
    body: "Research any topic, transcribe lectures on the fly, and export clean study PDFs — powered by Gemini.",
    accent: "cyan" as const,
  },
];

const LEVELS = [
  { name: "Freshman", emoji: "🌱" },
  { name: "Rising Star", emoji: "🔥" },
  { name: "Campus Legend", emoji: "💎" },
  { name: "GOAT", emoji: "🌌" },
];

const STEPS = [
  {
    n: "01",
    title: "Sign up with your school email",
    body: "Create your account and confirm your email — the first signal that you belong on campus.",
  },
  {
    n: "02",
    title: "Upload your ID & course form",
    body: "Submit a school ID and current course registration so we can confirm you're an enrolled student.",
  },
  {
    n: "03",
    title: "Campus ops admits you",
    body: "Our team reviews your documents and admits you to the private campus, usually within hours.",
  },
];

function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function VerifyOverlay() {
  const [state, setState] = useState<VerifyState>("checking");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get("oobCode");
    if (!oobCode) return;
    if (!firebaseApiKey) {
      setState("unconfigured");
      return;
    }
    fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oobCode }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("verify failed");
        setState("success");
      })
      .catch(() => setState("error"));
  }, []);

  const copy: Record<VerifyState, { icon: string; title: string; body: string; tone: string }> = {
    checking: {
      icon: "…",
      title: "Verifying your email",
      body: "Hang tight — confirming your link with CampusConnect.",
      tone: "neutral",
    },
    success: {
      icon: "✓",
      title: "Email verified",
      body: "You're all set. Head back to the CampusConnect app to finish setting up your campus profile.",
      tone: "ok",
    },
    error: {
      icon: "!",
      title: "Link expired or invalid",
      body: "This verification link can't be used. Request a fresh one from inside the app and try again.",
      tone: "err",
    },
    unconfigured: {
      icon: "!",
      title: "Verification unavailable",
      body: "Email verification isn't configured for this deployment yet. Please contact support.",
      tone: "err",
    },
  };
  const c = copy[state];

  return (
    <main className="verify-screen">
      <div className="bg-orbs" aria-hidden />
      <div className={`verify-card reveal in verify-${c.tone}`}>
        <LogoMark size={52} />
        <div className={`verify-mark verify-mark-${c.tone}`}>
          <span>{c.icon}</span>
        </div>
        <h1>{c.title}</h1>
        <p>{c.body}</p>
        <div className="verify-actions">
          <a className="btn btn-primary" href="campusconnect://">
            Open the app
          </a>
          <a className="btn btn-ghost" href="/">
            Back to home
          </a>
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isVerifyMode, setIsVerifyMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useScrollReveal();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "verifyEmail" && params.get("oobCode")) {
      setIsVerifyMode(true);
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isVerifyMode) return <VerifyOverlay />;

  return (
    <>
      <div className="bg-orbs" aria-hidden />
      <div className="bg-grid" aria-hidden />

      <header className={`nav ${scrolled ? "nav-scrolled" : ""}`}>
        <div className="container nav-inner">
          <a className="nav-logo" href="#top" aria-label="CampusConnect home">
            <Logo size={34} />
          </a>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#levels">Levels</a>
          </nav>
          <div className="nav-actions">
            <button className="nav-staff" onClick={() => setConsoleOpen(true)}>
              Staff
            </button>
            <a className="btn btn-primary btn-sm" href="#get">
              Get the app
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero container">
          <div className="hero-copy reveal">
            <span className="eyebrow">
              <span className="dot" /> Students only · invite-tight
            </span>
            <h1>
              The private campus,
              <br />
              built for <span className="grad">students only</span>.
            </h1>
            <p className="lede">
              CampusConnect is a verified, student-only social network — short-form posts, real-time
              messaging, campus discovery, and the Dope reward system. No outsiders. No noise.
            </p>
            <div className="hero-cta">
              <a className="btn btn-primary btn-lg" href="#get">
                Get the app
              </a>
              <a className="btn btn-ghost btn-lg" href="#how">
                See how verification works
              </a>
            </div>
            <ul className="trust-strip">
              <li>
                <strong>15</strong>
                <span>ascension levels</span>
              </li>
              <li>
                <strong>0</strong>
                <span>outsiders allowed</span>
              </li>
              <li>
                <strong>OLED</strong>
                <span>dark by default</span>
              </li>
            </ul>
          </div>

          <div className="hero-art reveal">
            <div className="phone">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="ps-top">
                  <LogoMark size={26} />
                  <span className="ps-name">CampusConnect</span>
                  <span className="ps-level">Lv 7 🔥</span>
                </div>
                <div className="ps-card ps-card-hero">
                  <div className="ps-avatar" />
                  <div className="ps-lines">
                    <i style={{ width: "62%" }} />
                    <i style={{ width: "40%" }} />
                  </div>
                  <span className="ps-dope">+25 ✦</span>
                </div>
                <div className="ps-media" />
                <div className="ps-row">
                  <span className="ps-chip">🔥 Dope</span>
                  <span className="ps-chip">💬 Reply</span>
                  <span className="ps-chip ps-chip-cyan">↗ Share</span>
                </div>
                <div className="ps-card">
                  <div className="ps-avatar ps-avatar-cyan" />
                  <div className="ps-lines">
                    <i style={{ width: "70%" }} />
                    <i style={{ width: "52%" }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="float-badge fb-1">🛡️ Verified</div>
            <div className="float-badge fb-2">✦ +250 XP</div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="section container">
          <div className="section-head reveal">
            <span className="eyebrow">Why CampusConnect</span>
            <h2>A campus that actually feels private.</h2>
            <p>
              Built dark-first and student-native — energetic and socially alive, without ever
              making safety or real conversation feel secondary.
            </p>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className={`card feature reveal feature-${f.accent}`}
                style={{ transitionDelay: `${(i % 3) * 70}ms` }}
              >
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* LEVELS */}
        <section id="levels" className="section container">
          <div className="levels-band reveal">
            <div className="levels-copy">
              <span className="eyebrow">The Dope system</span>
              <h2>Rewarded for being real.</h2>
              <p>
                Posting, commenting, showing up — genuine participation earns XP and gems and moves
                you up the ranks. No casino, no empty clout. Just status you actually earned.
              </p>
            </div>
            <div className="levels-track">
              {LEVELS.map((l, i) => (
                <div className="level-chip" key={l.name}>
                  <span className="level-emoji">{l.emoji}</span>
                  <span className="level-name">{l.name}</span>
                  {i < LEVELS.length - 1 && <span className="level-arrow">→</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="section container">
          <div className="section-head reveal">
            <span className="eyebrow">Students-only, enforced</span>
            <h2>How we keep outsiders out.</h2>
            <p>Three steps stand between the open internet and your campus.</p>
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <article
                className="card step reveal"
                key={s.n}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="get" className="section container">
          <div className="cta reveal">
            <div className="cta-glow" aria-hidden />
            <LogoMark size={56} />
            <h2>Ready to join your campus?</h2>
            <p>Download CampusConnect, verify once, and walk into a campus that's all students.</p>
            <div className="store-row">
              <a className="store-btn" href="#" aria-label="Download on the App Store">
                <span className="store-glyph"></span>
                <span className="store-text">
                  <small>Download on the</small>
                  <strong>App Store</strong>
                </span>
              </a>
              <a className="store-btn" href="#" aria-label="Get it on Google Play">
                <span className="store-glyph">▶</span>
                <span className="store-text">
                  <small>Get it on</small>
                  <strong>Google Play</strong>
                </span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="footer-brand">
            <Logo size={32} />
            <p>The private campus. Students only.</p>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how">Verification</a>
            <a href="#levels">Levels</a>
            <a href="mailto:developers@nerdbug.io">Contact</a>
            <button className="footer-staff" onClick={() => setConsoleOpen(true)}>
              Staff access
            </button>
          </div>
        </div>
        <div className="container footer-base">
          <span>© {new Date().getFullYear()} CampusConnect</span>
          <span>Private · vibrant · competitive</span>
        </div>
      </footer>

      <StaffConsole open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </>
  );
}
