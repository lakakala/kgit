import path from 'node:path'
import fs from 'node:fs'
import { execa } from 'execa'
import { loadConfig } from '../config.js'

const IDE_COMMANDS: Record<string, string> = {
  code: 'code',
  trae: 'trae',
  cursor: 'cursor',
  nvim: 'nvim',
  vim: 'vim',
  vi: 'vi',
  nano: 'nano',
  idea: 'idea',
  webstorm: 'webstorm',
}

const TERMINAL_IDES = new Set(['nvim', 'vim', 'vi', 'nano'])

async function detectDefaultIde(): Promise<string | null> {
  for (const cmd of ['code', 'trae', 'cursor', 'nvim', 'vim']) {
    try {
      await execa('which', [cmd], { stdio: 'pipe' })
      return cmd
    } catch {
      // not found, try next
    }
  }
  return null
}

export async function editCommand(
  workspaceName: string,
  projectName: string,
  options: { ide?: string }
): Promise<void> {
  const config = loadConfig()
  const worktreePath = path.join(config.workspace, workspaceName, projectName)

  if (!fs.existsSync(worktreePath)) {
    throw new Error(`Project path does not exist: ${worktreePath}`)
  }

  let ideName = options.ide?.toLowerCase()
    ?? config.ide?.toLowerCase()

  if (!ideName) {
    const detected = await detectDefaultIde()
    if (!detected) {
      throw new Error('No IDE detected. Please specify one with --ide or set "ide" in config.')
    }
    ideName = detected
    console.log(`Using detected IDE: ${ideName}`)
  }

  const command = IDE_COMMANDS[ideName] ?? ideName

  console.log(`Opening ${worktreePath} with ${command}...`)

  if (TERMINAL_IDES.has(ideName)) {
    await execa(command, [worktreePath], { stdio: 'inherit' })
  } else {
    execa(command, [worktreePath], { detached: true, stdio: 'ignore' }).unref()
  }
}
