import { execa } from 'execa'
import fs from 'node:fs'
import path from 'node:path'

export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  newBranch: string,
  baseBranch: string
): Promise<void> {
  await fs.promises.mkdir(path.dirname(worktreePath), { recursive: true })
  await execa('git', ['-C', repoPath, 'worktree', 'add', '-b', newBranch, worktreePath, baseBranch], {
    stdio: 'inherit',
  })
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
