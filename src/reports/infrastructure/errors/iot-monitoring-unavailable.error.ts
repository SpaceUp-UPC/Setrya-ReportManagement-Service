export class IotMonitoringUnavailableError extends Error {
  constructor(spaceId: string, cause: unknown) {
    super(
      `Failed to fetch readings for space "${spaceId}" from IoT Monitoring: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = 'IotMonitoringUnavailableError';
  }
}
