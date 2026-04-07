import { execa } from 'execa'
import fs from 'node:fs'
import path from 'node:path'

async function run(args: string[]): Promise<void> {
  console.log(`  $ ${args.join(' ')}`)
  const result = await execa(args[0], args.slice(1), { all: true }).catch(err => {
    if (err.all) process.stderr.write(err.all + '\n')
    throw err
  })
  if (result.all) process.stdout.write(result.all + '\n')
}

async function localBranchExists(repoPath: string, branch: string): Promise<boolean> {
  const { stdout } = await execa('git', ['-C', repoPath, 'branch', '--list', branch], { stdio: 'pipe' })
  return stdout.trim().length > 0
}

async function remoteBranchExists(repoPath: string, branch: string): Promise<string | null> {
  try {
    const { stdout } = await execa(
      'git', ['-C', repoPath, 'ls-remote', '--heads', 'origin', branch],
      { stdio: 'pipe' }
    )
    if (stdout.trim().length === 0) return null
    return `origin/${branch}`
  } catch {
    return null
  }
}

export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  newBranch: string,
  baseBranch: string
): Promise<void> {
  await fs.promises.mkdir(path.dirname(worktreePath), { recursive: true })

  if (await localBranchExists(repoPath, newBranch)) {
    console.log(`  Branch "${newBranch}" exists locally, using it directly.`)
    await run(['git', '-C', repoPath, 'worktree', 'add', worktreePath, newBranch])
    return
  }

  const remoteBranch = await remoteBranchExists(repoPath, newBranch)
  if (remoteBranch) {
    console.log(`  Branch "${newBranch}" found on remote (${remoteBranch}), creating tracking branch.`)
    await run(['git', '-C', repoPath, 'worktree', 'add', '--track', '-b', newBranch, worktreePath, remoteBranch])
    return
  }

  await run(['git', '-C', repoPath, 'worktree', 'add', '-b', newBranch, worktreePath, baseBranch])
}

export async function isBranchSyncedToRemote(worktreePath: string): Promise<boolean> {
  try {
    await execa('git', ['-C', worktreePath, 'rev-parse', '--abbrev-ref', '@{u}'], { stdio: 'pipe' })
  } catch {
    return false
  }

  const { stdout } = await execa(
    'git', ['-C', worktreePath, 'rev-list', '--count', '@{u}..HEAD'],
    { stdio: 'pipe' }
  )
  return parseInt(stdout.trim(), 10) === 0
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string
): Promise<void> {
  await run(['git', '-C', repoPath, 'worktree', 'remove', worktreePath, '--force'])
}

export async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    await execa('git', ['-C', dirPath, 'rev-parse', '--git-dir'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}
