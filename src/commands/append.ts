import path from 'node:path'
import { loadConfig, findProject } from '../config.js'
import { createRunner } from '../runner.js'
import { addWorktree, isGitRepo } from '../git.js'

interface ProjectEntry {
  name: string
  branch: string
}

export async function appendCommand(
  workspaceName: string,
  projectEntries: ProjectEntry[],
  newBranch?: string
): Promise<void> {
  const config = loadConfig()
  const r = createRunner(config.machine)
  const targetDir = path.join(config.workspace, workspaceName)
  const branchName = newBranch ?? workspaceName

  if (!(await r.exists(targetDir))) {
    throw new Error(`Workspace directory does not exist: ${targetDir}. Use "kgit new" to create it first.`)
  }

  for (const entry of projectEntries) {
    const project = findProject(config, entry.name)

    if (!(await isGitRepo(r, project.path))) {
      throw new Error(`Not a git repository: ${project.path}`)
    }

    const worktreePath = path.join(targetDir, project.name)

    if (await r.exists(worktreePath)) {
      console.warn(`Worktree already exists, skipping: ${worktreePath}`)
      continue
    }

    console.log(`Adding worktree for "${project.name}" (new branch: ${branchName}, base: ${entry.branch}) -> ${worktreePath}`)
    await addWorktree(r, project.path, worktreePath, branchName, entry.branch)
  }

  console.log(`\nProjects appended to workspace "${workspaceName}" at ${targetDir}`)
}
