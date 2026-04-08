import path from 'node:path'
import type { Runner } from './runner.js'

async function localBranchExists(r: Runner, repoPath: string, branch: string): Promise<boolean> {
  const { stdout } = await r.exec(['git', '-C', repoPath, 'branch', '--list', branch])
  return stdout.trim().length > 0
}

async function remoteBranchExists(r: Runner, repoPath: string, branch: string): Promise<string | null> {
  try {
    const { stdout } = await r.exec(['git', '-C', repoPath, 'ls-remote', '--heads', 'origin', branch])
    if (stdout.trim().length === 0) return null
    return `origin/${branch}`
  } catch {
    return null
  }
}

async function syncLocalBranch(r: Runner, repoPath: string, branch: string): Promise<void> {
  await r.run(['git', '-C', repoPath, 'fetch', 'origin', branch])

  const { stdout: remoteRef } = await r.exec(
    ['git', '-C', repoPath, 'rev-parse', '--verify', `origin/${branch}`]
  ).catch(() => ({ stdout: '' }))

  if (!remoteRef.trim()) {
    console.log(`  No remote tracking branch for "${branch}", skipping sync.`)
    return
  }

  const { stdout: headRef } = await r.exec(
    ['git', '-C', repoPath, 'symbolic-ref', 'HEAD']
  ).catch(() => ({ stdout: '' }))

  if (headRef.trim() === `refs/heads/${branch}`) {
    console.log(`  Branch "${branch}" is currently checked out, skipping sync.`)
    return
  }

  const { stdout: aheadCount } = await r.exec(
    ['git', '-C', repoPath, 'rev-list', '--count', `origin/${branch}..${branch}`]
  )

  if (parseInt(aheadCount.trim(), 10) > 0) {
    console.warn(`  Warning: "${branch}" has local commits not in remote, skipping sync.`)
    return
  }

  await r.run(['git', '-C', repoPath, 'branch', '-f', branch, `origin/${branch}`])
}

export async function addWorktree(
  r: Runner,
  repoPath: string,
  worktreePath: string,
  newBranch: string,
  baseBranch: string
): Promise<void> {
  await r.mkdir(path.dirname(worktreePath))

  if (await localBranchExists(r, repoPath, newBranch)) {
    console.log(`  Branch "${newBranch}" exists locally, syncing with remote...`)
    await syncLocalBranch(r, repoPath, newBranch)
    await r.run(['git', '-C', repoPath, 'worktree', 'add', worktreePath, newBranch])
    return
  }

  const remoteBranch = await remoteBranchExists(r, repoPath, newBranch)
  if (remoteBranch) {
    console.log(`  Branch "${newBranch}" found on remote (${remoteBranch}), creating tracking branch.`)
    await r.run(['git', '-C', repoPath, 'worktree', 'add', '--track', '-b', newBranch, worktreePath, remoteBranch])
    return
  }

  await r.run(['git', '-C', repoPath, 'worktree', 'add', '-b', newBranch, worktreePath, baseBranch])
}

export async function isBranchSyncedToRemote(r: Runner, worktreePath: string): Promise<boolean> {
  try {
    await r.exec(['git', '-C', worktreePath, 'rev-parse', '--abbrev-ref', '@{u}'])
  } catch {
    return false
  }

  const { stdout } = await r.exec(
    ['git', '-C', worktreePath, 'rev-list', '--count', '@{u}..HEAD']
  )
  return parseInt(stdout.trim(), 10) === 0
}

export async function removeWorktree(r: Runner, repoPath: string, worktreePath: string): Promise<void> {
  await r.run(['git', '-C', repoPath, 'worktree', 'remove', worktreePath, '--force'])
}

export async function isGitRepo(r: Runner, dirPath: string): Promise<boolean> {
  try {
    await r.exec(['git', '-C', dirPath, 'rev-parse', '--git-dir'])
    return true
  } catch {
    return false
  }
}
