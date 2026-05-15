const request = require("supertest");
const { createApp } = require("../../../src/app");

/* global jest */

jest.mock("../../../src/config/prisma", () => ({
  getPrisma: jest.fn(),
}));

jest.mock("../../../src/config/queue", () => ({
  enqueueEmail: jest.fn().mockResolvedValue(undefined),
  enqueueAnalysis: jest.fn().mockResolvedValue(undefined),
}));

const { getPrisma } = require("../../../src/config/prisma");

describe("POST /auth/verify-email", () => {
  test("returns 422 when token is missing", async () => {
    const app = createApp();
    const res = await request(app).post("/api/v1/auth/verify-email").send({});
    expect(res.status).toBe(422);
  });

  test("verifies a valid token", async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: "user-1",
          email: "student@example.edu",
          isEmailVerified: false,
          emailVerificationExpires: new Date(Date.now() + 3600_000),
        }),
        update: jest.fn().mockResolvedValue({ id: "user-1", isEmailVerified: true }),
      },
    };
    getPrisma.mockReturnValue(prisma);

    const app = createApp();
    const res = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: "abc123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified/i);
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
