import type { ArgumentsHost } from '@nestjs/common';
import { IotMonitoringUnavailableError } from '../../infrastructure/errors/iot-monitoring-unavailable.error.js';
import { IotMonitoringUnavailableFilter } from './iot-monitoring-unavailable.filter.js';

describe('IotMonitoringUnavailableFilter', () => {
  function run(error: IotMonitoringUnavailableError) {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    new IotMonitoringUnavailableFilter().catch(error, host);

    return { status, json };
  }

  it('answers 502 with the upstream status when IoT Monitoring responded', () => {
    const cause = Object.assign(new Error('Request failed'), {
      response: { status: 401 },
    });

    const { status, json } = run(new IotMonitoringUnavailableError('s1', cause));

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({
      statusCode: 502,
      message:
        'IoT Monitoring service is unavailable or rejected the request (upstream status 401)',
      error: 'Bad Gateway',
      upstreamStatus: 401,
    });
  });

  it('omits the upstream status when there was no response', () => {
    const { status, json } = run(
      new IotMonitoringUnavailableError('s1', new Error('timeout')),
    );

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({
      statusCode: 502,
      message: 'IoT Monitoring service is unavailable or rejected the request',
      error: 'Bad Gateway',
    });
  });
});
