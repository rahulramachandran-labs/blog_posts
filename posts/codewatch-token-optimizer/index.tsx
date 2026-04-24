"use client";
import { useEffect, useState, useCallback } from "react";
import Script from "next/script";
import styles from "./styles.module.css";

const REDUCTION = {
  format:   { mid: 0.50 },
  skeleton: { mid: 0.875 },
};

function fmt(n: number) {
  return n.toLocaleString();
}

const ARCH_DIAGRAM = `graph TB
    subgraph User["👤 Developer"]
        direction TB
        CLI["CLI<br/>(token-optimizer watch)"]
    end

    subgraph Core["🐍 token_optimizer package"]
        direction TB
        MAIN["cli.py<br/>Argument parsing & dispatch"]
        WATCH["watcher.py<br/>Watchdog observer + event handler"]
        PRUNE["pruner.py<br/>AST / sqlglot / regex transforms"]
        HIST["history_manager.py<br/>codebase_map.md builder"]
        RULES["rules_generator.py<br/>Generates LLM rule files on startup"]
    end

    subgraph FS["📁 File System"]
        SRC["src_code_base/<br/>Original source files"]
        OUT["src_code_base_pruned/<br/>Token-optimised copies"]
        MAP["codebase_map.md<br/>Living codebase index"]
        RFILES[".cursorrules · CLAUDE.md<br/>.windsurfrules · copilot-instructions.md"]
    end

    subgraph AI["🤖 AI Tool (Cursor / Claude / Copilot / Windsurf)"]
        CTXW["Context Window"]
        RULECTX["Tool Rules Context"]
    end

    CLI --> MAIN
    MAIN --> WATCH
    MAIN --> RULES
    WATCH -->|"fs event"| PRUNE
    WATCH -->|"fs event"| HIST
    PRUNE -->|"writes pruned file"| OUT
    HIST -->|"updates index"| MAP
    RULES -->|"generates on startup"| RFILES
    SRC -->|"read"| PRUNE
    SRC -->|"read"| HIST
    OUT -->|"feed to AI"| CTXW
    MAP -->|"prepend as context"| CTXW
    RFILES -->|"auto-loaded by tool"| RULECTX
    RULECTX -->|"AI edits originals"| SRC

    style Core fill:#0f172a,stroke:#1e40af,color:#e2e8f0
    style FS fill:#0a1628,stroke:#065f46,color:#e2e8f0
    style AI fill:#0a1628,stroke:#6d28d9,color:#e2e8f0
    style User fill:#0a1628,stroke:#374151,color:#e2e8f0`;

const SEQ_DIAGRAM = `sequenceDiagram
    participant Dev as 👤 Developer
    participant CLI as cli.py
    participant Rules as rules_generator.py
    participant Watcher as watcher.py
    participant T1 as Thread 1 — Prune
    participant T2 as Thread 2 — Map
    participant Src as src_code_base/
    participant Out as src_code_base_pruned/
    participant Map as codebase_map.md
    participant AI as 🤖 AI Tool

    Dev->>CLI: token-optimizer watch --mode skeleton
    CLI->>Rules: generate()
    Note over Rules: Writes .cursorrules, CLAUDE.md,<br/>copilot-instructions.md, .windsurfrules
    Rules-->>CLI: ✓ 4 rule files written
    CLI->>Watcher: watch(mode="skeleton")
    Note over Watcher: Initial sync — prunes all files

    Dev->>Src: Save orders.py
    Src-->>Watcher: on_modified event
    Watcher->>Watcher: acquire _lock
    Watcher->>T1: _sync(path, mode)
    Watcher->>T2: hm.update_file(path)

    par Parallel execution
        T1->>Src: Read source file
        T1->>T1: prune_file() — AST skeleton
        T1->>Out: Write pruned copy
        T1-->>Watcher: ✓ saved N tokens
    and
        T2->>T2: Parse exports & docstring
        T2->>Map: Upsert file entry
        T2-->>Watcher: ✓ map updated
    end

    Dev->>AI: Paste codebase_map.md + skeleton files
    Note over AI: Rule file loaded:<br/>"Read pruned · Edit original"
    AI->>Dev: Identifies relevant files (5k tokens spent)
    Dev->>AI: Paste format-pruned target file
    AI->>Dev: Suggests fix
    AI->>Src: Edits src_code_base/orders.py directly
    Src-->>Watcher: on_modified fires again
    Note over Watcher: acquire _lock
    Watcher->>T1: _sync(path, mode)
    Watcher->>T2: hm.update_file(path)
    par Auto re-prune
        T1->>Src: Read updated source
        T1->>Out: Write updated pruned copy
    and
        T2->>Map: Update map entry
    end
    Watcher-->>Dev: ✓ pruned copy back in sync`;

