import path from 'node:path'
import fs from 'node:fs'
import { loadConfig } from '../config.js'
import { execa } from 'execa'

async function getCurrentBranch(worktreePath: string): Promise<string> {
  try {
    const { stdout } = await execa('git', ['-C', worktreePath, 'branch', '--show-current'], { stdio: 'pipe' })
    return stdout.trim() || 'detached HEAD'
  } catch {
    return 'unknown'
  }
}

export async function listCommand(): Promise<void> {
  const config = loadConfig()

  if (!fs.existsSync(config.workspace)) {
    console.log('No workspaces found (workspace directory does not exist).')
    return
  }

  const entries = fs.readdirSync(config.workspace, { withFileTypes: true })
  const workspaces = entries.filter(e => e.isDirectory())

  if (workspaces.length === 0) {
    console.log('No workspaces found.')
    return
  }

  for (const ws of workspaces) {
    console.log(`${ws.name}`)
    const wsPath = path.join(config.workspace, ws.name)
    const projects = fs.readdirSync(wsPath, { withFileTypes: true }).filter(e => e.isDirectory())

    for (const proj of projects) {
      const projPath = path.join(wsPath, proj.name)
      const branch = await getCurrentBranch(projPath)
      console.log(`  └─ ${proj.name}  (${branch})`)
    }
  }
}
