const MAX_UPSTREAM_MESSAGE_LENGTH = 200;

/** Safe-to-log facts about a failed IoT Monitoring call. */
export interface IotMonitoringFailureDetails {
  /** HTTP status of the upstream response, when there was one. */
  status?: number;
  /** Transport error code such as ECONNABORTED or ENOTFOUND. */
  code?: string;
  /** `message` field of the upstream response body, when present. */
  upstreamMessage?: string;
  /** Message of the underlying error. */
  reason: string;
}

/**
 * Extracts the facts worth logging from a failed HTTP call without touching
 * the request config, so the Authorization header can never leak.
 * Duck-typed to avoid depending on axios directly.
 */
export function describeIotMonitoringFailure(
  error: unknown,
): IotMonitoringFailureDetails {
  const details: IotMonitoringFailureDetails = {
    reason: error instanceof Error ? error.message : String(error),
  };
  if (typeof error !== 'object' || error === null) {
    return details;
  }

  const { code, response } = error as {
    code?: unknown;
    response?: { status?: unknown; data?: unknown };
  };
  if (typeof code === 'string') {
    details.code = code;
  }
  if (typeof response?.status === 'number') {
    details.status = response.status;
  }
  const body = response?.data as { message?: unknown } | undefined;
  if (typeof body?.message === 'string') {
    details.upstreamMessage = body.message.slice(0, MAX_UPSTREAM_MESSAGE_LENGTH);
  }
  return details;
}
