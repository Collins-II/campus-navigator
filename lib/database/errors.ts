import { NextResponse } from "next/server";

export class MongoConnectionError extends Error {
  constructor(readonly reason: "configuration" | "unavailable") {
    super(
      reason === "configuration"
        ? "MongoDB is not configured for this deployment."
        : "MongoDB is temporarily unavailable."
    );
    this.name = "MongoConnectionError";
  }
}

type DatabaseErrorResponse = {
  error: string;
  code: string;
  retryable: boolean;
};

function errorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { name: typeof error, code: undefined as string | number | undefined };
  }

  const value = error as { name?: unknown; code?: unknown };
  const name =
    typeof value.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,49}$/.test(value.name)
      ? value.name
      : "UnknownError";
  const code =
    typeof value.code === "number"
      ? value.code
      : typeof value.code === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(value.code)
        ? value.code
        : undefined;

  return {
    name,
    code,
  };
}

function unavailable(error: unknown, details: ReturnType<typeof errorDetails>) {
  if (error instanceof MongoConnectionError) return true;
  if (
    [
      "MongoNetworkError",
      "MongoNetworkTimeoutError",
      "MongoSocketReadTimeoutError",
      "MongoOperationTimeoutError",
      "MongoServerSelectionError",
      "MongooseServerSelectionError",
      "MongoNotConnectedError",
      "MongoTopologyClosedError",
      "MongoPoolClearedError",
      "MongoServerClosedError",
    ].includes(details.name)
  ) {
    return true;
  }

  if (details.name === "MongooseError" && error instanceof Error) {
    return /buffering timed out|connection .* closed/i.test(error.message);
  }

  return [6, 7, 13, 18, 50, 89, 91, 262, 8000, 11600, 11602, 13435, 13436].includes(Number(details.code));
}

export function logApiError(error: unknown, operation: string) {
  if (error instanceof MongoConnectionError) return;
  const details = errorDetails(error);
  console.error("API operation failed", {
    operation,
    errorName: details.name,
    errorCode: details.code,
  });
}

export function apiErrorResponse(
  error: unknown,
  operation: string,
  fallbackMessage: string
) {
  const details = errorDetails(error);
  const serviceUnavailable = unavailable(error, details);
  const duplicate = Number(details.code) === 11000;
  const invalidInput =
    details.name === "ValidationError" ||
    details.name === "CastError" ||
    error instanceof SyntaxError;
  const status = serviceUnavailable
    ? 503
    : duplicate
      ? 409
      : invalidInput
        ? 400
        : 500;

  const response: DatabaseErrorResponse = serviceUnavailable
    ? {
        error: "Campus data is temporarily unavailable. Please try again shortly.",
        code: "DATABASE_UNAVAILABLE",
        retryable: true,
      }
    : duplicate
      ? {
          error: "This record already exists. Check the details and try again.",
          code: "DUPLICATE_RECORD",
          retryable: false,
        }
      : invalidInput
        ? {
            error: "Some submitted details are invalid. Please review them and try again.",
            code: "INVALID_DATA",
            retryable: false,
          }
        : {
            error: fallbackMessage,
            code: "INTERNAL_ERROR",
            retryable: false,
          };

  if (status >= 500) logApiError(error, operation);

  const headers = serviceUnavailable ? { "Retry-After": "5" } : undefined;
  return NextResponse.json(response, { status, headers });
}

export function withDatabaseErrorHandling<Arguments extends unknown[]>(
  handler: (...args: Arguments) => Promise<Response>,
  operation: string,
  fallbackMessage = "The request could not be completed. Please try again."
): (...args: Arguments) => Promise<Response> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      return apiErrorResponse(error, operation, fallbackMessage);
    }
  };
}
