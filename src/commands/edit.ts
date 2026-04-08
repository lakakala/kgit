import path from 'node:path'
import { execa } from 'execa'
import { loadConfig } from '../config.js'
import { createRunner } from '../runner.js'

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

// IDEs that support --remote ssh-remote+host
const SSH_REMOTE_IDES = new Set(['code', 'cursor'])

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

function parseSshHost(machine: string): string {
  return machine.replace(/^ssh:\/\//, '')
}

export async function editCommand(
  workspaceName: string,
  projectName: string,
  options: { ide?: string }
): Promise<void> {
  const config = loadConfig()
  const r = createRunner(config.machine)
  const worktreePath = path.join(config.workspace, workspaceName, projectName)

  if (!(await r.exists(worktreePath))) {
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

  if (config.machine) {
    const host = parseSshHost(config.machine)

    if (SSH_REMOTE_IDES.has(ideName)) {
      // VS Code / Cursor: use --remote ssh-remote+host
      console.log(`Opening ${worktreePath} on ${host} with ${command} --remote...`)
      execa(command, ['--remote', `ssh-remote+${host}`, worktreePath], { detached: true, stdio: 'ignore' }).unref()
    } else if (TERMINAL_IDES.has(ideName)) {
      // Terminal editors: ssh -t host 'vim /path'
      console.log(`Opening ${worktreePath} on ${host} with ${command}...`)
      await execa('ssh', ['-t', host, command, worktreePath], { stdio: 'inherit' })
    } else {
      console.error(`Error: "${ideName}" does not support remote editing. Use code, cursor, or a terminal editor (vim, nvim).`)
      process.exit(1)
    }
  } else {
    console.log(`Opening ${worktreePath} with ${command}...`)

    if (TERMINAL_IDES.has(ideName)) {
      await execa(command, [worktreePath], { stdio: 'inherit' })
    } else {
      execa(command, [worktreePath], { detached: true, stdio: 'ignore' }).unref()
    }
  }
}
