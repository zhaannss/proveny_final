/* global jest */

jest.mock("bullmq", () => {
  const add = jest.fn().mockResolvedValue({ id: "job-1" });
  return {
    Queue: jest.fn().mockImplementation(() => ({ add, close: jest.fn() })),
    __mockAdd: add,
  };
});

const { Queue, __mockAdd } = require("bullmq");
const { enqueueEmail } = require("../../../src/config/queue");

describe("email queue", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("enqueueEmail adds a send job with retry policy", async () => {
    await enqueueEmail({
      to: "student@example.edu",
      subject: "Verify your Proveny account",
      html: "<p>verify</p>",
    });

    expect(Queue).toHaveBeenCalledWith("email", expect.any(Object));
    expect(__mockAdd).toHaveBeenCalledWith(
      "send",
      expect.objectContaining({ to: "student@example.edu" }),
      expect.objectContaining({
        attempts: 5,
        backoff: expect.objectContaining({ type: "exponential" }),
      }),
    );
  });
});
