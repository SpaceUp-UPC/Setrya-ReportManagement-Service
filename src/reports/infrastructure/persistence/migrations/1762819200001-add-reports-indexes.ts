import { TableIndex, type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddReportsIndexes1762819200001 implements MigrationInterface {
  name = 'AddReportsIndexes1762819200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'reports',
      new TableIndex({
        name: 'IDX_reports_space_id',
        columnNames: ['space_id'],
      }),
    );
    await queryRunner.createIndex(
      'reports',
      new TableIndex({
        name: 'IDX_reports_type_status',
        columnNames: ['type', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('reports', 'IDX_reports_type_status');
    await queryRunner.dropIndex('reports', 'IDX_reports_space_id');
  }
}
