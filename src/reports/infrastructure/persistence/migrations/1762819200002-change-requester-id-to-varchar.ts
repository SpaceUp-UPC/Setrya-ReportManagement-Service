import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * IAM issues tokens whose `sub` is the user's email, not a UUID, so
 * reports.requester_id must hold arbitrary strings.
 */
export class ChangeRequesterIdToVarchar1762819200002
  implements MigrationInterface
{
  name = 'ChangeRequesterIdToVarchar1762819200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "requester_id" TYPE character varying USING "requester_id"::text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Fails if any row holds a value that is not a valid UUID (e.g. an email).
    await queryRunner.query(
      `ALTER TABLE "reports" ALTER COLUMN "requester_id" TYPE uuid USING "requester_id"::uuid`,
    );
  }
}
