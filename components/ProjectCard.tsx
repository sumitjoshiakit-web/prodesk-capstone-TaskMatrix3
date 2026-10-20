"use client";

import type { FormEvent } from "react";

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  created_at: string;
};

export type ProjectMember = {
  id: string;
  project_id: string;
  owner_id: string;
  member_email: string;
  created_at: string;
};

type ProjectCardProps = {
  project: Project;
  taskCount: number;
  members: ProjectMember[];
  memberEmail: string;
  onMemberFocus: (projectId: string) => void;
  onMemberEmailChange: (projectId: string, value: string) => void;
  onAddMember: (event: FormEvent<HTMLFormElement>, project: Project) => void;
  onRemoveMember: (member: ProjectMember) => void;
  onDeleteProject: (project: Project) => void;
};

export default function ProjectCard({
  project,
  taskCount,
  members,
  memberEmail,
  onMemberFocus,
  onMemberEmailChange,
  onAddMember,
  onRemoveMember,
  onDeleteProject,
}: ProjectCardProps) {
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span className="project-icon" aria-hidden="true">▦</span>
        <span className="badge">{taskCount} tasks</span>
      </div>
      <h3>{project.name}</h3>
      <p>{project.description || "No description added."}</p>

      <form className="member-form" onSubmit={(event) => onAddMember(event, project)}>
        <label htmlFor={"member-" + project.id}>Add team member email</label>
        <div className="member-input-row">
          <input
            id={"member-" + project.id}
            type="email"
            value={memberEmail}
            onFocus={() => onMemberFocus(project.id)}
            onChange={(event) => onMemberEmailChange(project.id, event.target.value)}
            placeholder="teammate@example.com"
            required
          />
          <button className="btn small" type="submit">Add</button>
        </div>
      </form>

      <div className="member-list">
        <strong>Team</strong>
        {members.length ? members.map((member) => (
          <span className="member-chip" key={member.id}>
            {member.member_email}
            <button
              type="button"
              aria-label={"Remove " + member.member_email}
              onClick={() => onRemoveMember(member)}
            >
              ×
            </button>
          </span>
        )) : <small>No members added yet.</small>}
      </div>

      <button
        className="text-link project-delete"
        type="button"
        onClick={() => onDeleteProject(project)}
      >
        Delete project
      </button>
    </article>
  );
}
