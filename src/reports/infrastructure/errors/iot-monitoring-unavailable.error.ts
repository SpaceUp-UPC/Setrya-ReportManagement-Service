import { describeIotMonitoringFailure } from '../clients/iot-monitoring/iot-monitoring-failure.js';

export class IotMonitoringUnavailableError extends Error {
  /** HTTP status returned by IoT Monitoring, when it answered at all. */
  readonly upstreamStatus?: number;

  constructor(spaceId: string, cause: unknown) {
    super(
      `Failed to fetch readings for space "${spaceId}" from IoT Monitoring: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'IotMonitoringUnavailableError';
    this.upstreamStatus = describeIotMonitoringFailure(cause).status;
  }
}
