#!/usr/bin/env node
import { Command } from 'commander'
import { newCommand } from './commands/new.js'
import { appendCommand } from './commands/append.js'

interface ProjectEntry {
  name: string
  branch: string
}

/**
 * Commander doesn't support two-argument options natively.
 * Pre-process argv to merge `-p project branch` pairs into `-p project:branch`
 * so commander can handle them as single option values.
 */
function normalizeProjectFlags(argv: string[]): string[] {
  const result: string[] = []
  let i = 0
  while (i < argv.length) {
    if (argv[i] === '-p') {
      const name = argv[i + 1]
      const branch = argv[i + 2]
      if (!name || name.startsWith('-') || !branch || branch.startsWith('-')) {
        console.error('Error: -p requires two arguments: <project> <branch>')
        process.exit(1)
      }
      result.push('-p', `${name}:${branch}`)
      i += 3
    } else {
      result.push(argv[i])
      i++
    }
  }
  return result
}

function collectProject(
  value: string,
  previous: ProjectEntry[]
): ProjectEntry[] {
  const colonIdx = value.indexOf(':')
  if (colonIdx === -1) {
    console.error(`Error: internal parse error for value "${value}"`)
    process.exit(1)
  }
  const name = value.slice(0, colonIdx)
  const branch = value.slice(colonIdx + 1)
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
  .option('-p <project:branch>', 'Add a project with a branch (repeatable)', collectProject, [] as ProjectEntry[])
  .action(async (workspace: string, options: { p: ProjectEntry[] }) => {
    if (options.p.length === 0) {
      console.error('Error: at least one -p <project> <branch> is required')
      process.exit(1)
    }
    await newCommand(workspace, options.p)
  })

program
  .command('append <workspace>')
  .description('Append projects to an existing workspace')
  .option('-p <project:branch>', 'Add a project with a branch (repeatable)', collectProject, [] as ProjectEntry[])
  .action(async (workspace: string, options: { p: ProjectEntry[] }) => {
    if (options.p.length === 0) {
      console.error('Error: at least one -p <project> <branch> is required')
      process.exit(1)
    }
    await appendCommand(workspace, options.p)
  })

program.parseAsync(normalizeProjectFlags(process.argv), { from: 'node' }).catch((err: Error) => {
  console.error(`Error: ${err.message}`)
  process.exit(1)
})
