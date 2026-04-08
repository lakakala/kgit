import path from 'node:path'
import readline from 'node:readline'
import { loadConfig, findProject } from '../config.js'
import { createRunner } from '../runner.js'
import { removeWorktree, isBranchSyncedToRemote } from '../git.js'
import type { Runner } from '../runner.js'

interface ProjectEntry {
  name: string
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`${question} (y/N) `, answer => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

async function checkAndRemove(
  r: Runner,
  repoPath: string,
  worktreePath: string,
  projectName: string
): Promise<void> {
  const synced = await isBranchSyncedToRemote(r, worktreePath)
  if (!synced) {
    console.warn(`  Warning: "${projectName}" has unpushed commits or no remote tracking branch.`)
    const ok = await confirm(`  Remove worktree "${projectName}" anyway?`)
    if (!ok) {
      console.log(`  Skipped "${projectName}".`)
      return
    }
  }
  console.log(`Removing worktree "${projectName}" from ${repoPath}`)
  await removeWorktree(r, repoPath, worktreePath)
}

export async function removeCommand(
  workspaceName: string,
  projectEntries: ProjectEntry[]
): Promise<void> {
  const config = loadConfig()
  const r = createRunner(config.machine)
  const targetDir = path.join(config.workspace, workspaceName)

  if (!(await r.exists(targetDir))) {
    throw new Error(`Workspace directory does not exist: ${targetDir}`)
  }

  if (projectEntries.length === 0) {
    const entries = await r.readdir(targetDir)
    for (const entry of entries) {
      const worktreePath = path.join(targetDir, entry)
      const project = config.projects.find(p => p.name === entry)
      if (project && await r.isDirectory(worktreePath)) {
        await checkAndRemove(r, project.path, worktreePath, entry)
      }
    }
    if ((await r.readdir(targetDir)).length === 0) {
      await r.rm(targetDir)
      console.log(`Workspace "${workspaceName}" removed.`)
    } else {
      console.log(`Workspace "${workspaceName}" partially removed (some projects were skipped).`)
    }
  } else {
    for (const entry of projectEntries) {
      const project = findProject(config, entry.name)
      const worktreePath = path.join(targetDir, project.name)

      if (!(await r.exists(worktreePath))) {
        console.warn(`Worktree not found, skipping: ${worktreePath}`)
        continue
      }

      await checkAndRemove(r, project.path, worktreePath, project.name)
    }

    if ((await r.readdir(targetDir)).length === 0) {
      await r.rmdir(targetDir)
      console.log(`Workspace directory is now empty and has been removed.`)
    }
  }
}
