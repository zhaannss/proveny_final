const { getPrisma } = require("../../config/prisma");
const { badRequest, conflict, forbidden, notFound } = require("../../utils/httpErrors");

function toCourseResponse(c) {
  return {
    id: c.id,
    name: c.name,
    code: c.code,
    instructorId: c.instructorId,
    weeklyTargets: c.weeklyTargets,
    isActive: c.isActive,
    createdAt: c.createdAt,
  };
}

async function createCourse({ actor, instructorId, name, code, weeklyTargets }) {
  const prisma = getPrisma();
  const ownerId = actor.role === "ADMIN" ? instructorId || actor.id : actor.id;
  const existing = await prisma.course.findUnique({ where: { code } });
  if (existing) throw conflict("Course code already exists");

  if (actor.role !== "ADMIN" && instructorId && instructorId !== actor.id) {
    throw forbidden("Instructors can only create courses for themselves");
  }

  const instructor = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!instructor || !["INSTRUCTOR", "ADMIN"].includes(instructor.role)) {
    throw notFound("Instructor not found");
  }

  const course = await prisma.course.create({
    data: { instructorId: ownerId, name, code, weeklyTargets },
  });
  return toCourseResponse(course);
}

async function listCourses({ user, page, limit }) {
  const prisma = getPrisma();
  const skip = (page - 1) * limit;

  if (user.role === "ADMIN") {
    const [total, courses] = await Promise.all([
      prisma.course.count(),
      prisma.course.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          instructor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);
    return {
      data: courses.map((c) => ({
        ...toCourseResponse(c),
        instructor: c.instructor
          ? {
              id: c.instructor.id,
              firstName: c.instructor.firstName,
              lastName: c.instructor.lastName,
              email: c.instructor.email,
            }
          : null,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  if (user.role === "INSTRUCTOR") {
    const where = { instructorId: user.id };
    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    ]);
    return { data: courses.map(toCourseResponse), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  if (user.role === "PROCTOR") {
    const where = { isActive: true };
    const [total, courses] = await Promise.all([
      prisma.course.count({ where }),
      prisma.course.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    ]);
    return { data: courses.map(toCourseResponse), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  const where = { studentId: user.id };
  const [total, enrollments] = await Promise.all([
    prisma.courseEnrollment.count({ where }),
    prisma.courseEnrollment.findMany({ where, skip, take: limit, include: { course: true }, orderBy: { enrolledAt: "desc" } }),
  ]);
  return { data: enrollments.map((e) => toCourseResponse(e.course)), meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

async function listStudents({ email, page = 1, limit = 100 }) {
  const prisma = getPrisma();
  const skip = (page - 1) * limit;
  const where = { role: "STUDENT", isActive: true };
  if (email) where.email = email.trim();

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { lastName: "asc" },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    }),
  ]);

  return {
    data: users,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

async function enrollStudent({ actor, courseId, studentId, email }) {
  const prisma = getPrisma();
  if (!["INSTRUCTOR", "ADMIN"].includes(actor.role)) throw forbidden("Only INSTRUCTOR/ADMIN can enroll");

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound("Course not found");
  if (actor.role === "INSTRUCTOR" && course.instructorId !== actor.id) {
    throw forbidden("Cannot enroll students into another instructor's course");
  }

  let resolvedStudentId = studentId;
  if (!resolvedStudentId && email) {
    const byEmail = await prisma.user.findUnique({ where: { email: email.trim() } });
    if (!byEmail) throw notFound("Student not found");
    resolvedStudentId = byEmail.id;
  }
  if (!resolvedStudentId) throw badRequest("studentId or email is required");

  const student = await prisma.user.findUnique({ where: { id: resolvedStudentId } });
  if (!student) throw notFound("Student not found");
  if (student.role !== "STUDENT") throw conflict("Only STUDENT users can be enrolled in courses");

  const existing = await prisma.courseEnrollment.findUnique({
    where: { courseId_studentId: { courseId, studentId: resolvedStudentId } },
  });
  if (existing) throw conflict("Student already enrolled in this course");

  return prisma.courseEnrollment.create({ data: { courseId, studentId: resolvedStudentId } });
}

async function getCourseById({ actor, courseId }) {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound("Course not found");
  if (actor.role === "INSTRUCTOR" && course.instructorId !== actor.id) {
    throw forbidden("Forbidden");
  }
  return toCourseResponse(course);
}

async function updateCourse({ actor, courseId, patch }) {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound("Course not found");

  if (actor.role === "INSTRUCTOR" && course.instructorId !== actor.id) {
    throw forbidden("Cannot update another instructor's course");
  }

  if (patch.instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: patch.instructorId } });
    if (!instructor || !["INSTRUCTOR", "ADMIN"].includes(instructor.role)) {
      throw notFound("Instructor not found");
    }
  }

  const updated = await prisma.course.update({
    where: { id: courseId },
    data: patch,
  });
  return toCourseResponse(updated);
}

async function deleteCourse({ actor, courseId }) {
  const prisma = getPrisma();
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw notFound("Course not found");

  if (actor.role === "INSTRUCTOR" && course.instructorId !== actor.id) {
    throw forbidden("Cannot delete another instructor's course");
  }

  const [baselineCount, submissionCount] = await Promise.all([
    prisma.baseline.count({ where: { courseId } }),
    prisma.submission.count({
      where: { assignment: { courseId } },
    }),
  ]);

  if (baselineCount > 0 || submissionCount > 0) {
    throw conflict(
      "Course has baseline or submission data and cannot be deleted. Remove test data first or deactivate the course.",
    );
  }

  await prisma.$transaction(async (tx) => {
    const assignmentIds = (
      await tx.assignment.findMany({ where: { courseId }, select: { id: true } })
    ).map((a) => a.id);

    if (assignmentIds.length > 0) {
      await tx.submission.deleteMany({ where: { assignmentId: { in: assignmentIds } } });
      await tx.assignment.deleteMany({ where: { courseId } });
    }

    await tx.courseEnrollment.deleteMany({ where: { courseId } });
    await tx.proctoredSession.deleteMany({ where: { courseId } });
    await tx.course.delete({ where: { id: courseId } });
  });

  return { message: "Course deleted successfully" };
}

module.exports = {
  createCourse,
  listCourses,
  getCourseById,
  updateCourse,
  listStudents,
  enrollStudent,
  deleteCourse,
};
