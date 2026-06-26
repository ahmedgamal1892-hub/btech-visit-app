import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const dir = join('supabase', 'migrations')
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

function transform(sql) {
  let out = sql

  out = out.replace(
    /CREATE TABLE (public\.\w+)/g,
    'CREATE TABLE IF NOT EXISTS $1',
  )

  out = out.replace(
    /CREATE UNIQUE INDEX (?!IF NOT EXISTS)([^\n]+)/g,
    'CREATE UNIQUE INDEX IF NOT EXISTS $1',
  )
  out = out.replace(
    /CREATE INDEX (?!IF NOT EXISTS)([^\n]+)/g,
    'CREATE INDEX IF NOT EXISTS $1',
  )

  out = out.replace(
    /^CREATE TRIGGER (\w+)\n([\s\S]*?)EXECUTE FUNCTION ([^;]+);/gm,
    (match, name, middle) => {
      const tableMatch = middle.match(/ON (public\.\w+|auth\.users)/)
      const table = tableMatch ? tableMatch[1] : null
      if (!table || match.includes('DROP TRIGGER IF EXISTS')) {
        return match
      }

      return `DROP TRIGGER IF EXISTS ${name} ON ${table};\n\n${match}`
    },
  )

  out = out.replace(
    /^CREATE POLICY (\w+)\n\s+ON (\S+)/gm,
    (match, name, table) => {
      if (match.includes('DROP POLICY IF EXISTS')) {
        return match
      }

      return `DROP POLICY IF EXISTS ${name} ON ${table};\n\n${match}`
    },
  )

  return out
}

const header = `-- =============================================================================
-- Visit APP By Gimi — Complete Database Schema
-- =============================================================================
-- Run this script ONCE in the Supabase SQL Editor on an empty project.
--
-- Merged from all migrations in dependency order:
${files.map((f) => `--   ${f}`).join('\n')}
--
-- Idempotent patterns used where possible:
--   CREATE EXTENSION IF NOT EXISTS
--   CREATE TABLE IF NOT EXISTS
--   CREATE [UNIQUE] INDEX IF NOT EXISTS
--   CREATE OR REPLACE FUNCTION
--   DROP TRIGGER / DROP POLICY IF EXISTS before CREATE
--   INSERT ... ON CONFLICT for seed data and storage bucket
-- =============================================================================

`

let body = ''

for (const file of files) {
  const content = readFileSync(join(dir, file), 'utf8')

  body += `\n-- =============================================================================\n`
  body += `-- SOURCE: ${file}\n`
  body += `-- =============================================================================\n\n`
  body += transform(content)
  body += '\n'
}

const outputPath = join('supabase', 'complete_schema.sql')
writeFileSync(outputPath, header + body, 'utf8')

console.log(
  `Wrote ${outputPath} (${(header + body).split('\n').length} lines) from ${files.length} migrations`,
)
