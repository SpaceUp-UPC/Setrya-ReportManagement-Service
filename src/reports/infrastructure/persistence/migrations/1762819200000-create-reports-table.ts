import { Table, type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateReportsTable1762819200000 implements MigrationInterface {
  name = 'CreateReportsTable1762819200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "reports_type_enum" AS ENUM ('INSTALLATION', 'MAINTENANCE', 'HOME_HISTORY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "reports_format_enum" AS ENUM ('PDF', 'CSV')`,
    );
    await queryRunner.query(
      `CREATE TYPE "reports_status_enum" AS ENUM ('PENDING', 'READY', 'FAILED')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'reports',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'type', type: 'reports_type_enum' },
          { name: 'requester_id', type: 'uuid' },
          { name: 'space_id', type: 'uuid' },
          { name: 'period_start', type: 'timestamptz' },
          { name: 'period_end', type: 'timestamptz' },
          { name: 'format', type: 'reports_format_enum' },
          { name: 'status', type: 'reports_status_enum' },
          { name: 'file_url', type: 'varchar', isNullable: true },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('reports');
    await queryRunner.query(`DROP TYPE "reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "reports_format_enum"`);
    await queryRunner.query(`DROP TYPE "reports_type_enum"`);
  }
}
