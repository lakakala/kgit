import { describe, it, expect } from 'vitest'

describe('argv parsing', () => {
  function parseProjectFlags(args: string[]): Array<{ name: string; branch: string }> {
    const projects: Array<{ name: string; branch: string }> = []
    let i = 0
    while (i < args.length) {
      if (args[i] === '-p') {
        const name = args[i + 1]
        const branch = args[i + 2]
        if (name && !name.startsWith('-') && branch && !branch.startsWith('-')) {
          projects.push({ name, branch })
        }
        i += 3
      } else {
        i++
      }
    }
    return projects
  }

  it('parses single -p flag', () => {
    const result = parseProjectFlags(['-p', 'form', 'main'])
    expect(result).toEqual([{ name: 'form', branch: 'main' }])
  })

  it('parses multiple -p flags', () => {
    const result = parseProjectFlags(['-p', 'form', 'main', '-p', 'auth', 'develop'])
    expect(result).toEqual([
      { name: 'form', branch: 'main' },
      { name: 'auth', branch: 'develop' },
    ])
  })

  it('ignores non -p args', () => {
    const result = parseProjectFlags(['new', 'my-workspace', '-p', 'form', 'main'])
    expect(result).toEqual([{ name: 'form', branch: 'main' }])
  })

  it('returns empty array when no -p flags', () => {
    const result = parseProjectFlags(['new', 'my-workspace'])
    expect(result).toEqual([])
  })
})
