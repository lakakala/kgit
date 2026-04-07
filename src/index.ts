#!/usr/bin/env node
import { Command } from 'commander'
import { newCommand } from './commands/new.js'
import { appendCommand } from './commands/append.js'
import { removeCommand } from './commands/remove.js'
import { listCommand } from './commands/list.js'

interface ProjectEntry {
  name: string
  branch: string
}

function collectProject(
  value: string,
  previous: ProjectEntry[]
): ProjectEntry[] {
  const colonIdx = value.indexOf(':')
  const name = colonIdx === -1 ? value : value.slice(0, colonIdx)
  const branch = colonIdx === -1 ? 'master' : value.slice(colonIdx + 1)
  return [...previous, { name, branch }]
}

const program = new Command()

program
  .name('kgit')
  .description('Git worktree workspace manager')
  .version('0.1.0')

program
  .command('new <workspace>')
  .description('Create a new workspace with git worktrees')
  .option('-b <branch>', 'New branch name (defaults to workspace name)')
  .option('-p <project[:branch]>', 'Add a project, optionally with base branch (default: master), repeatable', collectProject, [] as ProjectEntry[])
  .action(async (workspace: string, options: { b?: string; p: ProjectEntry[] }) => {
    if (options.p.length === 0) {
      console.error('Error: at least one -p <project[:branch]> is required')
      process.exit(1)
    }
    await newCommand(workspace, options.p, options.b)
  })

program
  .command('append <workspace>')
  .description('Append projects to an existing workspace')
  .option('-b <branch>', 'New branch name (defaults to workspace name)')
  .option('-p <project[:branch]>', 'Add a project, optionally with base branch (default: master), repeatable', collectProject, [] as ProjectEntry[])
  .action(async (workspace: string, options: { b?: string; p: ProjectEntry[] }) => {
    if (options.p.length === 0) {
      console.error('Error: at least one -p <project[:branch]> is required')
      process.exit(1)
    }
    await appendCommand(workspace, options.p, options.b)
  })

program
  .command('remove <workspace>')
  .description('Remove a workspace or specific projects from it')
  .option('-p <project>', 'Remove a specific project (repeatable)', (val: string, prev: Array<{ name: string }>) => [...prev, { name: val }], [] as Array<{ name: string }>)
  .action(async (workspace: string, options: { p: Array<{ name: string }> }) => {
    await removeCommand(workspace, options.p)
  })

program
  .command('list')
  .description('List all created workspaces and their projects')
  .action(async () => {
    await listCommand()
  })

program.parseAsync(process.argv, { from: 'node' }).catch((err: Error) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
