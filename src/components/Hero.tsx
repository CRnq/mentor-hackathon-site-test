import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GlitchCanvas } from "./GlitchCanvas";
import { LoadingScreen } from "./LoadingScreen";
import { BrandLogo } from "./BrandLogo";
import { AsciiLogo } from "./AsciiLogo";

const skills = ["CODE", "DESIGN", "CREATE", "CONNECT"];

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const loader = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [logoActive, setLogoActive] = useState(false);

  useGSAP(
    (_context, contextSafe) => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      let disposed = false;
      let ready = false;
      let started = false;
      let introComplete = false;
      const finish = () => {
        introComplete = true;
        setLogoActive(true);
        document.body.style.overflow = previousOverflow;
        setLoading(false);
      };
      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "power3.out" },
        onComplete: finish,
      });
      if (reducedMotion) {
        timeline
          .set(loader.current, { autoAlpha: 0 })
          .set(root.current, { autoAlpha: 1 });
      } else {
        timeline
          .to(loader.current, { autoAlpha: 0, duration: 0.25 })
          .set(loader.current, { attr: { "aria-hidden": "true" } })
          .set(root.current, { autoAlpha: 1 })
          .addLabel("reveal")
          .call(() => setLogoActive(true), [], "reveal")
          .fromTo(
            root.current,
            { x: -5, skewX: 0.35, filter: "drop-shadow(3px 0 #4EC5E5)" },
            {
              keyframes: [
                { x: 6, skewX: -0.45, duration: 0.12 },
                { x: -3, skewX: 0, duration: 0.18 },
                { x: 0, filter: "none", duration: 0.24 },
                {
                  x: 4,
                  skewX: 0.25,
                  filter: "drop-shadow(-3px 0 #4EC5E5)",
                  duration: 0.12,
                },
                { x: -2, skewX: -0.15, duration: 0.14 },
                { x: 0, skewX: 0, filter: "none", duration: 0.3 },
              ],
              ease: "steps(1)",
              immediateRender: false,
            },
            "reveal",
          )
          .fromTo(
            ".hero-logo",
            { opacity: 0, clipPath: "inset(0 0 100% 0)", x: -12 },
            {
              opacity: 1,
              clipPath: "inset(0 0 0% 0)",
              x: 0,
              duration: 0.25,
              ease: "power2.out",
            },
            "reveal",
          )
          .set(root.current, { clearProps: "transform,filter" }, "reveal+=1.1")
          .set(
            ".hero-logo",
            { clearProps: "clipPath,transform,opacity" },
            "reveal+=1.1",
          )
          .from(
            ".hero-sticker",
            { opacity: 0, x: -14, stagger: 0.08, duration: 0.4 },
            "reveal+=0.65",
          )
          .from(
            ".hero-dates",
            { opacity: 0, y: 22, duration: 0.55 },
            "reveal+=0.85",
          );
      }

      // Start only after the logo is decoded and the tab is actually visible.
      const start = contextSafe(() => {
        if (disposed || !ready || started || document.hidden) return;
        started = true;
        if (reducedMotion) {
          timeline.progress(1);
          // A zero-duration timeline can already be at its end before playback.
          if (!introComplete) finish();
        } else timeline.play(0);
      });
      let minimumTimer: ReturnType<typeof setTimeout>;
      let timeoutTimer: ReturnType<typeof setTimeout>;
      const minimum = new Promise<void>((resolve) => {
        minimumTimer = setTimeout(resolve, reducedMotion ? 0 : 700);
      });
      const timeout = new Promise<void>((resolve) => {
        timeoutTimer = setTimeout(resolve, 6000);
      });
      const images = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          ".hero img, .brand-loader img",
        ),
      );
      const assets = Promise.allSettled([
        ...images.map((image) => image.decode()),
        document.fonts.ready,
      ]);
      void Promise.all([minimum, Promise.race([assets, timeout])]).then(() => {
        if (disposed) return;
        clearTimeout(timeoutTimer);
        ready = true;
        start();
      });
      document.addEventListener("visibilitychange", start);

      const glitch = contextSafe(() => {
        if (!introComplete || reducedMotion) return;
        gsap
          .timeline()
          .to(".hero-logo", {
            x: -2,
            filter: "drop-shadow(4px 0 #4EC5E5)",
            duration: 0.055,
          })
          .to(".hero-logo", {
            x: 3,
            filter: "drop-shadow(-3px 0 #111318)",
            duration: 0.055,
          })
          .to(".hero-logo", { x: 0, filter: "none", duration: 0.09 });
      });
      const element = root.current;
      element?.addEventListener("pointerenter", glitch);
      return () => {
        disposed = true;
        clearTimeout(minimumTimer);
        clearTimeout(timeoutTimer);
        document.removeEventListener("visibilitychange", start);
        element?.removeEventListener("pointerenter", glitch);
        document.body.style.overflow = previousOverflow;
      };
    },
    { scope: root },
  );

  return (
    <>
      {loading && <LoadingScreen loaderRef={loader} />}
      <main
        ref={root}
        className={loading ? "intro-pending" : undefined}
        inert={loading}
      >
        <section
          className="hero"
          id="top"
          aria-label="全国メンターハッカソン2026"
        >
          <GlitchCanvas />
          <header className="site-header">
            <a className="site-brand" href="#top">
              <BrandLogo decorative />
              全国メンターハッカソン2026
            </a>
            <nav className="site-nav" aria-label="メインメニュー">
              <a href="#about">ABOUT</a>
              <a href="#rules">RULES</a>
              <a href="#schedule">SCHEDULE</a>
              <a href={`${import.meta.env.BASE_URL}results`}>RESULTS</a>
            </nav>
            <a className="entry-button" href="#about">
              ENTRY <span aria-hidden="true">↗</span>
            </a>
          </header>

          <div className="hero-layout">
            <div className="hero-note" aria-hidden="true">
              <p>
                [MENTOR]
                <br />
                [HACKATHON]
                <br />
                [2026]
              </p>
              <ul>
                {skills.map((s) => (
                  <li key={s}>// {s}</li>
                ))}
              </ul>
            </div>

            <div className="hero-art">
              <div className="hero-logo">
                <AsciiLogo active={logoActive} />
              </div>
            </div>

            <div className="hero-right" aria-hidden="true">
              <span className="hero-vertical">
                つながり、
                <br />
                つくる。
              </span>
              <p>
                ZENKOKU
                <br />
                MENTOR
                <br />
                HACKATHON
                <br />
                2026
              </p>
            </div>

            <div className="hero-dates">
              <span className="year">
                2026 <span>MENTOR HACKATHON</span>
              </span>
              <div className="date-line">
                <time dateTime="2026-11-09">11.09</time>
                <span className="day">MON</span>
                <span className="dash" />
                <time dateTime="2026-11-23">11.23</time>
                <span className="day">MON</span>
              </div>
              <p>全国のメンターが、つながり、つくる、特別な2週間。</p>
            </div>
          </div>
          <span className="hero-sticker sticker-left">CODE / DESIGN</span>
          <span className="hero-sticker sticker-right">CREATE / CONNECT</span>
        </section>
        <section className="next-placeholder" id="about">
          <span>ABOUT</span>
          <h2>全国メンターハッカソン</h2>
          <p>以下は未実装</p>
          <div id="rules" />
          <div id="schedule" />
        </section>
      </main>
    </>
  );
}
