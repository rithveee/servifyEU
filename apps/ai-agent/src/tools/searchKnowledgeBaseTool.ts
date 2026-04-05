import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

export async function searchKnowledgeBaseTool(
  input: { query: string; locale: string },
  prisma: PrismaClient
): Promise<object> {
  const { query, locale } = input

  // Try pgvector semantic search first (requires embeddings to be indexed)
  try {
    const results = await prisma.$queryRaw<Array<{ content: string; source: string; similarity: number }>>`
      SELECT content, source, 1 - (embedding <=> (
        SELECT embedding FROM "KnowledgeChunk"
        WHERE locale = ${locale}
        ORDER BY embedding <=> '${query}'
        LIMIT 1
      )) as similarity
      FROM "KnowledgeChunk"
      WHERE locale = ${locale}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> (
        SELECT embedding FROM "KnowledgeChunk"
        WHERE locale = ${locale}
        LIMIT 1
      )
      LIMIT 5
    `

    if (results.length > 0) {
      return {
        found: true,
        results: results.map((r) => ({ content: r.content, source: r.source })),
      }
    }
  } catch {
    // Fall through to file-based fallback
  }

  // Fallback: search markdown files directly
  const kbDir = path.join(__dirname, '../../knowledge-base')
  const results: Array<{ content: string; source: string }> = []
  const queryLower = query.toLowerCase()

  const searchDir = (dir: string, source: string) => {
    if (!fs.existsSync(dir)) return
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        searchDir(filePath, `${source}/${file}`)
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf-8')
        if (content.toLowerCase().includes(queryLower)) {
          // Extract relevant section
          const lines = content.split('\n')
          const matchLine = lines.findIndex((l) => l.toLowerCase().includes(queryLower))
          if (matchLine !== -1) {
            const start = Math.max(0, matchLine - 2)
            const end = Math.min(lines.length - 1, matchLine + 5)
            results.push({
              content: lines.slice(start, end).join('\n'),
              source: `${source}/${file}`,
            })
          }
        }
      }
    }
  }

  // Search locale-specific FAQ first, then policies
  searchDir(path.join(kbDir, 'faq', locale), `faq/${locale}`)
  if (results.length === 0 && locale !== 'en') {
    searchDir(path.join(kbDir, 'faq', 'en'), 'faq/en')
  }
  if (results.length === 0) {
    searchDir(path.join(kbDir, 'policies'), 'policies')
  }

  if (results.length === 0) {
    return {
      found: false,
      message: 'No relevant information found in the knowledge base. Escalating to human agent is recommended.',
    }
  }

  return { found: true, results: results.slice(0, 3) }
}
