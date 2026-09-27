/** An error whose message is safe to show the user. */
export class AppError extends Error {
  constructor(message: string, readonly status = 400, readonly code?: string, readonly data?: Record<string, unknown>) {
    super(message);
  }
}

export const notFound = (what = 'That page') => new AppError(`${what} could not be found.`, 404, 'NOT_FOUND');
