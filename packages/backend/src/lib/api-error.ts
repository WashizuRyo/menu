export abstract class ApiError extends Error {
  abstract readonly status: 400 | 413 | 422 | 502 | 503
}

export class ValidationError extends ApiError {
  readonly status = 400
}

export class PayloadTooLargeError extends ApiError {
  readonly status = 413
}

export class UnprocessableEntityError extends ApiError {
  readonly status = 422
}

export class BadGatewayError extends ApiError {
  readonly status = 502
}

export class ServiceUnavailableError extends ApiError {
  readonly status = 503
}
