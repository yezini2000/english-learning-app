// Prisma 客户端单例
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
