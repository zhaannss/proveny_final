const { getPrisma } = require("../../config/prisma");

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values) {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function buildDistribution(scores) {
  const buckets = [
    { bucket: "0-20", min: 0, max: 20 },
    { bucket: "21-40", min: 21, max: 40 },
    { bucket: "41-60", min: 41, max: 60 },
    { bucket: "61-80", min: 61, max: 80 },
    { bucket: "81-100", min: 81, max: 100 },
  ];
  return buckets.map(({ bucket, min, max }) => ({
    bucket,
    count: scores.filter((s) => s >= min && s <= max).length,
  }));
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

async function computeCohortOutlierScore({ courseId, weekNumber, submissionScore }) {
  const prisma = getPrisma();
  const rows = await prisma.submission.findMany({
    where: { assignment: { courseId, weekNumber } },
    select: { sophisticationScore: true },
  });
  const scores = rows.map((row) => row.sophisticationScore);
  if (scores.length < 3) return 0;
  const avg = mean(scores);
  const sd = stddev(scores);
  if (sd === 0) return 0;
  return Number(Math.max(0, (submissionScore - avg) / sd).toFixed(4));
}

async function getCohortStats({ courseId, weekNumber }) {
  const prisma = getPrisma();
  const rows = await prisma.$queryRaw`
    SELECT
      s."sophisticationScore" AS "score",
      STDDEV(s."sophisticationScore") OVER () AS "stddev",
      AVG(s."sophisticationScore") OVER () AS "avg",
      COUNT(*) OVER () AS "count",
      PERCENT_RANK() OVER (ORDER BY s."sophisticationScore") AS "percent_rank"
    FROM "Submission" s
    JOIN "Assignment" a ON s."assignmentId" = a.id
    WHERE a."courseId" = ${courseId} AND a."weekNumber" = ${weekNumber}
  `;

  if (!rows || rows.length === 0) {
    return {
      cohortSize: 0,
      avg: 0,
      stddev: 0,
      p10: 0,
      p50: 0,
      p90: 0,
      outlierThreshold: 0,
      distribution: buildDistribution([]),
    };
  }

  const scores = rows.map((row) => Number(row.score));
  const avg = Number(rows[0].avg || 0);
  const sd = Number(rows[0].stddev || 0);
  const cohortSize = Number(rows[0].count || 0);

  return {
    cohortSize,
    avg: Number(avg.toFixed(4)),
    stddev: Number(sd.toFixed(4)),
    p10: Number(percentile(scores, 0.1).toFixed(4)),
    p50: Number(percentile(scores, 0.5).toFixed(4)),
    p90: Number(percentile(scores, 0.9).toFixed(4)),
    outlierThreshold: Number((avg + 2 * sd).toFixed(4)),
    distribution: buildDistribution(scores),
  };
}

module.exports = { mean, stddev, percentile, buildDistribution, computeCohortOutlierScore, getCohortStats };
