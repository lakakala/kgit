import path from 'node:path'
import fs from 'node:fs'
import { loadConfig, findProject } from '../config.js'
import { addWorktree, isGitRepo } from '../git.js'

interface ProjectEntry {
  name: string
  branch: string
}

export async function newCommand(
  workspaceName: string,
  projectEntries: ProjectEntry[]
): Promise<void> {
  const config = loadConfig()
  const targetDir = path.join(config.workspace, workspaceName)

  if (fs.existsSync(targetDir)) {
    throw new Error(`Workspace directory already exists: ${targetDir}`)
  }

  await fs.promises.mkdir(targetDir, { recursive: true })
  console.log(`Created workspace directory: ${targetDir}`)

  for (const entry of projectEntries) {
    const project = findProject(config, entry.name)

    if (!(await isGitRepo(project.path))) {
      throw new Error(`Not a git repository: ${project.path}`)
    }

    const worktreePath = path.join(targetDir, project.name)
    console.log(`Adding worktree for "${project.name}" (branch: ${entry.branch}) -> ${worktreePath}`)
    await addWorktree(project.path, worktreePath, entry.branch)
  }

  console.log(`\nWorkspace "${workspaceName}" created successfully at ${targetDir}`)
}
