import { execa } from 'execa'
import fs from 'node:fs'
import path from 'node:path'

async function localBranchExists(repoPath: string, branch: string): Promise<boolean> {
  const { stdout } = await execa('git', ['-C', repoPath, 'branch', '--list', branch], { stdio: 'pipe' })
  return stdout.trim().length > 0
}

async function remoteBranchExists(repoPath: string, branch: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['-C', repoPath, 'branch', '-r', '--list', `*/${branch}`], { stdio: 'pipe' })
    const match = stdout.trim().split('\n').find(l => l.trim().length > 0)
    return match ? match.trim() : null
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
    // Branch exists locally — use it directly
    console.log(`  Branch "${newBranch}" exists locally, using it directly.`)
    await execa('git', ['-C', repoPath, 'worktree', 'add', worktreePath, newBranch], { stdio: 'inherit' })
    return
  }

  const remoteBranch = await remoteBranchExists(repoPath, newBranch)
  if (remoteBranch) {
    // Branch exists on remote — create a tracking local branch
    console.log(`  Branch "${newBranch}" found on remote (${remoteBranch}), creating tracking branch.`)
    await execa('git', ['-C', repoPath, 'worktree', 'add', '--track', '-b', newBranch, worktreePath, remoteBranch], { stdio: 'inherit' })
    return
  }

  // Branch does not exist — create from base branch
  await execa('git', ['-C', repoPath, 'worktree', 'add', '-b', newBranch, worktreePath, baseBranch], { stdio: 'inherit' })
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string
): Promise<void> {
  await execa('git', ['-C', repoPath, 'worktree', 'remove', worktreePath, '--force'], {
    stdio: 'inherit',
  })
}

export async function isGitRepo(dirPath: string): Promise<boolean> {
  try {
    await execa('git', ['-C', dirPath, 'rev-parse', '--git-dir'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}
