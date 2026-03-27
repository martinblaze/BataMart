// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'BATAMART-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function main() {
  console.log('🌱 Starting database seeding...')
  await createAdmin()
  console.log('✅ Seeding completed successfully!')
}

async function createAdmin() {
  console.log('👤 Checking for existing admin...')

  // ── Pull credentials from environment ──────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminPhone    = process.env.ADMIN_PHONE
  const adminName     = process.env.ADMIN_NAME || 'System Administrator'

  const missing: string[] = []
  if (!adminEmail)    missing.push('ADMIN_EMAIL')
  if (!adminPassword) missing.push('ADMIN_PASSWORD')
  if (!adminPhone)    missing.push('ADMIN_PHONE')

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '))
    console.error('   Add them to your .env file and re-run the seed.')
    process.exit(1)
  }

  if (adminPassword!.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters.')
    process.exit(1)
  }

  // ── Check if admin already exists ──────────────────────────────────────
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (existingAdmin) {
    console.log('📋 Admin already exists:')
    console.log(`   - Email: ${existingAdmin.email}`)
    console.log(`   - Name:  ${existingAdmin.name}`)
    console.log(`   - ID:    ${existingAdmin.id}`)
    return
  }

  console.log('🔐 Creating new admin...')

  const hashedPassword = await bcrypt.hash(adminPassword!, 10)

  const admin = await prisma.user.create({
    data: {
      email:        adminEmail!,
      name:         adminName,
      password:     hashedPassword,
      role:         'ADMIN',
      phone:        adminPhone!,
      referralCode: generateReferralCode(),
    }
  })

  console.log('✅ Admin created successfully!')
  console.log('📧 Email:', admin.email)
  console.log('👤 Role: ', admin.role)
  console.log('🆔 ID:   ', admin.id)

  const verifyHash = await bcrypt.compare(adminPassword!, hashedPassword)
  console.log('🔒 Password hash valid:', verifyHash ? '✓ Yes' : '✗ No')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })