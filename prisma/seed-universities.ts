// prisma/seed-universities.ts
// Run: npx tsx prisma/seed-universities.ts
// This seeds the University table with UNIZIK data.
// When you add more universities later, just add entries to the UNIVERSITIES array.

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const UNIVERSITIES = [
  {
    name:         'Nnamdi Azikiwe University',
    shortName:    'UNIZIK',
    slug:         'unizik',
    location:     'Awka, Anambra State',
    isActive:     true,
    deliveryAreas: [
      'Aroma',
      'Tempsite',
      'Express Gate',
      'Ifite',
      'Bus Stand',
      'School Hostel',
      'Amansea',
    ],
    hostels: [
      'Python Hall',
      'Cobra Hall',
      'Bison Hall',
      'Antelope Hall',
      'Buffalo Hall',
      'Impala Hall',
      'Cheetah Hall',
      'Leopard Hall',
      'Lioness Hall',
      'Panther Hall',
      'Gazelle Hall',
      'Zebra Hall',
    ],
  },
]

async function main() {
  console.log('🌱 Seeding universities...')

  for (const uni of UNIVERSITIES) {
    const result = await prisma.university.upsert({
      where:  { slug: uni.slug },
      update: {
        name:          uni.name,
        shortName:     uni.shortName,
        location:      uni.location,
        isActive:      uni.isActive,
        deliveryAreas: uni.deliveryAreas,
        hostels:       uni.hostels,
      },
      create: uni,
    })
    console.log(`✅ ${result.shortName} (${result.id})`)
  }

  console.log('🎉 Done.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())