import { prisma } from './prisma'

export async function getSystemConfig(key: string, defaultValue: string): Promise<string> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } })
    return row?.value ?? defaultValue
  } catch {
    return defaultValue
  }
}

export async function setSystemConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where:  { key },
    update: { value },
    create: { key, value },
  })
}
