# kgit

A CLI tool for managing multi-repo workspaces using [git worktree](https://git-scm.com/docs/git-worktree).

## Install

```bash
npm install -g @lakakala/kgit
```

## Configuration

Create `~/.config/kgit/config.json`:

```json
{
  "workspace": "$HOME/projects",
  "projects": [
    {
      "name": "form",
      "path": "$HOME/repos/my-form-repo"
    },
    {
      "name": "auth",
      "path": "$HOME/repos/my-auth-repo"
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `workspace` | Root directory where workspaces are created |
| `projects[].name` | Project alias used in `-p` options |
| `projects[].path` | Absolute path to the git repository |

Environment variables (`$HOME`, `$VAR`, `${VAR}`) are expanded in both `workspace` and `path`.

## Commands

### `kgit new`

Create a new workspace with git worktrees.

```bash
kgit new <workspace> [-b <branch>] -p <project[:base]> [-p <project[:base]> ...]
```

The new branch name defaults to `<workspace>` unless overridden with `-b`.  
`<base>` is the base branch used when creating a new branch (default: `master`).

For each `-p`, kgit resolves the branch using this order:

1. Branch already exists **locally** → check it out directly
2. Branch exists **on remote** → create a local tracking branch
3. Branch does not exist → create a new branch from `<base>`

**Examples:**

```bash
# New branch "feat-login" from master in each project
kgit new feat-login -p form -p auth

# Specify a different base branch
kgit new feat-login -p form:develop -p auth:develop

# Explicit branch name (reuses existing or creates from base)
kgit new feat-login -b my-feature -p form:develop

# Mix projects with different base branches
kgit new feat-login -p form:master -p auth:develop
```

Result layout:

```
$workspace/
└── feat-login/
    ├── form/     ← worktree on branch "feat-login"
    └── auth/     ← worktree on branch "feat-login"
```

---

### `kgit append`

Add more projects to an existing workspace. Accepts the same options as `new`.

```bash
kgit append <workspace> [-b <branch>] -p <project[:base]> [-p <project[:base]> ...]
```

**Example:**

```bash
kgit append feat-login -p gateway:master
```

---

### `kgit remove`

Remove an entire workspace or specific projects from it.

```bash
kgit remove <workspace>                          # remove entire workspace
kgit remove <workspace> -p <project> [-p ...]   # remove specific projects
```

**Examples:**

```bash
kgit remove feat-login           # removes all worktrees and the directory
kgit remove feat-login -p form   # removes only the "form" worktree
```

---

### `kgit list`

List all workspaces and their projects with the current branch.

```bash
kgit list
```

**Output:**

```
feat-login
  └─ form  (feat-login)
  └─ auth  (feat-login)
```
