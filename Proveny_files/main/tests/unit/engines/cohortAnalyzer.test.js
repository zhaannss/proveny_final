const { mean, stddev, percentile, buildDistribution } = require("../../../src/engines/cohort/cohortAnalyzer");

describe("cohortAnalyzer pure functions", () => {
  test("mean and stddev", () => {
    expect(mean([10, 20, 30])).toBeCloseTo(20);
    expect(stddev([10, 20, 30])).toBeCloseTo(8.1649, 3);
  });

  test("percentile interpolation", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 0.5)).toBeCloseTo(5.5);
  });

  test("buildDistribution buckets scores", () => {
    const dist = buildDistribution([5, 25, 45, 65, 85]);
    expect(dist.find((b) => b.bucket === "0-20").count).toBe(1);
    expect(dist.find((b) => b.bucket === "21-40").count).toBe(1);
    expect(dist.find((b) => b.bucket === "81-100").count).toBe(1);
  });
});
