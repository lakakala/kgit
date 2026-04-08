import { execa } from 'execa'
import fs from 'node:fs'

function parseSshHost(machine: string): string {
  // "ssh://bytedance" → "bytedance"
  return machine.replace(/^ssh:\/\//, '')
}

function shellEscape(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`
}

export interface Runner {
  exec(args: string[]): Promise<{ stdout: string }>
  run(args: string[]): Promise<void>
  exists(remotePath: string): Promise<boolean>
  isDirectory(remotePath: string): Promise<boolean>
  readdir(remotePath: string): Promise<string[]>
  mkdir(remotePath: string): Promise<void>
  rm(remotePath: string): Promise<void>
  rmdir(remotePath: string): Promise<void>
  isRemote: boolean
}

export function createRunner(machine?: string): Runner {
  if (!machine) {
    return createLocalRunner()
  }
  return createSshRunner(parseSshHost(machine))
}

function createLocalRunner(): Runner {
  return {
    isRemote: false,

    async exec(args: string[]): Promise<{ stdout: string }> {
      const { stdout } = await execa(args[0], args.slice(1), { stdio: 'pipe' })
      return { stdout }
    },

    async run(args: string[]): Promise<void> {
      console.log(`  $ ${args.join(' ')}`)
      const result = await execa(args[0], args.slice(1), { all: true }).catch(err => {
        if (err.all) process.stderr.write(err.all + '\n')
        throw err
      })
      if (result.all) process.stdout.write(result.all + '\n')
    },

    async exists(p: string): Promise<boolean> {
      return fs.existsSync(p)
    },

    async isDirectory(p: string): Promise<boolean> {
      try {
        return fs.statSync(p).isDirectory()
      } catch {
        return false
      }
    },

    async readdir(p: string): Promise<string[]> {
      return fs.readdirSync(p)
    },

    async mkdir(p: string): Promise<void> {
      await fs.promises.mkdir(p, { recursive: true })
    },

    async rm(p: string): Promise<void> {
      fs.rmSync(p, { recursive: true, force: true })
    },

    async rmdir(p: string): Promise<void> {
      fs.rmdirSync(p)
    },
  }
}

function createSshRunner(host: string): Runner {
  function sshArgs(args: string[]): string[] {
    const remoteCmd = args.map(shellEscape).join(' ')
    return [host, remoteCmd]
  }

  return {
    isRemote: true,

    async exec(args: string[]): Promise<{ stdout: string }> {
      const { stdout } = await execa('ssh', sshArgs(args), { stdio: 'pipe' })
      return { stdout }
    },

    async run(args: string[]): Promise<void> {
      console.log(`  $ [${host}] ${args.join(' ')}`)
      const result = await execa('ssh', sshArgs(args), { all: true }).catch(err => {
        if (err.all) process.stderr.write(err.all + '\n')
        throw err
      })
      if (result.all) process.stdout.write(result.all + '\n')
    },

    async exists(p: string): Promise<boolean> {
      try {
        await execa('ssh', [host, `test -e ${shellEscape(p)}`], { stdio: 'pipe' })
        return true
      } catch {
        return false
      }
    },

    async isDirectory(p: string): Promise<boolean> {
      try {
        await execa('ssh', [host, `test -d ${shellEscape(p)}`], { stdio: 'pipe' })
        return true
      } catch {
        return false
      }
    },

    async readdir(p: string): Promise<string[]> {
      const { stdout } = await execa('ssh', [host, `ls ${shellEscape(p)}`], { stdio: 'pipe' })
      return stdout.trim().split('\n').filter(l => l.length > 0)
    },

    async mkdir(p: string): Promise<void> {
      await execa('ssh', [host, `mkdir -p ${shellEscape(p)}`], { stdio: 'pipe' })
    },

    async rm(p: string): Promise<void> {
      await execa('ssh', [host, `rm -rf ${shellEscape(p)}`], { stdio: 'pipe' })
    },

    async rmdir(p: string): Promise<void> {
      await execa('ssh', [host, `rmdir ${shellEscape(p)}`], { stdio: 'pipe' })
    },
  }
}
