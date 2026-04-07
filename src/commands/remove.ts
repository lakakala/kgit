import path from 'node:path'
import fs from 'node:fs'
import { loadConfig, findProject } from '../config.js'
import { removeWorktree } from '../git.js'

interface ProjectEntry {
  name: string
}

export async function removeCommand(
  workspaceName: string,
  projectEntries: ProjectEntry[]
): Promise<void> {
  const config = loadConfig()
  const targetDir = path.join(config.workspace, workspaceName)

  if (!fs.existsSync(targetDir)) {
    throw new Error(`Workspace directory does not exist: ${targetDir}`)
  }

  if (projectEntries.length === 0) {
    // Remove entire workspace: prune all worktrees then delete folder
    const entries = fs.readdirSync(targetDir)
    for (const entry of entries) {
      const worktreePath = path.join(targetDir, entry)
      const project = config.projects.find(p => p.name === entry)
      if (project && fs.statSync(worktreePath).isDirectory()) {
        console.log(`Removing worktree "${entry}" from ${project.path}`)
        await removeWorktree(project.path, worktreePath)
      }
    }
    fs.rmSync(targetDir, { recursive: true, force: true })
    console.log(`Workspace "${workspaceName}" removed.`)
  } else {
    for (const entry of projectEntries) {
      const project = findProject(config, entry.name)
      const worktreePath = path.join(targetDir, project.name)

      if (!fs.existsSync(worktreePath)) {
        console.warn(`Worktree not found, skipping: ${worktreePath}`)
        continue
      }

      console.log(`Removing worktree "${project.name}" from ${project.path}`)
      await removeWorktree(project.path, worktreePath)
    }

    // Remove workspace dir if now empty
    if (fs.readdirSync(targetDir).length === 0) {
      fs.rmdirSync(targetDir)
      console.log(`Workspace directory is now empty and has been removed.`)
    }
  }
}
