export interface IotMonitoringReadingDto {
  id: string;
  deviceId: string;
  metricType: string;
  value: number;
  unit: string;
  receivedAt: string;
  status: string;
  measuredAt?: string;
  localState?: string;
}
