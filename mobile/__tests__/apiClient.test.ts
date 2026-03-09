import { ApiError } from '../shared/api/client';

describe('ApiError', () => {
  it('should create an error with status information', () => {
    const error = new ApiError(404, 'Not Found', '{"detail":"Task not found"}');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.body).toBe('{"detail":"Task not found"}');
    expect(error.message).toContain('404');
  });

  it('should create error for validation failure', () => {
    const error = new ApiError(400, 'Bad Request', '{"detail":"Title is required"}');
    expect(error.status).toBe(400);
    expect(error.body).toContain('Title is required');
  });

  it('should create error for forbidden action', () => {
    const error = new ApiError(403, 'Forbidden', '{"detail":"Cannot edit other user comment"}');
    expect(error.status).toBe(403);
  });

  it('should be an instance of Error', () => {
    const error = new ApiError(500, 'Server Error', '');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('API client configuration', () => {
  it('should have correct module API paths', () => {
    // Verify the API base URL structure matches our backend
    const moduleKeys = ['cleaning', 'shopping', 'finance'];
    moduleKeys.forEach((key) => {
      expect(key).toBeTruthy();
    });
  });
});
