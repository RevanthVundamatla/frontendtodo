import { FormEvent, useMemo, useState } from "react";
import { AuthPage } from "./auth";
import { useAuth } from "../lib/auth-context";
import { Todo, useCreateTodo, useDeleteTodo, useTodos, useUpdateTodo } from "../hooks/use-todos";
import { UpgradeModal } from "../components/upgrade-modal";
import { PremiumBadge } from "../components/premium-badge";

const statusLabels: Record<Todo["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

const priorityLabels: Record<Todo["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function WorkspacePage() {
  const { user, isLoading, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", dueDate: "", tags: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [error, setError] = useState("");
  const [requiresPremium, setRequiresPremium] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>(undefined);

  const openUpgrade = (reason?: string) => {
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  };

  const queryParams = useMemo(() => ({ search, status, priority, limit: 50 }), [search, status, priority]);
  const todosQuery = useTodos(queryParams, !!user);
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-3xl border bg-white px-8 py-6 font-semibold text-emerald-950 shadow-xl">Opening your workspace...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const data = todosQuery.data?.data;
  const todos: Todo[] = data?.todos ?? [];
  const stats = data?.stats ?? { pending: 0, in_progress: 0, completed: 0 };

  const submitTodo = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setRequiresPremium(false);
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setError("Please enter a task title before saving.");
      return;
    }
    try {
      await createTodo.mutateAsync({
        title: trimmedTitle,
        description: form.description.trim(),
        priority: form.priority as Todo["priority"],
        dueDate: form.dueDate || undefined,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
      setForm({ title: "", description: "", priority: "medium", dueDate: "", tags: "" });
    } catch (err) {
      const apiError = err as Error & { data?: { requiresPremium?: boolean } };
      if (apiError?.data?.requiresPremium) {
        setRequiresPremium(true);
        openUpgrade(apiError.message);
      }
      setError(apiError instanceof Error ? apiError.message : "Could not create todo.");
    }
  };

  const changeStatus = async (todo: Todo, nextStatus: Todo["status"]) => {
    setError("");
    try {
      await updateTodo.mutateAsync({ id: todo._id, data: { status: nextStatus } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update todo.");
    }
  };

  const removeTodo = async (id: string) => {
    setError("");
    try {
      await deleteTodo.mutateAsync(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete todo.");
    }
  };

  const saveTitle = async (todo: Todo) => {
    if (!editingTitle.trim()) return;
    setError("");
    try {
      await updateTodo.mutateAsync({ id: todo._id, data: { title: editingTitle.trim() } });
      setEditingId(null);
      setEditingTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename todo.");
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,hsl(158_55%_96%),hsl(185_42%_91%))] px-4 py-6 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 rounded-[2rem] border border-white/75 bg-white/75 p-6 shadow-xl shadow-emerald-900/10 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">Todo workspace</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-emerald-950">Today feels manageable, {user.name?.split(" ")[0] || "friend"}.</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <PremiumBadge enabled={!!user} />
              {!data?.isPremium && data?.remainingFree !== undefined && data?.remainingFree !== null && (
                <span className="inline-flex items-center rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                  {data.remainingFree} free todos left
                </span>
              )}
              {!data?.isPremium && data?.remainingFree === 0 && (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                  Free plan limit reached
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!data?.isPremium && (
              <button
                className="rounded-2xl bg-amber-500 px-5 py-3 font-bold text-white shadow-lg shadow-amber-500/30 transition hover:-translate-y-0.5 hover:bg-amber-600"
                onClick={() => openUpgrade("Unlock unlimited todos and premium features.")}
              >
                Upgrade to Premium
              </button>
            )}
            <button className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 font-bold text-emerald-900 transition hover:-translate-y-0.5 hover:bg-emerald-50" onClick={logout}>Sign out</button>
          </div>
        </header>

        <UpgradeModal
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          onSuccess={() => {
            setRequiresPremium(false);
            setError("");
          }}
          reason={upgradeReason}
        />

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          {(["pending", "in_progress", "completed"] as Todo["status"][]).map((key) => (
            <button key={key} className="rounded-3xl border border-white/80 bg-white/80 p-6 text-left shadow-lg shadow-emerald-900/5 transition hover:-translate-y-1" onClick={() => setStatus(status === key ? "" : key)}>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">{statusLabels[key]}</p>
              <p className="mt-3 text-4xl font-black text-emerald-950">{stats[key] ?? 0}</p>
            </button>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            <form className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-xl shadow-emerald-900/10" onSubmit={submitTodo}>
              <h2 className="text-2xl font-black text-emerald-950">Add a task</h2>
              <div className="mt-5 space-y-4">
                <input className="w-full rounded-2xl border border-emerald-100 px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" placeholder="Task title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required maxLength={200} />
                <textarea className="min-h-28 w-full rounded-2xl border border-emerald-100 px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={1000} />
                <div className="grid grid-cols-2 gap-3">
                  <select className="rounded-2xl border border-emerald-100 px-4 py-3 outline-none" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                    <option value="low">Low priority</option>
                    <option value="medium">Medium priority</option>
                    <option value="high">High priority</option>
                  </select>
                  <input className="rounded-2xl border border-emerald-100 px-4 py-3 outline-none" type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} />
                </div>
                <input className="w-full rounded-2xl border border-emerald-100 px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" placeholder="Tags separated by commas" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
                {error && (
                  <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${requiresPremium ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>
                    <div>{error}</div>
                    {requiresPremium && (
                      <button
                        type="button"
                        onClick={() => openUpgrade(error)}
                        className="mt-2 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-600"
                      >
                        Upgrade now
                      </button>
                    )}
                  </div>
                )}
                <button className="w-full rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 disabled:opacity-60" disabled={createTodo.isPending}>
                  {createTodo.isPending ? "Adding..." : "Add task"}
                </button>
              </div>
            </form>

            <div className="rounded-[2rem] border border-white/80 bg-white/70 p-6 shadow-lg">
              <h2 className="font-black text-emerald-950">Focus filters</h2>
              <div className="mt-4 space-y-3">
                <input className="w-full rounded-2xl border border-emerald-100 px-4 py-3 outline-none" placeholder="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} />
                <select className="w-full rounded-2xl border border-emerald-100 px-4 py-3 outline-none" value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select className="w-full rounded-2xl border border-emerald-100 px-4 py-3 outline-none" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </aside>

          <section className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-xl shadow-emerald-900/10 backdrop-blur sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-emerald-950">Your tasks</h2>
                <p className="text-sm text-emerald-900/65">{todos.length} visible tasks</p>
              </div>
            </div>

            {todosQuery.isLoading ? (
              <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center font-semibold text-emerald-800">Loading tasks...</div>
            ) : todosQuery.isError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center font-semibold text-red-700">{todosQuery.error instanceof Error ? todosQuery.error.message : "Could not load tasks."}</div>
            ) : todos.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-emerald-200 bg-white/80 p-10 text-center">
                <h3 className="text-xl font-black text-emerald-950">No tasks in this view</h3>
                <p className="mt-2 text-emerald-900/65">Add a task or adjust your filters to see more work here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo) => (
                  <article key={todo._id} className="group rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        {editingId === todo._id ? (
                          <div className="flex gap-2">
                            <input className="w-full rounded-2xl border border-emerald-100 px-4 py-2 outline-none" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} autoFocus />
                            <button className="rounded-2xl bg-primary px-4 py-2 font-bold text-primary-foreground" onClick={() => saveTitle(todo)}>Save</button>
                          </div>
                        ) : (
                          <button className={`text-left text-xl font-black text-emerald-950 ${todo.status === "completed" ? "line-through opacity-60" : ""}`} onClick={() => { setEditingId(todo._id); setEditingTitle(todo.title); }}>
                            {todo.title}
                          </button>
                        )}
                        {todo.description && <p className="mt-2 text-emerald-900/70">{todo.description}</p>}
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">{statusLabels[todo.status]}</span>
                          <span className="rounded-full bg-teal-50 px-3 py-1 text-teal-800">{priorityLabels[todo.priority]}</span>
                          {todo.dueDate && <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-800">Due {new Date(todo.dueDate).toLocaleDateString()}</span>}
                          {todo.tags?.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{tag}</span>)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {(["pending", "in_progress", "completed"] as Todo["status"][]).filter((next) => next !== todo.status).map((next) => (
                          <button key={next} className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50" onClick={() => changeStatus(todo, next)}>
                            {statusLabels[next]}
                          </button>
                        ))}
                        <button className="rounded-2xl border border-red-100 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50" onClick={() => removeTodo(todo._id)}>Delete</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}