export default function CodewatchPost() {
  const [currentMode, setCurrentMode] = useState<"format" | "skeleton">("format");
  const [tokenValue, setTokenValue] = useState(100000);
  const [activeDiag, setActiveDiag] = useState<"arch" | "seq">("arch");
  const [mermaidReady, setMermaidReady] = useState(false);

  const pct = REDUCTION[currentMode].mid;
  const after = Math.round(tokenValue * (1 - pct));
  const saved = tokenValue - after;
  const pctDisplay = Math.round(pct * 100);
  const sliderPct = ((tokenValue - 1000) / (500000 - 1000)) * 100;

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll(`.${styles.wrap} .reveal`);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const runMermaid = useCallback(() => {
    const m = (window as unknown as Record<string, unknown>).mermaid as {
      initialize: (cfg: unknown) => void;
      run: (opts?: unknown) => void;
    } | undefined;
    if (!m) return;
    m.run({ querySelector: ".mermaid" });
  }, []);

  const handleMermaidLoad = useCallback(() => {
    const m = (window as unknown as Record<string, unknown>).mermaid as {
      initialize: (cfg: unknown) => void;
      run: (opts?: unknown) => void;
    } | undefined;
    if (!m) return;
    m.initialize({
      startOnLoad: false,
      theme: "dark",
      themeVariables: {
        primaryColor: "#0f172a",
        primaryTextColor: "#e2e8f0",
        primaryBorderColor: "#1e40af",
        lineColor: "#3b82f6",
        secondaryColor: "#0a1628",
        tertiaryColor: "#0a1628",
        background: "#050d1a",
        mainBkg: "#0f172a",
        nodeBorder: "#1e40af",
        clusterBkg: "#0a1628",
        titleColor: "#e2e8f0",
        edgeLabelBackground: "#0f172a",
        fontSize: "14px",
      },
      flowchart: { curve: "basis", htmlLabels: true },
      sequence: { actorMargin: 60, messageMargin: 35, mirrorActors: false },
    });
    m.run({ querySelector: ".mermaid" });
    setMermaidReady(true);
  }, []);

  // Re-run mermaid when switching tabs (for the initially hidden panel)
  useEffect(() => {
    if (mermaidReady) {
      setTimeout(runMermaid, 50);
    }
  }, [activeDiag, mermaidReady, runMermaid]);

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"
        strategy="afterInteractive"
        onLoad={handleMermaidLoad}
      />

      <div className={styles.wrap}>
        {/* Background ambient orbs */}
        <div className="orb-wrap" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        <div className="ctw-main">

          {/* ─── HERO ─────────────────────────────────────────────────── */}
          <section className="hero" id="overview">
            <div className="hero-badge reveal">
              <div className="dot" />
              Open Source · Python · Works with Cursor · Claude · Copilot · Windsurf
            </div>
            <h1 className="reveal reveal-delay-1">
              Stop Feeding Your AI<br />the Whole Codebase
            </h1>
            <p
              className="reveal reveal-delay-2"
              style={{ fontSize: "0.875rem", color: "var(--text-3)", marginBottom: "0.5rem", marginTop: "0.75rem" }}
            >
              <a
                href="https://www.linkedin.com/in/rahulmenon91/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent-blue)", textDecoration: "none" }}
              >Rahul R</a>{" · Senior Director of Software Engineering"}
            </p>
            <p className="hero-sub reveal reveal-delay-2">
              codewatch-token-optimizer watches your source directory and produces token-minimal copies of every file — turning 100k tokens into 5k. Works out of the box with Cursor, Claude Code, GitHub Copilot, and Windsurf.
            </p>
            <p
              className="reveal reveal-delay-3"
              style={{ fontSize: "1rem", color: "var(--text-2)", fontWeight: 400, maxWidth: "600px", margin: "0 auto 1.5rem", lineHeight: 1.6, opacity: 0.85 }}
            >
              codewatch-token-optimizer is a Python CLI tool that watches your source directory and produces token-minimal copies — purpose-built for AI-powered systems and context windows.
            </p>
            <div className="hero-stats reveal reveal-delay-3">
              <div className="hero-stat">
                <div className="num">95%</div>
                <div className="label">Max Token Reduction</div>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <div className="num">4</div>
                <div className="label">File Type Strategies</div>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <div className="num">2</div>
                <div className="label">Optimization Modes</div>
              </div>
              <div className="stat-divider" />
              <div className="hero-stat">
                <div className="num">4</div>
                <div className="label">LLM Tools Supported</div>
              </div>
            </div>
          </section>

          {/* ─── BENTO GRID: MODES & STRATEGIES ───────────────────────── */}
          <section className="section" id="modes">
            <div className="section-label reveal">What it does</div>
            <h2 className="section-title reveal reveal-delay-1">Two Modes. One Goal.</h2>
            <p className="section-body reveal reveal-delay-2">
              Every file in your codebase gets a purpose-built transformation. Choose the right level of compression for the task.
            </p>

            <div className="bento">
              <div className="bento-card glass accent-blue span-7 reveal reveal-delay-1">
                <span className="card-icon">✂️</span>
                <h3>Format Mode <span className="pill pill-blue">Default</span></h3>
                <p>Strips docstrings, type annotations, and comments using Python AST. Every line of logic stays intact — your AI reads 40–60% fewer tokens while seeing 100% of the implementation.</p>
                <br />
                <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Best for: reading and understanding implementation detail</p>
              </div>

              <div className="bento-card glass accent-em span-5 reveal reveal-delay-2">
                <span className="card-icon">🦴</span>
                <h3>Skeleton Mode <span className="pill pill-em">95% Savings</span></h3>
                <p>Replaces every function body with <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>...</code>. Keeps full signatures including type hints. Transforms 100k tokens into 5k — perfect for architectural deep-dives.</p>
                <br />
                <p style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Best for: codebase mapping and architectural overview</p>
              </div>

              <div className="bento-card glass accent-pur span-4 reveal reveal-delay-1">
                <span className="card-icon">🗺️</span>
                <h3>codebase_map.md</h3>
                <p>A living index rebuilt on every file change — exports, classes, and purpose for every file. Give this to your AI before it reads anything else. It&apos;s the GPS before the zoom-in.</p>
              </div>

              <div className="bento-card glass accent-blue span-4 reveal reveal-delay-2">
                <span className="card-icon">⚡</span>
                <h3>Parallel Tasks</h3>
                <p>Every file-system event triggers two concurrent threads — one to prune and mirror to <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>src_code_base_pruned/</code>, one to refresh the map. Originals are never touched.</p>
              </div>

              <div className="bento-card glass accent-em span-4 reveal reveal-delay-3">
                <span className="card-icon">📜</span>
                <h3>Auto LLM Rules <span className="pill pill-em">New</span></h3>
                <p>On every <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>watch</code> start, generates rule files for <strong>Cursor</strong>, <strong>Claude Code</strong>, <strong>GitHub Copilot</strong>, and <strong>Windsurf</strong> — all from one source of truth in <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>rules_generator.py</code>. Tells every tool: <em>read from pruned, edit in original</em>.</p>
              </div>

              <div className="bento-card glass span-full reveal">
                <span className="card-icon">🤖</span>
                <h3>Generated Rule Files — One Source of Truth</h3>
                <table className="strategy-table">
                  <thead>
                    <tr>
                      <th>LLM Tool</th>
                      <th>File generated</th>
                      <th>Rule enforced</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cursor</td>
                      <td><code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>.cursorrules</code></td>
                      <td><span className="pill pill-blue">Read pruned · Edit original</span></td>
                    </tr>
                    <tr>
                      <td>Claude Code</td>
                      <td><code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>CLAUDE.md</code></td>
                      <td><span className="pill pill-blue">Read pruned · Edit original</span></td>
                    </tr>
                    <tr>
                      <td>GitHub Copilot</td>
                      <td><code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>.github/copilot-instructions.md</code></td>
                      <td><span className="pill pill-blue">Read pruned · Edit original</span></td>
                    </tr>
                    <tr>
                      <td>Windsurf</td>
                      <td><code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>.windsurfrules</code></td>
                      <td><span className="pill pill-blue">Read pruned · Edit original</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bento-card glass span-full reveal">
                <span className="card-icon">📋</span>
                <h3>Pruning Strategy by File Type</h3>
                <table className="strategy-table">
                  <thead>
                    <tr>
                      <th>Extension</th>
                      <th>Strategy</th>
                      <th>Engine</th>
                      <th>Typical Savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>.py</td>
                      <td>AST-based: strips docstrings/hints (format) or stubs all bodies (skeleton)</td>
                      <td><span className="pill pill-blue">ast module</span></td>
                      <td><span className="pill pill-em">40–95%</span></td>
                    </tr>
                    <tr>
                      <td>.sql .hql .hive .sparksql</td>
                      <td>Parse + reformat via sqlglot — normalizes whitespace and syntax</td>
                      <td><span className="pill pill-pur">sqlglot</span></td>
                      <td><span className="pill pill-blue">20–40%</span></td>
                    </tr>
                    <tr>
                      <td>.js .jsx .ts .tsx</td>
                      <td>Regex: removes block/line comments and console.* calls</td>
                      <td><span className="pill pill-blue">regex</span></td>
                      <td><span className="pill pill-blue">15–35%</span></td>
                    </tr>
                    <tr>
                      <td>Everything else</td>
                      <td>Generic: strips trailing whitespace, collapses blank lines</td>
                      <td><span className="pill pill-gray">built-in</span></td>
                      <td><span className="pill pill-gray">5–15%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ─── CODE COMPARE ────────────────────────────────────────── */}
          <section className="section">
            <div className="section-label reveal">Skeleton Mode in Action</div>
            <h2 className="section-title reveal reveal-delay-1">Before &amp; After</h2>
            <p className="section-body reveal reveal-delay-2">
              Watch a real Python class collapse from a dense implementation into a clean architectural skeleton — and the token count follow.
            </p>

            <div className="code-compare reveal reveal-delay-3">
              <div className="code-panel">
                <div className="code-label">
                  <div className="dot-red" /><div className="dot-yel" /><div className="dot-grn" />
                  <span>orders.py — Original</span>
                </div>
                <pre>
                  <span className="tok-keyword">class</span>{" "}<span className="tok-fn">OrderProcessor</span>:{"\n"}
                  {"    "}<span className="tok-str">&quot;&quot;&quot;Handles order creation and caching.&quot;&quot;&quot;</span>{"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">__init__</span>(<span className="tok-normal">self</span>) <span className="tok-normal">-{">"}</span> <span className="tok-type">None</span>:{"\n"}
                  {"        "}<span className="tok-comment"># Initialize the in-memory order cache</span>{"\n"}
                  {"        "}<span className="tok-normal">self</span>.<span className="tok-normal">cache</span>: <span className="tok-type">dict[int, dict]</span> = {"{}"}{"\n"}
                  {"        "}<span className="tok-normal">self</span>.<span className="tok-normal">_counter</span> = <span className="tok-normal">0</span>{"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">create_order</span>({"\n"}
                  {"        "}<span className="tok-normal">self</span>,{"\n"}
                  {"        "}<span className="tok-normal">user_id</span>: <span className="tok-type">int</span>,{"\n"}
                  {"        "}<span className="tok-normal">items</span>: <span className="tok-type">list[str]</span>{"\n"}
                  {"    "}) <span className="tok-normal">-{">"}</span> <span className="tok-type">dict</span>:{"\n"}
                  {"        "}<span className="tok-str">&quot;&quot;&quot;Create a new order and store it.&quot;&quot;&quot;</span>{"\n"}
                  {"        "}<span className="tok-normal">self</span>.<span className="tok-normal">_counter</span> += <span className="tok-normal">1</span>{"\n"}
                  {"        "}<span className="tok-normal">order</span> = {"{"}
                  <span className="tok-str">&quot;id&quot;</span>: <span className="tok-normal">self</span>.<span className="tok-normal">_counter</span>, <span className="tok-str">&quot;user&quot;</span>: <span className="tok-normal">user_id</span>, <span className="tok-str">&quot;items&quot;</span>: <span className="tok-normal">items</span>, <span className="tok-str">&quot;status&quot;</span>: <span className="tok-str">&quot;pending&quot;</span>{"}"}{"\n"}
                  {"        "}<span className="tok-normal">self</span>.<span className="tok-normal">cache</span>[<span className="tok-normal">user_id</span>] = <span className="tok-normal">order</span>{"\n"}
                  {"        "}<span className="tok-keyword">return</span> <span className="tok-normal">order</span>{"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">get_order</span>({"\n"}
                  {"        "}<span className="tok-normal">self</span>,{"\n"}
                  {"        "}<span className="tok-normal">user_id</span>: <span className="tok-type">int</span>{"\n"}
                  {"    "}) <span className="tok-normal">-{">"}</span> <span className="tok-type">dict | None</span>:{"\n"}
                  {"        "}<span className="tok-keyword">return</span> <span className="tok-normal">self</span>.<span className="tok-normal">cache</span>.<span className="tok-fn">get</span>(<span className="tok-normal">user_id</span>){"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">cancel_order</span>({"\n"}
                  {"        "}<span className="tok-normal">self</span>,{"\n"}
                  {"        "}<span className="tok-normal">user_id</span>: <span className="tok-type">int</span>{"\n"}
                  {"    "}) <span className="tok-normal">-{">"}</span> <span className="tok-type">bool</span>:{"\n"}
                  {"        "}<span className="tok-keyword">if</span> <span className="tok-normal">user_id</span> <span className="tok-keyword">in</span> <span className="tok-normal">self</span>.<span className="tok-normal">cache</span>:{"\n"}
                  {"            "}<span className="tok-keyword">del</span> <span className="tok-normal">self</span>.<span className="tok-normal">cache</span>[<span className="tok-normal">user_id</span>]{"\n"}
                  {"            "}<span className="tok-keyword">return</span> <span className="tok-type">True</span>{"\n"}
                  {"        "}<span className="tok-keyword">return</span> <span className="tok-type">False</span>
                </pre>
                <div className="token-badge before">⬆ ~320 tokens</div>
              </div>

              <div className="code-panel after">
                <div className="code-label">
                  <div className="dot-red" /><div className="dot-yel" /><div className="dot-grn" />
                  <span>orders.py — Skeleton Mode</span>
                </div>
                <pre>
                  <span className="tok-keyword">class</span>{" "}<span className="tok-fn">OrderProcessor</span>:{"\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">__init__</span>(<span className="tok-normal">self</span>) <span className="tok-normal">-{">"}</span> <span className="tok-type">None</span>:{"\n"}
                  {"        "}<span className="tok-ellipsis">...</span>{"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">create_order</span>({"\n"}
                  {"        "}<span className="tok-normal">self</span>,{"\n"}
                  {"        "}<span className="tok-normal">user_id</span>: <span className="tok-type">int</span>,{"\n"}
                  {"        "}<span className="tok-normal">items</span>: <span className="tok-type">list[str]</span>{"\n"}
                  {"    "}) <span className="tok-normal">-{">"}</span> <span className="tok-type">dict</span>:{"\n"}
                  {"        "}<span className="tok-ellipsis">...</span>{"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">get_order</span>({"\n"}
                  {"        "}<span className="tok-normal">self</span>,{"\n"}
                  {"        "}<span className="tok-normal">user_id</span>: <span className="tok-type">int</span>{"\n"}
                  {"    "}) <span className="tok-normal">-{">"}</span> <span className="tok-type">dict | None</span>:{"\n"}
                  {"        "}<span className="tok-ellipsis">...</span>{"\n\n"}
                  {"    "}<span className="tok-keyword">def</span>{" "}<span className="tok-fn">cancel_order</span>({"\n"}
                  {"        "}<span className="tok-normal">self</span>,{"\n"}
                  {"        "}<span className="tok-normal">user_id</span>: <span className="tok-type">int</span>{"\n"}
                  {"    "}) <span className="tok-normal">-{">"}</span> <span className="tok-type">bool</span>:{"\n"}
                  {"        "}<span className="tok-ellipsis">...</span>
                </pre>
                <div className="token-badge after">⬇ ~48 tokens — 85% reduction</div>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <a
                href="https://github.com/rahulramachandran-labs/codewatch-token-optimizer"
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Star on GitHub ↗
              </a>
            </div>
          </section>

          {/* ─── TOKEN CALCULATOR ────────────────────────────────────── */}
          <section className="section" id="calculator">
            <div className="section-label reveal">Interactive Demo</div>
            <h2 className="section-title reveal reveal-delay-1">Token Savings Calculator</h2>
            <p className="section-body reveal reveal-delay-2">Drag the slider to see how Token Optimizer scales with your codebase size.</p>

            <div className="calculator glass reveal reveal-delay-3">
              <div className="calc-title">Estimate Your Savings</div>
              <div className="calc-sub">Based on real measurements using tiktoken (cl100k_base, same encoding as GPT-4 / Claude)</div>

              <div className="calc-row">
                <div className="calc-group">
                  <label>Input token count</label>
                  <input
                    type="range"
                    className="calc-slider"
                    min={1000}
                    max={500000}
                    step={1000}
                    value={tokenValue}
                    onChange={(e) => setTokenValue(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, var(--accent-blue) 0%, var(--accent-blue) ${sliderPct}%, rgba(255,255,255,0.1) ${sliderPct}%)`,
                    }}
                  />
                  <div className="calc-val">{fmt(tokenValue)} tokens</div>
                </div>

                <div className="calc-group">
                  <label>Optimization Mode</label>
                  <div className="mode-toggle">
                    <button
                      className={`mode-btn${currentMode === "format" ? " active" : ""}`}
                      onClick={() => setCurrentMode("format")}
                    >
                      Format<br /><small style={{ fontWeight: 400, fontSize: "0.75rem", opacity: 0.7 }}>40–60% off</small>
                    </button>
                    <button
                      className={`mode-btn em${currentMode === "skeleton" ? " active" : ""}`}
                      onClick={() => setCurrentMode("skeleton")}
                    >
                      Skeleton<br /><small style={{ fontWeight: 400, fontSize: "0.75rem", opacity: 0.7 }}>80–95% off</small>
                    </button>
                  </div>
                </div>
              </div>

              <div className="calc-result">
                <div className="result-item">
                  <div className="result-num red">{fmt(tokenValue)}</div>
                  <div className="result-label">Tokens Before</div>
                </div>
                <div className="result-item">
                  <div className="result-num grn">{fmt(after)}</div>
                  <div className="result-label">Tokens After</div>
                </div>
                <div className="result-item">
                  <div className="result-num">{fmt(saved)}</div>
                  <div className="result-label">Tokens Saved</div>
                </div>
              </div>

              <div className="savings-bar-wrap">
                <div className="savings-pct-label">Reduction: <strong>{pctDisplay}%</strong></div>
                <div className="savings-bar-track">
                  <div className="savings-bar-fill" style={{ width: `${pctDisplay}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* ─── ZOOM-IN WORKFLOW ────────────────────────────────────── */}
          <section className="section" id="workflow">
            <div className="section-label reveal">The Strategy</div>
            <h2 className="section-title reveal reveal-delay-1">The Zoom-in Workflow</h2>
            <p className="section-body reveal reveal-delay-2">
              Context windows are finite. The zoom-in workflow solves the &quot;I can&apos;t fit my whole codebase&quot; bottleneck in three deliberate steps.
            </p>

            <div className="workflow-steps">
              <div className="step reveal reveal-delay-1" data-step="1">
                <div className="step-icon">🦴</div>
                <h4>Skeleton Scan</h4>
                <p>Start in <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>skeleton</code> mode. The entire codebase collapses to API signatures — 100k tokens becomes 5k. Feed the skeleton + <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>codebase_map.md</code> to your AI.</p>
              </div>
              <div className="step-arrow reveal reveal-delay-2">→</div>
              <div className="step reveal reveal-delay-2" data-step="2">
                <div className="step-icon">🗺️</div>
                <h4>Map Navigation</h4>
                <p>Read <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>codebase_map.md</code> to identify exactly which files matter for your task. The map shows exports, class names, and purpose — pinpoint your target.</p>
              </div>
              <div className="step-arrow reveal reveal-delay-3">→</div>
              <div className="step reveal reveal-delay-3" data-step="3">
                <div className="step-icon">🔬</div>
                <h4>Format Zoom-in</h4>
                <p>Switch to <code style={{ fontFamily: "monospace", background: "rgba(255,255,255,0.06)", padding: "2px 6px", borderRadius: 4, color: "var(--accent-em)" }}>format</code> mode for only the relevant files. Read the full logic without noise. You&apos;ve spent a fraction of the tokens to land in the right place.</p>
              </div>
            </div>
          </section>

          {/* ─── ARCHITECTURE DIAGRAMS ───────────────────────────────── */}
          <section className="section" id="architecture">
            <div className="section-label reveal">System Design</div>
            <h2 className="section-title reveal reveal-delay-1">Architecture &amp; Flow</h2>
            <p className="section-body reveal reveal-delay-2">C4-style component overview and the event-driven parallel execution model.</p>

            <div className="diagram-wrap glass reveal reveal-delay-3">
              <div className="diagram-tabs">
                <button
                  className={`diag-tab${activeDiag === "arch" ? " active" : ""}`}
                  onClick={() => setActiveDiag("arch")}
                >
                  C4 Component
                </button>
                <button
                  className={`diag-tab${activeDiag === "seq" ? " active" : ""}`}
                  onClick={() => setActiveDiag("seq")}
                >
                  Sequence Flow
                </button>
              </div>

              <div className={`diag-panel${activeDiag === "arch" ? " active" : ""}`} id="diag-arch">
                <div className="mermaid">{ARCH_DIAGRAM}</div>
              </div>

              <div className={`diag-panel${activeDiag === "seq" ? " active" : ""}`} id="diag-seq">
                <div className="mermaid">{SEQ_DIAGRAM}</div>
              </div>
            </div>
          </section>

          {/* ─── BLOG CONTENT ────────────────────────────────────────── */}
          <section className="section" id="blog">
            <div className="section-label reveal">Blog Post</div>
            <h2 className="section-title reveal reveal-delay-1">The Context Window Bottleneck Is Not a Model Problem</h2>

            <div className="blog-content glass reveal reveal-delay-2">
              <blockquote>
                &quot;I have 100k tokens of context. My codebase has 300k tokens of code. Something has to give — and it shouldn&apos;t be the signal.&quot;
              </blockquote>

              <p>
                If you&apos;ve worked with an AI coding assistant on a non-trivial project, you&apos;ve hit the wall. You paste a file, then another, then the model starts forgetting things from the beginning of the conversation. You&apos;re not misusing the tool — you&apos;re fighting a structural mismatch between how large codebases are written and how language models consume them.
              </p>

              <p>
                If you&apos;re working on a codebase that&apos;s larger than a few thousand lines and you&apos;re using any AI assistant — Cursor, Claude Code, GitHub Copilot, or Windsurf — this tool is for you. It&apos;s especially useful when you&apos;re onboarding to an unfamiliar repo, doing cross-cutting refactors, or debugging issues that span multiple modules. If your repo is under ~5k lines, you likely don&apos;t need this yet.
              </p>

              <p>The instinct is to reach for a bigger context window. That&apos;s the wrong lever.</p>

              <h2>The real problem: token density</h2>

              <p>
                Source code is not uniformly valuable. A Python file with 500 lines might contain 20 lines of actual architectural decisions — class names, method signatures, type contracts — and 480 lines of implementation detail, comments, docstrings, and whitespace that&apos;s only relevant <em>after</em> you&apos;ve decided this file is worth reading.
              </p>

              <p>
                When you paste that file wholesale into a context window, you&apos;re spending ~3,000 tokens to discover something a 150-token skeleton could have told you: <em>&quot;This file contains an <code>OrderProcessor</code> class with three methods.&quot;</em>
              </p>

              <p>The zoom-in workflow flips this. You compress the whole codebase first, navigate, then expand only what matters.</p>

              <h2>What codewatch-token-optimizer actually does</h2>

              <p>
                The tool runs a file-system watcher over your <code>src_code_base/</code> directory. On startup, before it watches anything, it does something most tools skip: it generates rule files for your AI tool — one source of truth that tells Cursor, Claude Code, GitHub Copilot, and Windsurf the same thing: <em>read from <code>src_code_base_pruned/</code>, edit in <code>src_code_base/</code></em>.
              </p>

              <p>Then, every time a file changes, two tasks fire in parallel threads:</p>

              <ul>
                <li><strong>Prune</strong> — applies a format- or structure-aware transformation and writes the result to <code>src_code_base_pruned/</code></li>
                <li><strong>Map</strong> — refreshes the file&apos;s entry in <code>codebase_map.md</code> with its exports and inferred purpose</li>
              </ul>

              <p>
                The pruning isn&apos;t naïve string stripping. Python files go through Python&apos;s own <code>ast</code> module — docstrings, annotations, and type hints are removed at the syntax tree level, not with regex. SQL files go through <strong>sqlglot</strong> for dialect-aware reformatting. JavaScript and TypeScript use targeted regex to drop block comments and <code>console.*</code> calls. Everything else gets generic whitespace compression.
              </p>

              <h2>The rule files problem nobody talks about</h2>

              <p>
                Here&apos;s the failure mode nobody warns you about when using pruned context: your AI tool suggests a fix, you paste it in, and it edits <code>src_code_base_pruned/orders.py</code> instead of the original. The pruned file is overwritten. The watcher re-prunes nothing because nothing in <code>src_code_base/</code> changed. You&apos;ve just lost the fix.
              </p>

              <p>
                The auto-generated rule files close this gap entirely. Every tool — Cursor via <code>.cursorrules</code>, Claude Code via <code>CLAUDE.md</code>, Copilot via <code>.github/copilot-instructions.md</code>, Windsurf via <code>.windsurfrules</code> — loads these files automatically and knows which directory is read-only context and which is the real codebase. All four files come from a single <code>rules_generator.py</code>, so changing the rule means changing it once.
              </p>

              <h2>Skeleton mode: the 95% reduction</h2>

              <p>
                Format mode keeps all logic. Skeleton mode is the aggressive one. It walks the AST and replaces every function and method body with a single <code>...</code>. Signatures and type annotations survive intact. The result looks like a protocol definition or a type stub — and that&apos;s exactly the point.
              </p>

              <p>
                On large Python codebases, skeleton mode routinely turns <strong>100,000 tokens into 5,000</strong>. That&apos;s not a cherry-picked benchmark — it&apos;s what happens when you strip all imperative logic from a codebase where the average function body is 15 lines and the average signature is 2.
              </p>

              <h2>The zoom-in workflow</h2>

              <p>Here&apos;s how a typical session looks after you install the tool:</p>

              <ul>
                <li>Run <code>token-optimizer watch --mode skeleton</code>. Rule files are written for your AI tool. The watcher produces a skeleton of your whole codebase and a <code>codebase_map.md</code> index.</li>
                <li>Paste <code>codebase_map.md</code> into your AI tool. Ask it to identify which files are relevant to your task. You&apos;ve spent roughly 2–5k tokens on a codebase that would have cost 200k.</li>
                <li>Switch to <code>--mode format</code> for the identified files. Paste those pruned versions. Now you&apos;re in the implementation — but only the part that matters, and without the noise.</li>
                <li>Your AI suggests an edit. Because the rule file is loaded, it edits <code>src_code_base/orders.py</code> (the original) — and the watcher re-prunes it automatically.</li>
              </ul>

              <p>The model gets better answers. You spend fewer tokens. The context window stops being the bottleneck.</p>

              <h2>Who this is for</h2>

              <p>
                It&apos;s a <strong>three-command install</strong>, zero configuration, never modifies your original files, and auto-configures every major LLM tool on first run:
              </p>
              <p>
                <code>git clone https://github.com/rahulramachandran-labs/codewatch-token-optimizer</code><br />
                <code>cd codewatch-token-optimizer &amp;&amp; pip install .</code><br />
                <code>token-optimizer watch</code>
              </p>

              <blockquote>
                The context window problem isn&apos;t going away. Models will get bigger, but codebases grow faster. The zoom-in workflow is the habit worth building now.
              </blockquote>
            </div>
          </section>

          {/* ─── CTA ─────────────────────────────────────────────────── */}
          <section className="cta-section reveal">
            <h2>Start Optimizing Today</h2>
            <p>Drop your codebase in. Watch the tokens collapse. Point your AI at the result.</p>
            <div className="cta-btns">
              <a
                href="https://github.com/rahulramachandran-labs/codewatch-token-optimizer"
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
                </svg>
                View on GitHub
              </a>
              <a href="#calculator" className="btn btn-secondary">Try the Calculator</a>
            </div>
            <div style={{
              marginTop: "2.5rem",
              padding: "1.5rem",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              textAlign: "center",
            }}>
              <div style={{ fontWeight: 600, fontSize: "1rem", color: "var(--text-1)", marginBottom: "0.25rem" }}>Rahul R</div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-3)", marginBottom: "1rem" }}>Senior Director of Software Engineering · Building AI-Powered Systems</div>
              <div style={{ display: "flex", justifyContent: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                <a
                  href="https://www.linkedin.com/in/rahulmenon91/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.9rem" }}
                >LinkedIn ↗</a>
                <a
                  href="https://github.com/rahulramachandran-labs"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.9rem" }}
                >GitHub ↗</a>
                <a
                  href="https://rahulramachandran-labs.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent-blue)", textDecoration: "none", fontSize: "0.9rem" }}
                >Portfolio ↗</a>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
