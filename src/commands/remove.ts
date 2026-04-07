import path from 'node:path'
import fs from 'node:fs'
import readline from 'node:readline'
import { loadConfig, findProject } from '../config.js'
import { removeWorktree, isBranchSyncedToRemote } from '../git.js'

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
  repoPath: string,
  worktreePath: string,
  projectName: string
): Promise<void> {
  const synced = await isBranchSyncedToRemote(worktreePath)
  if (!synced) {
    console.warn(`  Warning: "${projectName}" has unpushed commits or no remote tracking branch.`)
    const ok = await confirm(`  Remove worktree "${projectName}" anyway?`)
    if (!ok) {
      console.log(`  Skipped "${projectName}".`)
      return
    }
  }
  console.log(`Removing worktree "${projectName}" from ${repoPath}`)
  await removeWorktree(repoPath, worktreePath)
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
    const entries = fs.readdirSync(targetDir)
    for (const entry of entries) {
      const worktreePath = path.join(targetDir, entry)
      const project = config.projects.find(p => p.name === entry)
      if (project && fs.statSync(worktreePath).isDirectory()) {
        await checkAndRemove(project.path, worktreePath, entry)
      }
    }
    if (fs.readdirSync(targetDir).length === 0) {
      fs.rmSync(targetDir, { recursive: true, force: true })
      console.log(`Workspace "${workspaceName}" removed.`)
    } else {
      console.log(`Workspace "${workspaceName}" partially removed (some projects were skipped).`)
    }
  } else {
    for (const entry of projectEntries) {
      const project = findProject(config, entry.name)
      const worktreePath = path.join(targetDir, project.name)

      if (!fs.existsSync(worktreePath)) {
        console.warn(`Worktree not found, skipping: ${worktreePath}`)
        continue
      }

      await checkAndRemove(project.path, worktreePath, project.name)
    }

    if (fs.readdirSync(targetDir).length === 0) {
      fs.rmdirSync(targetDir)
      console.log(`Workspace directory is now empty and has been removed.`)
    }
  }
}
