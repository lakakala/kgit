import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { z } from 'zod'

const CONFIG_PATH = path.join(os.homedir(), '.config', '.kget', 'config.json')

const ProjectSchema = z.object({
  name: z.string(),
  path: z.string(),
})

const ConfigSchema = z.object({
  workspace: z.string(),
  projects: z.array(ProjectSchema),
})

export type Project = z.infer<typeof ProjectSchema>
export type Config = z.infer<typeof ConfigSchema>

function expandEnvVars(value: string): string {
  return value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, name) => {
    return process.env[name] ?? `$${name}`
  }).replace(/\$\{([^}]+)\}/g, (_, name) => {
    return process.env[name] ?? `\${${name}}`
  })
}

function expandConfig(config: Config): Config {
  return {
    workspace: expandEnvVars(config.workspace),
    projects: config.projects.map(p => ({
      name: p.name,
      path: expandEnvVars(p.path),
    })),
  }
}

export function loadConfig(): Config {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config file not found at ${CONFIG_PATH}. Please create it first.`)
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
  const parsed = JSON.parse(raw)
  const config = ConfigSchema.parse(parsed)
  return expandConfig(config)
}

export function findProject(config: Config, name: string): Project {
  const project = config.projects.find(p => p.name === name)
  if (!project) {
    throw new Error(
      `Project "${name}" not found in config. Available projects: ${config.projects.map(p => p.name).join(', ')}`
    )
  }
  return project
}

export function getConfigPath(): string {
  return CONFIG_PATH
}
