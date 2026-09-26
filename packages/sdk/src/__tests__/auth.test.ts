import { describe, it, expect, vi, beforeEach } from "vitest";
import { DyrectedClient } from "../index.js";

describe("DyrectedClient auth collection methods", () => {
  let client: DyrectedClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    client = new DyrectedClient({
      baseUrl: "http://api.test",
      fetch: mockFetch as any,
    });
  });

  it("sends invite with email string and options", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "Invite sent to jane@example.com.",
          token: "tok_123",
          inviteUrl: "https://invest.app/accept?inviteToken=tok_123",
          emailSent: true,
        }),
    });

    const res = await client.collection("investors").invite("jane@example.com", {
      inviteUrl: "https://invest.app/accept",
      role: "investor",
    });

    expect(res.success).toBe(true);
    expect(res.emailSent).toBe(true);
    expect(res.token).toBe("tok_123");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/collections/investors/invite");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      email: "jane@example.com",
      inviteUrl: "https://invest.app/accept",
      role: "investor",
    });
  });

  it("sends invite with full document payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "Invite sent to john@example.com.",
          token: "tok_456",
          inviteUrl: "https://invest.app/accept?inviteToken=tok_456",
          emailSent: true,
        }),
    });

    const res = await client.collection("investors").invite({
      email: "john@example.com",
      firstName: "John",
      bvn: "12345678901",
      inviteUrl: "https://invest.app/onboard",
    });

    expect(res.token).toBe("tok_456");
    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      email: "john@example.com",
      firstName: "John",
      bvn: "12345678901",
      inviteUrl: "https://invest.app/onboard",
    });
  });

  it("creates headless invite token with createInviteToken", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "Invite created for headless@example.com.",
          token: "tok_headless",
          inviteUrl: "https://invest.app/accept?inviteToken=tok_headless",
          emailSent: false,
        }),
    });

    const res = await client.collection("investors").createInviteToken("headless@example.com");

    expect(res.token).toBe("tok_headless");
    expect(res.inviteUrl).toContain("inviteToken=tok_headless");

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      email: "headless@example.com",
      sendEmail: false,
    });
  });

  it("requests password reset via sendPasswordReset and sendResetLink", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "If an account with that email exists, a reset link has been sent.",
          emailSent: true,
        }),
    });

    const res = await client.collection("users").sendPasswordReset("user@example.com", {
      resetUrl: "https://app.test/reset",
    });
    expect(res.success).toBe(true);
    expect(res.emailSent).toBe(true);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/collections/users/forgot-password");
    expect(JSON.parse(init.body)).toEqual({
      email: "user@example.com",
      resetUrl: "https://app.test/reset",
    });
  });

  it("creates headless reset token with createPasswordResetToken", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          message: "If an account with that email exists, a reset link has been sent.",
          token: "reset_headless_tok",
          resetUrl: "https://app.test/reset?token=reset_headless_tok",
          emailSent: false,
        }),
    });

    const res = await client.collection("users").createPasswordResetToken("user@example.com");
    expect(res.token).toBe("reset_headless_tok");
    expect(res.resetUrl).toContain("token=reset_headless_tok");

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      email: "user@example.com",
      sendEmail: false,
    });
  });

  it("validates token on mount via verifyToken", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          valid: true,
          email: "valid@example.com",
          collection: "investors",
        }),
    });

    const res = await client.collection("investors").verifyToken("tok_abc", "invite");
    expect(res.valid).toBe(true);
    expect(res.email).toBe("valid@example.com");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://api.test/api/collections/investors/tokens/verify?token=tok_abc&purpose=invite");
  });
});
