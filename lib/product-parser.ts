import { prisma } from '@/lib/prisma'

type Parsed = Record<string, string>

function cleanRawText(input: string) {
  return input.trim().replace(/\s+/g, ' ').toLowerCase()
}

function pickCondition(text: string): string | undefined {
  if (/\buk\s*used\b/i.test(text)) return 'UK Used'
  if (/\bnigerian\s*used\b/i.test(text)) return 'Nigerian Used'
  if (/\brefurbished\b/i.test(text)) return 'Refurbished'
  if (/\bbrand\s*new\b/i.test(text) || /\bnew\b/i.test(text)) return 'Brand New'
  return undefined
}

function uniqueGbValues(text: string) {
  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*gb\b/gi)).map((m) => `${m[1]}GB`)
  return Array.from(new Set(matches))
}

function normalizeModelText(text: string, brand?: string) {
  let value = text.trim()
  if (brand) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    value = value.replace(new RegExp(`^${escaped}\\s+`, 'i'), '')
  }
  value = value
    .replace(/\buk\s*used\b/gi, '')
    .replace(/\bnigerian\s*used\b/gi, '')
    .replace(/\bbrand\s*new\b/gi, '')
    .replace(/\brefurbished\b/gi, '')
    .replace(/\b\d+(?:\.\d+)?\s*gb\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  return value
}

export async function parseProductText(input: string): Promise<Parsed> {
  const rawText = cleanRawText(input)
  if (!rawText) return {}

  const cached = await prisma.productParseCache.findUnique({ where: { rawText } })
  if (cached?.parsedData && typeof cached.parsedData === 'object') {
    return cached.parsedData as Parsed
  }

  const out: Parsed = {}

  const brands = await prisma.attributeValueStats.findMany({
    where: { key: 'brand' },
    orderBy: { count: 'desc' },
    take: 200,
    select: { value: true },
  })

  const brandMatch = brands
    .map((b) => b.value)
    .find((b) => b && rawText.includes(String(b).toLowerCase()))
  if (brandMatch) out.brand = String(brandMatch)

  const condition = pickCondition(input)
  if (condition) out.condition = condition

  const gbValues = uniqueGbValues(input)
  if (gbValues.length > 0) out.ram = gbValues[0]
  if (gbValues.length > 1) out.storage = gbValues[1]

  const model = normalizeModelText(input, out.brand)
  if (model && model.length <= 60) out.model = model

  await prisma.productParseCache
    .create({
      data: {
        rawText,
        parsedData: out,
      },
    })
    .catch(() => {})

  return out
}
