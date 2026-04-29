import { PrismaClient } from '@prisma/client'
import { CATEGORY_TREE, decodeProductDataServer } from '../lib/variants'

const prisma = new PrismaClient()

function findCategoryKeyByLabel(label?: string | null) {
  if (!label) return null
  const normalized = label.trim().toLowerCase()
  for (const [k, v] of Object.entries(CATEGORY_TREE)) {
    if (v.label.toLowerCase() === normalized) return k
  }
  return null
}

function findSubcategoryKeyByLabel(categoryKey: string, label?: string | null) {
  if (!label) return null
  const normalized = label.trim().toLowerCase()
  const subs = CATEGORY_TREE[categoryKey]?.subcategories || {}
  for (const [k, v] of Object.entries(subs)) {
    if (v.label.toLowerCase() === normalized) return k
  }
  return null
}

async function main() {
  const apply = process.argv.includes('--apply')
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: { attributeValues: true },
    take: 2000,
  })

  let touched = 0
  for (const p of products) {
    if (p.attributeValues.length > 0) continue
    const decoded = decodeProductDataServer(p.description || '')
    const variantEntries = Object.entries(decoded.variants || {}).filter(([, values]) => Array.isArray(values) && values.length > 0)
    const tagEntries = (decoded.tags || []).slice(0, 8)
    if (!variantEntries.length && !tagEntries.length) continue

    const inferredCategoryKey = p.categoryKey || findCategoryKeyByLabel(p.category)
    const inferredSubcategoryKey = inferredCategoryKey
      ? (p.subcategoryKey || findSubcategoryKeyByLabel(inferredCategoryKey, p.subcategory))
      : p.subcategoryKey

    const createAttrs = [
      ...variantEntries.map(([key, values]) => ({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        value: values,
        searchable: true,
        filterable: true,
      })),
      ...(tagEntries.length ? [{
        key: 'legacyTags',
        label: 'Legacy Tags',
        value: tagEntries,
        searchable: true,
        filterable: false,
      }] : []),
    ]

    touched++
    if (apply) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          categoryKey: inferredCategoryKey || p.categoryKey,
          subcategoryKey: inferredSubcategoryKey || p.subcategoryKey,
          attributeValues: {
            create: createAttrs as any,
          },
        },
      })
    }
  }

  console.log(`[backfill] scanned=${products.length} candidates=${touched} apply=${apply}`)
}

main()
  .catch((e) => {
    console.error('[backfill] failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
