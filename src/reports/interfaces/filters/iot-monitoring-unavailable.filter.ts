import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { IotMonitoringUnavailableError } from '../../infrastructure/errors/iot-monitoring-unavailable.error.js';

export const IOT_MONITORING_UNAVAILABLE_MESSAGE =
  'IoT Monitoring service is unavailable or rejected the request';

/** Maps a failed IoT Monitoring call to 502 Bad Gateway. */
@Catch(IotMonitoringUnavailableError)
export class IotMonitoringUnavailableFilter implements ExceptionFilter {
  catch(exception: IotMonitoringUnavailableError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { upstreamStatus } = exception;
    response.status(HttpStatus.BAD_GATEWAY).json({
      statusCode: HttpStatus.BAD_GATEWAY,
      message:
        upstreamStatus === undefined
          ? IOT_MONITORING_UNAVAILABLE_MESSAGE
          : `${IOT_MONITORING_UNAVAILABLE_MESSAGE} (upstream status ${upstreamStatus})`,
      error: 'Bad Gateway',
      ...(upstreamStatus === undefined ? {} : { upstreamStatus }),
    });
  }
}
