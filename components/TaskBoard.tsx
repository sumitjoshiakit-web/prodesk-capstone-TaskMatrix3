"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import type { Task, TaskStatus } from "@/lib/supabase";

type ProjectSummary = { id: string; name: string };
type TaskBoardProps = {
  tasks: Task[];
  projects: ProjectSummary[];
  onMoveTask: (task: Task, status: TaskStatus) => void;
  onOpenDiscussion: (task: Task) => void;
};

const statuses: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];
const labels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

export default function TaskBoard({ tasks, projects, onMoveTask, onOpenDiscussion }: TaskBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  function handleDragStart(event: DragEvent<HTMLElement>, task: Task) {
    setDraggedTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  }

  function handleDrop(event: DragEvent<HTMLElement>, status: TaskStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
    const task = tasks.find((item) => item.id === taskId);
    if (task && task.status !== status) onMoveTask(task, status);
    setDraggedTaskId(null);
    setDragOverStatus(null);
  }

  return (
    <section className="panel" id="board">
      <div className="panel-head">
        <div>
          <h2>Kanban board</h2>
          <p>Drag and drop cards between stages, or use the arrow controls.</p>
        </div>
        <span className="badge">{tasks.length} total</span>
      </div>
      <div className="kanban-board">
        {statuses.map((status, index) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          return (
            <section className={"kanban-column" + (dragOverStatus === status ? " drag-over" : "")} key={status} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDragOverStatus(status); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOverStatus(null); }} onDrop={(event) => handleDrop(event, status)} aria-label={labels[status] + " tasks"}>
              <div className="kanban-heading">
                <h3>{labels[status]}</h3>
                <span>{columnTasks.length}</span>
              </div>
              {columnTasks.map((task) => (
                <article className={"kanban-card" + (draggedTaskId === task.id ? " is-dragging" : "")} key={task.id} draggable onDragStart={(event) => handleDragStart(event, task)} onDragEnd={() => { setDraggedTaskId(null); setDragOverStatus(null); }} aria-label={task.title + ", draggable task"}>
                  <strong>{task.title}</strong>
                  <p>{task.description || "No description"}</p>
                  <div className="kanban-task-meta">
                    <small>Priority: <b>{task.priority}</b></small>
                    <small>Due: <b>{task.due_date ? new Date(task.due_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Not set"}</b></small>
                  </div>
                  {task.project_id && (
                    <small>Project: {projects.find((project) => project.id === task.project_id)?.name ?? "Project"}</small>
                  )}
                  {task.assigned_to_email && <small>Assigned: {task.assigned_to_email}</small>}
                  <div className="kanban-actions">
                    <button className="btn small" disabled={index === 0} onClick={() => onMoveTask(task, statuses[index - 1])}>←</button>
                    <button className="btn small" disabled={index === statuses.length - 1} onClick={() => onMoveTask(task, statuses[index + 1])}>→</button>
                    <button className="btn small" onClick={() => onOpenDiscussion(task)}>Comments / history</button>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </section>
  );
}
