"use client";

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
  return (
    <section className="panel" id="board">
      <div className="panel-head">
        <div>
          <h2>Kanban board</h2>
          <p>Move work across the five PRD stages.</p>
        </div>
        <span className="badge">{tasks.length} total</span>
      </div>
      <div className="kanban-board">
        {statuses.map((status, index) => {
          const columnTasks = tasks.filter((task) => task.status === status);
          return (
            <section className="kanban-column" key={status}>
              <div className="kanban-heading">
                <h3>{labels[status]}</h3>
                <span>{columnTasks.length}</span>
              </div>
              {columnTasks.map((task) => (
                <article className="kanban-card" key={task.id}>
                  <strong>{task.title}</strong>
                  <p>{task.description || "No description"}</p>
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
