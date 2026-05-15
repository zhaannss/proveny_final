const bcrypt = require("bcrypt");
const { getPrisma } = require("../../config/prisma");
const { getRedis } = require("../../config/redis");
const { env } = require("../../config/env");
const { conflict, forbidden, notFound } = require("../../utils/httpErrors");
const { revokeAllRefreshTokensForUser } = require("../auth/auth.service");

function toUserResponse(u) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}

async function createUser(data) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("Email already in use");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      isEmailVerified: true,
    },
  });
  return toUserResponse(user);
}

async function listUsers({ page, limit, role, isActive }) {
  const prisma = getPrisma();
  const skip = (page - 1) * limit;

  const where = {};
  if (role) where.role = role;
  if (typeof isActive === "boolean") where.isActive = isActive;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    data: users.map(toUserResponse),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getUserById(userId) {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound(`User with id '${userId}' not found`);
  return toUserResponse(user);
}

async function updateUser(userId, patch) {
  const prisma = getPrisma();
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) throw notFound(`User with id '${userId}' not found`);

  const user = await prisma.user.update({ where: { id: userId }, data: patch });
  return toUserResponse(user);
}

async function deleteUser({ actor, userId }) {
  const prisma = getPrisma();
  if (actor.id === userId) throw forbidden("Cannot delete your own account");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound(`User with id '${userId}' not found`);

  const [baselines, submissions, enrollments, sessions, courses] = await Promise.all([
    prisma.baseline.count({ where: { studentId: userId } }),
    prisma.submission.count({ where: { studentId: userId } }),
    prisma.courseEnrollment.count({ where: { studentId: userId } }),
    prisma.proctoredSession.count({ where: { proctorId: userId } }),
    prisma.course.count({ where: { instructorId: userId } }),
  ]);

  const hasRecords = baselines + submissions + enrollments + sessions + courses > 0;
  const redis = getRedis(env.REDIS_URL);
  await revokeAllRefreshTokensForUser({ redis, userId });

  if (hasRecords) {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    return { message: "User deactivated (related records preserved)", user: toUserResponse(updated) };
  }

  await prisma.user.delete({ where: { id: userId } });
  return { message: "User deleted successfully" };
}

module.exports = { createUser, listUsers, getUserById, updateUser, deleteUser };

