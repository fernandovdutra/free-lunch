import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendInsightEmail } from '../emailSender';

describe('sendInsightEmail', () => {
  const originalEnv = process.env;
  const mockFetch = vi.fn();

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('skips silently when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    await sendInsightEmail('test@example.com', 'Subject', '<p>Body</p>');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls Resend API with correct parameters', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    mockFetch.mockResolvedValueOnce({ ok: true });

    await sendInsightEmail('user@example.com', 'Daily Update', '<h1>Hello</h1>');

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test-key-123');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.to).toEqual(['user@example.com']);
    expect(body.subject).toBe('Daily Update');
    expect(body.html).toBe('<h1>Hello</h1>');
    expect(body.from).toContain('Free Lunch');
  });

  it('throws on non-200 response with status and body', async () => {
    process.env.RESEND_API_KEY = 'test-key-123';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    await expect(
      sendInsightEmail('user@example.com', 'Test', '<p>Test</p>')
    ).rejects.toThrow('Resend API error 429: Rate limited');
  });
});
