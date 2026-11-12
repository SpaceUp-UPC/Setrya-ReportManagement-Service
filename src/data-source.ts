import { config } from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ReportOrmEntity } from './reports/infrastructure/persistence/entities/report.orm-entity.js';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [ReportOrmEntity],
  migrations: ['src/reports/infrastructure/persistence/migrations/*.ts'],
  synchronize: false,
});
