import { config } from 'dotenv';

// Load .env first (credentials, host, port), then force the values the e2e
// suite depends on. process.env wins over .env inside @nestjs/config, so these
// overrides apply to the app under test as well.
config({ quiet: true });

export const E2E_DB_NAME = process.env.E2E_DB_NAME ?? 'report_management_test';

process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'postgres';
process.env.DB_PASSWORD ??= 'postgres';
process.env.DB_SSL = 'false';
process.env.DB_NAME = E2E_DB_NAME;
// Never depend on other services or the network.
process.env.DATA_PROVIDER = 'mock';
process.env.CSV_DELIMITER = ';';
