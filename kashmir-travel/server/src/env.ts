import 'dotenv/config';

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  DB_HOST: need('DB_HOST'),
  DB_PORT: Number(process.env.DB_PORT ?? 3306),
  DB_USER: need('DB_USER'),
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  DB_NAME: need('DB_NAME'),
  JWT_SECRET: need('JWT_SECRET'),
};
