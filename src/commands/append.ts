import path from 'node:path'
import fs from 'node:fs'
import { loadConfig, findProject } from '../config.js'
import { addWorktree, isGitRepo } from '../git.js'

interface ProjectEntry {
  name: string
  branch: string
}

export async function appendCommand(
  workspaceName: string,
  projectEntries: ProjectEntry[]
): Promise<void> {
  const config = loadConfig()
  const targetDir = path.join(config.workspace, workspaceName)

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Workspace directory does not exist: ${targetDir}. Use "kgit new" to create it first.`)
  }

  for (const entry of projectEntries) {
    const project = findProject(config, entry.name)

    if (!(await isGitRepo(project.path))) {
      throw new Error(`Not a git repository: ${project.path}`)
    }

    const worktreePath = path.join(targetDir, project.name)

    if (fs.existsSync(worktreePath)) {
      console.warn(`Worktree already exists, skipping: ${worktreePath}`)
      continue
    }

    console.log(`Adding worktree for "${project.name}" (branch: ${entry.branch}) -> ${worktreePath}`)
    await addWorktree(project.path, worktreePath, entry.branch)
  }

  console.log(`\nProjects appended to workspace "${workspaceName}" at ${targetDir}`)
}
