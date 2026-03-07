"use client";

import { useEffect, useState, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { apiGet, apiSend } from "@/lib/api";
import { useSession } from "@/lib/session";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  week_number?: number | null;
  skill_tag?: string | null;
  priority: string;
  github_synced: boolean;
  ai_generated: boolean;
  sort_order: number;
};

type Board = { todo: Task[]; in_progress: Task[]; done: Task[] };
type BoardResponse = { board: Board; total: number };

const COL_META = {
  todo: { label: "To Do", color: "#a78bfa", bg: "rgba(124,58,237,0.06)", icon: "radio_button_unchecked" },
  in_progress: { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.06)", icon: "pending" },
  done: { label: "Done", color: "#22c55e", bg: "rgba(34,197,94,0.06)", icon: "check_circle" },
} as const;

const PRIORITY_COLOR: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function TaskCard({ task, index }: { task: Task; index: number }) {
  const lvlColor = PRIORITY_COLOR[task.priority] || "#8080a8";
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          data-testid={`task-card-${task.id}`}
          style={{
            borderRadius: 12,
            border: `1px solid ${snapshot.isDragging ? "rgba(124,58,237,0.5)" : "var(--border)"}`,
            background: snapshot.isDragging ? "rgba(124,58,237,0.12)" : "var(--surface-2)",
            padding: "12px 14px",
            cursor: "grab",
            boxShadow: snapshot.isDragging ? "0 12px 40px rgba(0,0,0,0.5)" : "none",
            transition: "box-shadow 0.15s",
            ...provided.draggableProps.style,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.4, color: "var(--fg)" }}>{task.title}</p>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: lvlColor, flexShrink: 0, marginTop: 4 }} />
          </div>
          {task.description && (
            <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: 8, lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {task.description}
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {task.week_number != null && (
              <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: 99, background: "rgba(124,58,237,0.12)", color: "#a78bfa", fontWeight: 600 }}>
                W{task.week_number}
              </span>
            )}
            {task.skill_tag && (
              <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 600 }}>
                {task.skill_tag}
              </span>
            )}
            {task.ai_generated && (
              <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: 99, background: "rgba(6,182,212,0.1)", color: "#06b6d4", fontWeight: 600 }}>
                AI
              </span>
            )}
            {task.github_synced && (
              <span style={{ fontSize: "0.65rem", padding: "2px 7px", borderRadius: 99, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 10, verticalAlign: "middle" }}>hub</span> GitHub
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

function AddTaskForm({ colStatus, onAdd }: { colStatus: string; onAdd: (t: Task) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const task = await apiSend<Task>("/kanban/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), status: colStatus, priority: "medium" }),
      });
      onAdd(task); setTitle(""); setOpen(false);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      data-testid={`add-task-btn-${colStatus}`}
      style={{
        width: "100%", textAlign: "left", fontSize: "0.78rem", color: "var(--muted-2)",
        padding: "8px 10px", borderRadius: 10, background: "transparent", border: "1px dashed var(--border)",
        cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.06)"; e.currentTarget.style.color = "var(--muted)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--muted-2)"; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> Add task
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Task title..."
        data-testid="add-task-input"
        style={{
          padding: "9px 12px", borderRadius: 10, border: "1px solid var(--border-hi)",
          background: "var(--surface-2)", color: "var(--fg)", fontSize: "0.82rem", outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={submit}
          disabled={loading}
          data-testid="add-task-confirm"
          style={{ flex: 1, padding: "7px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
        >
          {loading ? "..." : "Add"}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { isLoggedIn } = useSession();
  const [board, setBoard] = useState<Board>({ todo: [], in_progress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [weekFilter, setWeekFilter] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  const loadBoard = useCallback(() => {
    setLoading(true);
    apiGet<BoardResponse>("/kanban/board")
      .then(data => setBoard(data.board))
      .catch(() => setBoard({ todo: [], in_progress: [], done: [] }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (isLoggedIn) loadBoard(); }, [isLoggedIn, loadBoard]);

  const filterTasks = (tasks: Task[]) => weekFilter ? tasks.filter(t => t.week_number === weekFilter) : tasks;

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const newBoard = { ...board };
    const srcCol = source.droppableId as keyof Board;
    const dstCol = destination.droppableId as keyof Board;
    const srcTasks = [...newBoard[srcCol]];
    const [moved] = srcTasks.splice(source.index, 1);
    newBoard[srcCol] = srcTasks;
    const dstTasks = [...newBoard[dstCol]];
    dstTasks.splice(destination.index, 0, { ...moved, status: dstCol });
    newBoard[dstCol] = dstTasks;
    setBoard(newBoard);
    await apiSend<Task>(`/kanban/tasks/${draggableId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: dstCol, sort_order: destination.index }),
    }).catch(() => loadBoard());
  };

  const generatePlan = async () => {
    setGenerating(true); setMsg("");
    try {
      const result = await apiSend<{ tasks_created: number; ai_powered: boolean }>("/kanban/generate", { method: "POST" });
      setMsg(`Generated ${result.tasks_created} tasks${result.ai_powered ? " (AI-powered)" : " (template)"}`);
      setMsgType("success");
      loadBoard();
    } catch { setMsg("Error generating plan"); setMsgType("error"); }
    setGenerating(false);
  };

  const syncGithub = async () => {
    setSyncing(true); setMsg("");
    try {
      const result = await apiSend<{ synced_count: number }>("/kanban/sync-github", { method: "POST" });
      setMsg(`Synced ${result.synced_count} tasks from GitHub`);
      setMsgType("success");
      loadBoard();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setMsg(err?.message === "GitHub username not set in profile" ? "Add your GitHub username in Profile first" : "GitHub sync error");
      setMsgType("error");
    }
    setSyncing(false);
  };

  const onTaskAdded = (task: Task, col: keyof Board) => {
    setBoard(prev => ({ ...prev, [col]: [...prev[col], task] }));
  };

  const weeks = Array.from(new Set([
    ...board.todo.map(t => t.week_number),
    ...board.in_progress.map(t => t.week_number),
    ...board.done.map(t => t.week_number),
  ].filter(Boolean))).sort((a, b) => (a as number) - (b as number)) as number[];

  const totalTasks = board.todo.length + board.in_progress.length + board.done.length;
  const donePct = totalTasks > 0 ? Math.round((board.done.length / totalTasks) * 100) : 0;

  if (!isLoggedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--muted-2)" }}>lock</span>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Please log in to access your Kanban board.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }} data-testid="kanban-title">
            90-Day Pivot Plan
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Drag tasks across columns to track your progress</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={generatePlan}
            disabled={generating}
            data-testid="generate-plan-btn"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
              borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              color: "#fff", fontWeight: 700, fontSize: "0.82rem", cursor: generating ? "wait" : "pointer",
              boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            {generating ? "Generating..." : "Generate AI Plan"}
          </button>
          <button
            onClick={syncGithub}
            disabled={syncing}
            data-testid="github-sync-btn"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "10px 18px",
              borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)",
              color: "var(--fg-2)", fontWeight: 700, fontSize: "0.82rem", cursor: syncing ? "wait" : "pointer",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>hub</span>
            {syncing ? "Syncing..." : "GitHub Sync"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ background: "var(--surface)", borderRadius: 14, padding: "14px 18px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }}>Plan Progress</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: donePct >= 75 ? "#22c55e" : "var(--fg)" }}>{donePct}% complete</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${donePct}%`, background: "linear-gradient(90deg,#7c3aed,#22c55e)", transition: "width 0.5s ease" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
          {[
            { label: "To Do", count: board.todo.length, color: "#a78bfa" },
            { label: "In Progress", count: board.in_progress.length, color: "#f59e0b" },
            { label: "Done", count: board.done.length, color: "#22c55e" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--muted-2)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{
          padding: "11px 16px", borderRadius: 12, fontSize: "0.82rem",
          background: msgType === "success" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${msgType === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          color: msgType === "success" ? "#22c55e" : "#ef4444",
        }} data-testid="kanban-message">
          {msg}
        </div>
      )}

      {/* Week filter */}
      {weeks.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} data-testid="week-filter">
          <span style={{ fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }}>Filter by week:</span>
          <button
            onClick={() => setWeekFilter(null)}
            style={{
              fontSize: "0.72rem", padding: "4px 12px", borderRadius: 99,
              border: `1px solid ${!weekFilter ? "rgba(124,58,237,0.5)" : "var(--border)"}`,
              background: !weekFilter ? "rgba(124,58,237,0.12)" : "transparent",
              color: !weekFilter ? "#a78bfa" : "var(--muted)", cursor: "pointer", fontWeight: 600,
            }}
          >
            All
          </button>
          {weeks.map(w => (
            <button
              key={w}
              onClick={() => setWeekFilter(w === weekFilter ? null : w)}
              style={{
                fontSize: "0.72rem", padding: "4px 12px", borderRadius: 99,
                border: `1px solid ${weekFilter === w ? "rgba(124,58,237,0.5)" : "var(--border)"}`,
                background: weekFilter === w ? "rgba(124,58,237,0.12)" : "transparent",
                color: weekFilter === w ? "#a78bfa" : "var(--muted)", cursor: "pointer", fontWeight: 600,
              }}
            >
              Week {w}
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 12 }}>
          <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32, color: "var(--primary-light)" }}>refresh</span>
          <span style={{ color: "var(--muted)" }}>Loading your board...</span>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }} data-testid="kanban-board">
            {(["todo", "in_progress", "done"] as const).map(colId => {
              const meta = COL_META[colId];
              const tasks = filterTasks(board[colId]);
              return (
                <div
                  key={colId}
                  data-testid={`kanban-col-${colId}`}
                  style={{ borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", display: "flex", flexDirection: "column" }}
                >
                  {/* Column header */}
                  <div style={{ padding: "14px 16px", background: meta.bg, borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: meta.color }}>{meta.icon}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: "0.7rem", fontWeight: 700, color: meta.color, background: `${meta.color}18`, padding: "2px 8px", borderRadius: 99 }}>
                      {board[colId].length}
                    </span>
                  </div>
                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          flex: 1, minHeight: 120, padding: "10px",
                          display: "flex", flexDirection: "column", gap: 8,
                          background: snapshot.isDraggingOver ? "rgba(124,58,237,0.04)" : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        {tasks.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                  <div style={{ padding: "0 10px 10px" }}>
                    <AddTaskForm colStatus={colId} onAdd={t => onTaskAdded(t, colId)} />
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      <div style={{ textAlign: "center" }}>
        <Link href="/student/readiness" style={{ fontSize: "0.8rem", color: "var(--primary-light)", textDecoration: "none" }}>
          View MRI Score → see which gaps to address first
        </Link>
      </div>
    </div>
  );
}
