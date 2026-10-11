import { useEffect, useRef, useState } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
  ScanLine,
  Layers2,
  Route,
  FileText,
  ChartNoAxesCombined,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { Brand, Home, Technology, Business, Footer } from "./Marketing";
import {
  Scanner,
  ComparePage,
  Journey,
  Reports,
  Analytics,
  ClearRecords,
} from "./Platform";
import { emptyRecords, readRecords, writeRecords } from "./data";
import type { Records } from "./data";

const workspaceLinks = [
  { href: "/scanner", title: "AI Scanner", icon: ScanLine, n: "01" },
  { href: "/compare", title: "Compare", icon: Layers2, n: "02" },
  { href: "/journey", title: "Vehicle Journey", icon: Route, n: "03" },
  { href: "/reports", title: "Reports", icon: FileText, n: "04" },
  {
    href: "/analytics",
    title: "Analytics",
    icon: ChartNoAxesCombined,
    n: "05",
  },
];
export default function App() {
  const [location, setLocation] = useState(
      window.location.pathname + window.location.search,
    ),
    [menu, setMenu] = useState(false),
    [scrolled, setScrolled] = useState(window.scrollY > 32),
    [records, setRecords] = useState<Records>(emptyRecords),
    [loaded, setLoaded] = useState(false),
    [storageError, setStorageError] = useState(""),
    [service, setService] = useState("Connecting");
  const menuButton = useRef<HTMLButtonElement>(null),
    main = useRef<HTMLElement>(null),
    latest = useRef(records);
  const path = location.split("?")[0];
  const workspace = workspaceLinks.some((l) => l.href === path);
  useEffect(() => {
    let active = true;
    readRecords()
      .then((r) => {
        if (active) {
          latest.current = r;
          setRecords(r);
        }
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Browser storage is unavailable. Results can be reviewed, but saving may fail.",
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function update(next: Records) {
    await writeRecords(next);
    latest.current = next;
    setRecords(next);
  }
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    const onPop = () => {
      setLocation(window.location.pathname + window.location.search);
      setMenu(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
    };
  }, []);
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [menu]);
  useEffect(() => {
    document.title = `CarPrint — ${workspaceLinks.find((x) => x.href === path)?.title ?? (path === "/technology" ? "Technology" : path === "/business" ? "Business & Pilot" : "Track every vehicle. Detect every change.")}`;
  }, [path]);
  useEffect(() => {
    if (!workspace) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    setService("Connecting");
    fetch("/api/health", { signal: controller.signal })
      .then(async (r) => {
        if (
          !r.ok ||
          !r.headers.get("content-type")?.includes("application/json")
        )
          throw new Error();
        const body = await r.json();
        setService(
          body.status === "ok" ? "Processing online" : "Service unavailable",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setService("Service unavailable");
        else setService("Connection timed out");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [workspace]);
  return (
    <div
      onClick={(e) => {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        )
          return;
        const a = (e.target as Element).closest("a");
        if (!a || a.target || a.hasAttribute("download")) return;
        const url = new URL(a.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash
        ) {
          setMenu(false);
          return;
        }
        e.preventDefault();
        history.pushState(null, "", url.pathname + url.search + url.hash);
        setLocation(url.pathname + url.search);
        setMenu(false);
        window.scrollTo({ top: 0, behavior: "instant" });
        requestAnimationFrame(() => {
          if (url.hash)
            document.getElementById(url.hash.slice(1))?.scrollIntoView();
          else main.current?.focus({ preventScroll: true });
        });
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        className={`header ${scrolled || menu || path !== "/" ? "header-glass" : ""}`}
      >
        <Brand />
        <nav className={menu ? "nav open" : "nav"} aria-label="Main navigation">
          <a href="/#platform" onClick={() => setMenu(false)}>
            The platform
          </a>
          <a
            href="/journey"
            aria-current={path === "/journey" ? "page" : undefined}
          >
            Vehicle journey
          </a>
          <a
            href="/technology"
            aria-current={path === "/technology" ? "page" : undefined}
          >
            Technology
          </a>
          <a
            href="/business"
            aria-current={path === "/business" ? "page" : undefined}
          >
            Business & pilot
          </a>
          <a className="nav-cta" href="/scanner">
            Try live demo <ArrowUpRight size={17} />
          </a>
        </nav>
        <button
          className="menu-toggle"
          ref={menuButton}
          onClick={() => setMenu(!menu)}
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
        >
          {menu ? <X size={23} /> : <Menu size={23} />}
        </button>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        {path === "/" ? (
          <Home />
        ) : workspace ? (
          <div className="workspace-layout">
            <aside className="workspace-sidebar">
              <a className="back-home" href="/">
                <ArrowLeft size={14} /> Back to overview
              </a>
              <span className="eyebrow">INSPECTION WORKSPACE</span>
              <nav aria-label="Workspace navigation">
                {workspaceLinks.map((l) => (
                  <a
                    href={l.href}
                    key={l.href}
                    aria-current={path === l.href ? "page" : undefined}
                  >
                    <l.icon size={18} />
                    <span>{l.title}</span>
                    <small>{l.n}</small>
                  </a>
                ))}
              </nav>
              <div className="sidebar-note">
                <ShieldCheck size={21} />
                <strong>Your device. Your evidence.</strong>
                <p>
                  Saved inspections stay in this browser. You can clear them
                  anytime.
                </p>
                <ClearRecords onClear={() => update(emptyRecords)} />
              </div>
              <a className="sidebar-bottom" href="/technology">
                How the technology works <ArrowUpRight size={14} />
              </a>
            </aside>
            <div className="workspace-main">
              <div className="workspace-topline">
                <span className="mono">CARPRINT / VERIFICATION WORKSPACE</span>
                <span
                  className={`service-status ${service === "Processing online" ? "online" : ""}`}
                  role="status"
                >
                  <span />
                  {service}
                </span>
              </div>
              {storageError && (
                <p className="error-message" role="alert">
                  {storageError}
                </p>
              )}
              {!loaded ? (
                <p className="loading-page" role="status">
                  Opening your workspace…
                </p>
              ) : path === "/scanner" ? (
                <Scanner
                  count={records.inspections.length}
                  onSave={async (inspection) => {
                    if (latest.current.inspections.length >= 20)
                      throw new Error("Storage limit");
                    await update({
                      ...latest.current,
                      inspections: [...latest.current.inspections, inspection],
                    });
                  }}
                />
              ) : path === "/compare" ? (
                <ComparePage
                  records={records}
                  onSave={(c) =>
                    update({
                      ...latest.current,
                      comparisons: [...latest.current.comparisons, c].slice(
                        -20,
                      ),
                    })
                  }
                />
              ) : path === "/journey" ? (
                <Journey records={records} />
              ) : path === "/reports" ? (
                <Reports records={records} />
              ) : (
                <Analytics records={records} />
              )}
              <div className="workspace-bottom">
                <span>CARPRINT VERIFICATION AI</span>
                <span>Prototype · Human review required</span>
              </div>
            </div>
          </div>
        ) : path === "/technology" ? (
          <Technology />
        ) : path === "/business" ? (
          <Business />
        ) : (
          <>
            <section className="section editorial-page">
              <span className="eyebrow">404 / PAGE NOT FOUND</span>
              <h1>
                Let’s get you
                <br />
                back on the road.
              </h1>
              <a className="button button-primary" href="/">
                Return home <ArrowUpRight size={18} />
              </a>
            </section>
            <Footer />
          </>
        )}
      </main>
    </div>
  );
}
