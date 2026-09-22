import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

export default defineConfig({
  migrations: {
    seed: 'node prisma/seed.js', // <-- Aponta para o local do seu arquivo de seed
  },
  datasource: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
});