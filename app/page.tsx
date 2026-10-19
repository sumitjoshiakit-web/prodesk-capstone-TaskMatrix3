"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getSupabase,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Filter = "all" | TaskStatus;
type Draft = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
};
const blankDraft: Draft = {
  title: "",
  description: "",
  status: "todo",
  priority: "Medium",
  due_date: "",
};
const statusLabel: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Completed",
};
const formatDate = (value: string | null) =>
  value
    ? new Date(
        value + (value.length === 10 ? "T00:00:00" : ""),
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No due date";

export default function Home() {
  const supabase = useMemo(() => getSupabase(), []);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [busy, setBusy] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loadTasks = useCallback(
    async (userId: string) => {
      if (!supabase) return;
      setLoadingTasks(true);
      const { data, error: queryError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (queryError)
        setError(
          queryError.message.includes("relation")
            ? "Tasks table not found. Run the SQL in supabase/schema.sql in your Supabase SQL Editor."
            : queryError.message,
        );
      else {
        setTasks((data ?? []) as Task[]);
        setError("");
      }
      setLoadingTasks(false);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ?? null);
      setReady(true);
      if (data.session?.user) void loadTasks(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!alive) return;
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        if (nextUser) void loadTasks(nextUser.id);
        else setTasks([]);
      },
    );
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadTasks]);

  // Keep the Sprint 14 route vocabulary while retaining the existing Supabase browser session.
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const path = window.location.pathname;
    if (user && path !== "/dashboard") {
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (!user && path === "/dashboard") {
      setAuthMode("login");
      window.history.replaceState({}, "", "/login");
      return;
    }
    if (!user && (path === "/login" || path === "/register")) {
      setAuthMode(path === "/register" ? "signup" : "login");
    }
  }, [ready, user]);

  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          (filter === "all" || task.status === filter) &&
          (task.title.toLowerCase().includes(search.toLowerCase()) ||
            (task.description ?? "")
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [tasks, filter, search],
  );

  const metrics = useMemo(
    () => ({
      total: tasks.length,
      done: tasks.filter((t) => t.status === "done").length,
      progress: tasks.filter((t) => t.status === "in_progress").length,
      overdue: tasks.filter(
        (t) =>
          t.due_date &&
          t.due_date < new Date().toISOString().slice(0, 10) &&
          t.status !== "done",
      ).length,
    }),
    [tasks],
  );
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const key = date.toISOString().slice(0, 10);
      return {
        date: date.toLocaleDateString("en-IN", { weekday: "short" }),
        completed: tasks.filter(
          (t) => t.status === "done" && t.updated_at?.slice(0, 10) === key,
        ).length,
      };
    });
    return days;
  }, [tasks]);

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };
  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { full_name: fullName.trim() } },
          })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
    setBusy(false);
    if (result.error) setError(result.error.message);
    else if (authMode === "signup" && !result.data.session)
      setNotice(
        "Account created. Check your email to confirm your address, then sign in.",
      );
    else
      setNotice(
        authMode === "signup"
          ? "Account created successfully."
          : "Welcome back.",
      );
  }
  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setTasks([]);
    setError("");
  }
  function openCreate() {
    setSelected(null);
    setDraft(blankDraft);
    setError("");
    setModal("create");
  }
  function openEdit(task: Task) {
    setSelected(task);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? "",
    });
    setError("");
    setModal("edit");
  }
  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    const title = draft.title.trim();
    if (!title) {
      setError("Please enter a task title.");
      return;
    }
    if (title.length > 120) {
      setError("Task title must be 120 characters or fewer.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      title,
      description: draft.description.trim() || null,
      status: draft.status,
      priority: draft.priority,
      due_date: draft.due_date || null,
    };
    const result =
      modal === "edit" && selected
        ? await supabase
            .from("tasks")
            .update(payload)
            .eq("id", selected.id)
            .eq("user_id", user.id)
            .select()
            .single()
        : await supabase
            .from("tasks")
            .insert({ ...payload, user_id: user.id })
            .select()
            .single();
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (modal === "edit" && selected)
      setTasks((prev) =>
        prev.map((t) => (t.id === selected.id ? (result.data as Task) : t)),
      );
    else setTasks((prev) => [result.data as Task, ...prev]);
    setModal(null);
    setSelected(null);
    setDraft(blankDraft);
    notify(
      modal === "edit"
        ? "Task updated successfully."
        : "Task created and saved to the cloud.",
    );
  }
  async function deleteTask() {
    if (!supabase || !user || !selected) return;
    setBusy(true);
    setError("");
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", selected.id)
      .eq("user_id", user.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== selected.id));
    setModal(null);
    setSelected(null);
    notify("Task permanently deleted.");
  }
  async function toggleComplete(task: Task) {
    if (!supabase || !user) return;
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    const { data, error: updateError } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? (data as Task) : t)),
    );
    notify(
      nextStatus === "done"
        ? "Nice work — task completed."
        : "Task moved back to To do.",
    );
  }

  if (!ready)
    return (
      <div className="loading">
        <div>
          <div className="spinner" />
          <div>Preparing your workspace…</div>
        </div>
      </div>
    );
  if (!supabase)
    return (
      <main className="auth-wrap">
        <section className="auth-art">
          <a className="brand" href="/" aria-label="TaskMatrix home">
            <span className="brand-mark">T</span>
            <span>
              task<span className="brand-light">matrix</span>
            </span>
          </a>
          <div className="auth-content">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> YOUR WORKSPACE, REFOCUSED
            </span>
            <h1>
              Make room for
              <br />
              <span>meaningful work.</span>
            </h1>
            <p className="auth-description">
              A calmer way to organize the work that moves you forward. Pick up
              where your best ideas begin.
            </p>
            <div className="feature-list">
              <div>
                <span className="feature-symbol">✓</span>
                <span>
                  <b>Clarity over clutter</b>
                  <small>Keep your next steps in focus.</small>
                </span>
              </div>
              <div>
                <span className="feature-symbol">▦</span>
                <span>
                  <b>Everything in its place</b>
                  <small>One home for your priorities.</small>
                </span>
              </div>
              <div>
                <span className="feature-symbol">◇</span>
                <span>
                  <b>Your space stays yours</b>
                  <small>Secure sign-in for your workspace.</small>
                </span>
              </div>
            </div>
          </div>
          <div className="panel-bottom">
            <span>BUILT FOR YOUR NEXT BIG THING</span>
            <span>© 2026 TASKMATRIX</span>
          </div>
        </section>
        <section className="form-panel">
          <div className="form-top">
            <span>Workspace setup</span>
          </div>
          <div className="form-card">
            <div className="form-icon">T</div>
            <p className="form-kicker">ONE LAST STEP</p>
            <h2>Connect your workspace</h2>
            <p className="form-subtitle">
              Add your Supabase project details to enable sign-in and cloud
              storage.
            </p>
            <div className="notice">
              Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
              your .env.local file, then restart the development server.
            </div>
            <p className="form-help">
              Need help? Open the README setup instructions.
            </p>
          </div>
        </section>
      </main>
    );

  if (!user)
    return (
      <main className="auth-wrap">
        <section className="auth-art">
          <a className="brand" href="/" aria-label="TaskMatrix home">
            <span className="brand-mark">T</span>
            <span>
              task<span className="brand-light">matrix</span>
            </span>
          </a>
          <div className="auth-content">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> YOUR WORKSPACE, REFOCUSED
            </span>
            <h1>
              Make room for
              <br />
              <span>meaningful work.</span>
            </h1>
            <p className="auth-description">
              A calmer way to organize the work that moves you forward. Pick up
              where your best ideas begin.
            </p>
            <div className="feature-list">
              <div>
                <span className="feature-symbol">✓</span>
                <span>
                  <b>Clarity over clutter</b>
                  <small>Keep your next steps in focus.</small>
                </span>
              </div>
              <div>
                <span className="feature-symbol">▦</span>
                <span>
                  <b>Everything in its place</b>
                  <small>One home for your priorities.</small>
                </span>
              </div>
              <div>
                <span className="feature-symbol">◇</span>
                <span>
                  <b>Your space stays yours</b>
                  <small>Secure sign-in for your workspace.</small>
                </span>
              </div>
            </div>
          </div>
          <div className="panel-bottom">
            <span>BUILT FOR YOUR NEXT BIG THING</span>
            <span>© 2026 TASKMATRIX</span>
          </div>
        </section>
        <section className="form-panel">
          <div className="form-top">
            <span>
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>
            <button
              className="text-link"
              type="button"
              onClick={() => {
                const nextMode = authMode === "login" ? "signup" : "login";
                setAuthMode(nextMode);
                window.history.replaceState(
                  {},
                  "",
                  nextMode === "signup" ? "/register" : "/login",
                );
                setError("");
                setNotice("");
              }}
            >
              {authMode === "login" ? "Get started ↗" : "Sign in ↗"}
            </button>
          </div>
          <div className="form-card">
            <div className="form-icon">T</div>
            <p className="form-kicker">
              {authMode === "login" ? "WELCOME BACK" : "GET STARTED"}
            </p>
            <h2>
              {authMode === "login"
                ? "Sign in to TaskMatrix"
                : "Create your account"}
            </h2>
            <p className="form-subtitle">
              {authMode === "login"
                ? "Enter your details to access your workspace."
                : "Create your account and make space for meaningful work."}
            </p>
            <form className="form-stack" onSubmit={handleAuth}>
              {authMode === "signup" && (
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    required
                    autoComplete="name"
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    required
                    autoComplete={
                      authMode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3M6.2 6.3C3.8 7.8 2.6 10 2.5 12c.5 1.3 4 7 9.5 7 1 0 2-.2 2.9-.6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
              {notice && (
                <div className="success" role="status">
                  {notice}
                </div>
              )}
              <button
                className="btn primary auth-submit"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Please wait…"
                  : authMode === "login"
                    ? "Sign in →"
                    : "Create account →"}
              </button>
            </form>
            <p className="secure-note">
              🔒 Secure authentication. Your workspace stays yours.
            </p>
          </div>
        </section>
      </main>
    );

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="TaskMatrix home">
          <span className="brand-mark">T</span>
          <span>
            TaskMatrix<small>PROJECT WORKSPACE</small>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Workspace navigation">
          <a className="side-item active" href="/dashboard">
            <span aria-hidden="true">▦</span> Overview
          </a>
          <a className="side-item muted" href="/dashboard#tasks">
            <span aria-hidden="true">✓</span> My tasks
          </a>
          <a className="side-item muted" href="/dashboard#activity">
            <span aria-hidden="true">◷</span> Activity
          </a>
        </nav>
        <div className="top-actions">
          <span
            className="user-email"
            style={{ fontSize: 13, color: "var(--muted)" }}
          >
            {user.email}
          </span>
          <span className="avatar" aria-label="Signed in user">
            {(user.user_metadata?.full_name || user.email || "U")
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <button className="btn small" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main className="container">
        <section className="page-head">
          <div>
            <div className="eyebrow">MONDAY MINDSET, EVERY DAY</div>
            <h1>Your workspace</h1>
            <p className="sub">
              Your priorities, tasks and progress—together in one place.
            </p>
          </div>
          <button className="btn primary" onClick={openCreate}>
            ＋ &nbsp; New task
          </button>
        </section>
        <section className="welcome-card" aria-label="Workspace welcome">
          <div className="welcome-copy">
            <span className="welcome-tag">✦ YOUR SPACE TO DO GREAT WORK</span>
            <h2>
              Good to have you here,
              <br />
              {
                (user.user_metadata?.full_name || user.email || "there").split(
                  " ",
                )[0]
              }
              .
            </h2>
            <p>
              Your workspace is ready. Start with one clear priority and build
              momentum from there.
            </p>
            <div className="welcome-actions">
              <span className="welcome-status">✓ You’re signed in</span>
              <span className="welcome-caption">
                Your next chapter starts here.
              </span>
            </div>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-center">T</div>
            <div className="art-float float-one">✓</div>
            <div className="art-float float-two">▦</div>
            <div className="art-float float-three">✦</div>
          </div>
        </section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE FOUNDATION</span>
            <h2>Your overview</h2>
          </div>
          <span className="live-label">
            <span /> WORKSPACE LIVE
          </span>
        </div>
        {error && (
          <div className="notice" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="success" role="status" style={{ marginBottom: 18 }}>
            {notice}
          </div>
        )}
        <section className="stats">
          <article className="stat">
            <span className="stat-icon">▤</span>
            <div className="stat-label">Total tasks</div>
            <div className="stat-value">{metrics.total}</div>
            <div className="stat-note">Across your workspace</div>
          </article>
          <article className="stat">
            <span className="stat-icon">✓</span>
            <div className="stat-label">Completed</div>
            <div className="stat-value">{metrics.done}</div>
            <div className="stat-note">
              {metrics.total
                ? Math.round((metrics.done / metrics.total) * 100)
                : 0}
              % of all tasks
            </div>
          </article>
          <article className="stat">
            <span className="stat-icon">◷</span>
            <div className="stat-label">In progress</div>
            <div className="stat-value">{metrics.progress}</div>
            <div className="stat-note">Currently underway</div>
          </article>
          <article className="stat">
            <span className="stat-icon">!</span>
            <div className="stat-label">Overdue</div>
            <div className="stat-value">{metrics.overdue}</div>
            <div className="stat-note">Past due, not completed</div>
          </article>
        </section>
        <section className="content-grid" id="activity">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Completion activity</h2>
                <p>Tasks completed over the last 7 days</p>
              </div>
              <span className="badge done">This week</span>
            </div>
            <div className="chart-wrap">
              {typeof window !== "undefined" && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 8, right: 5, left: -24, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="completionFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6658d3"
                          stopOpacity={0.22}
                        />
                        <stop
                          offset="95%"
                          stopColor="#6658d3"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="#edf0ed"
                      strokeDasharray="4 4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#77817c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#77817c" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e7ebe7",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="Completed"
                      stroke="#6658d3"
                      strokeWidth={2.5}
                      fill="url(#completionFill)"
                      activeDot={{ r: 5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </article>
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2>Task distribution</h2>
                <p>A snapshot of your workload</p>
              </div>
            </div>
            <div className="progress-list">
              {(["todo", "in_progress", "done"] as TaskStatus[]).map(
                (status) => {
                  const count = tasks.filter((t) => t.status === status).length;
                  const pct = metrics.total
                    ? Math.round((count / metrics.total) * 100)
                    : 0;
                  return (
                    <div key={status}>
                      <div className="progress-label">
                        <span>{statusLabel[status]}</span>
                        <strong>
                          {count}{" "}
                          <span
                            style={{ color: "var(--muted)", fontWeight: 400 }}
                          >
                            · {pct}%
                          </span>
                        </strong>
                      </div>
                      <div className="track">
                        <div
                          className="fill"
                          style={{
                            width: pct + "%",
                            background:
                              status === "done"
                                ? "#38865b"
                                : status === "in_progress"
                                  ? "#d29b38"
                                  : "#8b9a91",
                          }}
                        />
                      </div>
                    </div>
                  );
                },
              )}
            </div>
            <p style={{ marginTop: 24 }}>
              Keep your next action small and achievable.
            </p>
          </article>
        </section>
        <section className="panel" id="tasks">
          <div className="panel-head" style={{ marginBottom: 16 }}>
            <div>
              <h2>Your tasks</h2>
              <p>Manage the details, and keep your work moving.</p>
            </div>
            <span className="badge">{filteredTasks.length} shown</span>
          </div>
          <div className="task-toolbar">
            <div className="filters" role="group" aria-label="Filter tasks">
              {(
                [
                  { value: "all", label: "All tasks" },
                  { value: "todo", label: "To do" },
                  { value: "in_progress", label: "In progress" },
                  { value: "done", label: "Completed" },
                ] as { value: Filter; label: string }[]
              ).map((item) => (
                <button
                  key={item.value}
                  className={
                    "filter " + (filter === item.value ? "active" : "")
                  }
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              className="search"
              aria-label="Search tasks"
              placeholder="⌕  Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="task-grid">
            {loadingTasks ? (
              <div className="empty">
                <div className="spinner" />
                <p>Loading your tasks…</p>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">✳</div>
                <h3>
                  {search || filter !== "all"
                    ? "No matching tasks"
                    : "A fresh start"}
                </h3>
                <p>
                  {search || filter !== "all"
                    ? "Try a different search or filter."
                    : "Create your first task and turn your plan into progress."}
                </p>
                {!search && filter === "all" && (
                  <button
                    className="btn primary"
                    style={{ marginTop: 15 }}
                    onClick={openCreate}
                  >
                    ＋ Create your first task
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => (
                <article className="task-card" key={task.id}>
                  <div className="task-top">
                    <span
                      className={
                        "badge " +
                        (task.status === "done"
                          ? "done"
                          : task.status === "in_progress"
                            ? "progress"
                            : "todo")
                      }
                    >
                      {task.status === "done" ? "✓ " : ""}
                      {statusLabel[task.status]}
                    </span>
                    <span className={"priority " + task.priority}>
                      {task.priority} priority
                    </span>
                  </div>
                  <h3>{task.title}</h3>
                  <p className="description">
                    {task.description || "No description added."}
                  </p>
                  <div className="task-meta">
                    <span>◷ &nbsp;{formatDate(task.due_date)}</span>
                    <div className="task-actions">
                      <button
                        className="icon-btn"
                        onClick={() => void toggleComplete(task)}
                        aria-label={
                          task.status === "done"
                            ? "Reopen task"
                            : "Mark complete"
                        }
                        title={
                          task.status === "done"
                            ? "Reopen task"
                            : "Mark complete"
                        }
                      >
                        {task.status === "done" ? "↶" : "✓"}
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => openEdit(task)}
                        aria-label={"Edit " + task.title}
                        title="Edit task"
                      >
                        ✎
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setSelected(task);
                          setError("");
                          setModal("delete");
                        }}
                        aria-label={"Delete " + task.title}
                        title="Delete task"
                      >
                        ⌫
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
        <footer className="footer">
          TaskMatrix · Built for clarity, designed for progress · Your data
          stays yours.
        </footer>
      </main>
      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setModal(null);
              setError("");
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {modal === "delete" ? (
              <>
                <div className="eyebrow" style={{ color: "var(--red)" }}>
                  PERMANENT ACTION
                </div>
                <h2 id="modal-title" style={{ marginTop: 10 }}>
                  Delete this task?
                </h2>
                <p className="modal-sub">
                  “{selected?.title}” will be permanently removed from your
                  workspace. This action cannot be undone.
                </p>
                {error && <div className="error">{error}</div>}
                <div className="modal-actions">
                  <button
                    className="btn"
                    disabled={busy}
                    onClick={() => {
                      setModal(null);
                      setError("");
                    }}
                  >
                    Keep task
                  </button>
                  <button
                    className="btn danger"
                    disabled={busy}
                    onClick={() => void deleteTask()}
                  >
                    {busy ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="eyebrow">
                  {modal === "edit" ? "REFINE YOUR PLAN" : "MAKE IT HAPPEN"}
                </div>
                <h2 id="modal-title" style={{ marginTop: 10 }}>
                  {modal === "edit" ? "Edit task" : "Create a task"}
                </h2>
                <p className="modal-sub">
                  {modal === "edit"
                    ? "Update the details below. Your changes save to the cloud."
                    : "Capture the next thing you want to move forward."}
                </p>
                <form onSubmit={saveTask}>
                  <div className="field">
                    <label htmlFor="task-title">Task title *</label>
                    <input
                      id="task-title"
                      value={draft.title}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, title: e.target.value }))
                      }
                      placeholder="e.g. Finish sprint retrospective"
                      maxLength={120}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="task-description">Description</label>
                    <textarea
                      id="task-description"
                      value={draft.description}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, description: e.target.value }))
                      }
                      placeholder="Add context, notes, or a next step…"
                      maxLength={1000}
                    />
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label htmlFor="task-status">Status</label>
                      <select
                        id="task-status"
                        value={draft.status}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            status: e.target.value as TaskStatus,
                          }))
                        }
                      >
                        <option value="todo">To do</option>
                        <option value="in_progress">In progress</option>
                        <option value="done">Completed</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="task-priority">Priority</label>
                      <select
                        id="task-priority"
                        value={draft.priority}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            priority: e.target.value as TaskPriority,
                          }))
                        }
                      >
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="task-due">Due date</label>
                    <input
                      id="task-due"
                      type="date"
                      value={draft.due_date}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, due_date: e.target.value }))
                      }
                    />
                  </div>
                  {error && (
                    <div className="error" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="modal-actions">
                    <button
                      className="btn"
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setModal(null);
                        setError("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn primary"
                      type="submit"
                      disabled={busy}
                    >
                      {busy
                        ? "Saving…"
                        : modal === "edit"
                          ? "Save changes"
                          : "Create task"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
