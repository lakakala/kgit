# kgit

使用 [git worktree](https://git-scm.com/docs/git-worktree) 管理多仓库工作区的 CLI 工具。

## 安装

```bash
npm install -g @lakakala/kgit
```

## 配置

在 `~/.config/kgit/config.json` 中创建配置文件：

```json
{
  "workspace": "$HOME/projects",
  "ide": "trae",
  "projects": [
    {
      "name": "form",
      "path": "$HOME/repos/ens_bpm_form"
    },
    {
      "name": "auth",
      "path": "$HOME/repos/ens_bpm_auth"
    }
  ]
}
```

| 字段 | 说明 |
|------|------|
| `workspace` | 工作区根目录，所有工程都创建在此目录下 |
| `ide` | 默认编辑器（可选），支持 `code`、`trae`、`cursor`、`nvim`、`vim` 等 |
| `projects[].name` | 项目别名，在 `-p` 参数中使用 |
| `projects[].path` | 项目 git 仓库的绝对路径 |

`workspace` 和 `path` 中均支持环境变量（`$HOME`、`$VAR`、`${VAR}`）。

---

## 命令

### `kgit new`

创建新工程，为每个项目建立 git worktree。

```bash
kgit new <工程名称> [-b <分支名>] -p <项目[:基准分支]> [-p ...]
```

**选项**

| 选项 | 说明 |
|------|------|
| `-b <branch>` | 新分支名，默认使用工程名称 |
| `-p <project[:base]>` | 添加项目，可选指定基准分支（默认 `master`），可重复使用 |

**分支解析逻辑**（按优先级）：

1. 本地已存在该分支 → 直接使用
2. 远程存在该分支 → 创建本地追踪分支
3. 分支不存在 → 基于 `<基准分支>` 新建

**示例**

```bash
# 基于 master 创建工程 feat-login，新分支名为 feat-login
kgit new feat-login -p form -p auth

# 指定基准分支
kgit new feat-login -p form:develop -p auth:develop

# 使用 -b 指定新分支名（可复用已有本地/远程分支）
kgit new feat-login -b my-feature -p form:develop

# 多项目使用不同基准分支
kgit new feat-login -p form:master -p auth:develop
```

**目录结构**

```
$workspace/
└── feat-login/
    ├── form/     ← worktree，分支 feat-login
    └── auth/     ← worktree，分支 feat-login
```

---

### `kgit append`

向已有工程追加项目，选项与 `new` 相同。

```bash
kgit append <工程名称> [-b <分支名>] -p <项目[:基准分支]> [-p ...]
```

**示例**

```bash
kgit append feat-login -p gateway:master
```

---

### `kgit remove`

删除工程或工程中的指定项目。

```bash
kgit remove <工程名称>               # 删除整个工程
kgit remove <工程名称> -p <项目> [-p ...]  # 删除指定项目
```

删除前会检测分支是否已推送到远程，若存在未同步的提交则需二次确认。

**示例**

```bash
kgit remove feat-login           # 删除所有 worktree 及工程目录
kgit remove feat-login -p form   # 仅删除 form 的 worktree
```

---

### `kgit list`

列出所有已创建的工程及其项目和当前分支。

```bash
kgit list
```

**输出示例**

```
feat-login
  └─ form  (feat-login)
  └─ auth  (feat-login)
```

---

### `kgit edit`

用指定编辑器打开项目目录。

```bash
kgit edit <工程名称> <项目名称> [--ide <编辑器>]
```

**选项**

| 选项 | 说明 |
|------|------|
| `--ide <name>` | 指定编辑器，未传则依次读取 config.json 中的 `ide` 字段，再自动检测 |

**编辑器优先级**：`--ide` 参数 → config.json `ide` 字段 → 自动检测（`code → trae → cursor → nvim → vim`）

| 类型 | 支持的编辑器 |
|------|------------|
| GUI（后台启动） | `code`、`trae`、`cursor`、`idea`、`webstorm` |
| 终端（前台运行） | `nvim`、`vim`、`vi`、`nano` |

**示例**

```bash
kgit edit feat-login form
kgit edit feat-login form --ide nvim
```

---

### `kgit version`

打印当前版本号。

```bash
kgit version
```
