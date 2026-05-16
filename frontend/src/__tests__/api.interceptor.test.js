import { shouldRetryServerError } from '../services/api';

describe('api interceptor retry policy', () => {
  it('retries idempotent GET requests once', () => {
    expect(shouldRetryServerError({ method: 'get' })).toBe(true);
    expect(shouldRetryServerError({ method: 'GET' })).toBe(true);
    expect(shouldRetryServerError({ method: 'head' })).toBe(true);
  });

  it('does not retry POST requests', () => {
    expect(shouldRetryServerError({ method: 'post' })).toBe(false);
    expect(shouldRetryServerError({ method: 'put' })).toBe(false);
    expect(shouldRetryServerError({ method: 'delete' })).toBe(false);
  });

  it('does not retry after the first attempt', () => {
    expect(shouldRetryServerError({ method: 'get', _serverRetried: true })).toBe(false);
  });
});
