import path from 'node:path'
import { loadConfig } from '../config.js'
import { createRunner } from '../runner.js'

export async function listCommand(): Promise<void> {
  const config = loadConfig()
  const r = createRunner(config.machine)

  if (!(await r.exists(config.workspace))) {
    console.log('No workspaces found (workspace directory does not exist).')
    return
  }

  const entries = await r.readdir(config.workspace)
  const workspaces: string[] = []
  for (const entry of entries) {
    if (await r.isDirectory(path.join(config.workspace, entry))) {
      workspaces.push(entry)
    }
  }

  if (workspaces.length === 0) {
    console.log('No workspaces found.')
    return
  }

  for (const ws of workspaces) {
    console.log(`${ws}`)
    const wsPath = path.join(config.workspace, ws)
    const children = await r.readdir(wsPath)

    for (const proj of children) {
      const projPath = path.join(wsPath, proj)
      if (!(await r.isDirectory(projPath))) continue

      let branch = 'unknown'
      try {
        const { stdout } = await r.exec(['git', '-C', projPath, 'branch', '--show-current'])
        branch = stdout.trim() || 'detached HEAD'
      } catch { /* ignore */ }
      console.log(`  └─ ${proj}  (${branch})`)
    }
  }
}
