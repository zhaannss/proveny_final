const express = require("express");
const { authRequired } = require("../../middleware/auth");
const { requireRole } = require("../../middleware/rbac");
const { createCourseSchema, updateCourseSchema } = require("./courses.schema");
const coursesService = require("./courses.service");

function parseIntParam(v, def) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function makeCoursesRouter() {
  const router = express.Router();
  router.use(authRequired);

  router.get("/", async (req, res, next) => {
    try {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(100, parseIntParam(req.query.limit, 20));
      const result = await coursesService.listCourses({ user: req.user, page, limit });
      return res.status(200).json(result);
    } catch (e) {
      return next(e);
    }
  });

  router.post("/", requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
    try {
      const data = createCourseSchema.parse(req.body);
      const course = await coursesService.createCourse({ actor: req.user, ...data });
      return res.status(201).json(course);
    } catch (e) {
      return next(e);
    }
  });

  router.get("/students", requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
    try {
      const page = parseIntParam(req.query.page, 1);
      const limit = Math.min(100, parseIntParam(req.query.limit, 100));
      const email = typeof req.query.email === "string" ? req.query.email : undefined;
      const result = await coursesService.listStudents({ email, page, limit });
      return res.status(200).json(result);
    } catch (e) {
      return next(e);
    }
  });

  router.get("/:courseId", requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
    try {
      const course = await coursesService.getCourseById({
        actor: req.user,
        courseId: req.params.courseId,
      });
      return res.status(200).json(course);
    } catch (e) {
      return next(e);
    }
  });

  router.patch("/:courseId", requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
    try {
      const patch = updateCourseSchema.parse(req.body);
      const course = await coursesService.updateCourse({
        actor: req.user,
        courseId: req.params.courseId,
        patch,
      });
      return res.status(200).json(course);
    } catch (e) {
      return next(e);
    }
  });

  router.delete("/:courseId", requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
    try {
      const result = await coursesService.deleteCourse({
        actor: req.user,
        courseId: req.params.courseId,
      });
      return res.status(200).json(result);
    } catch (e) {
      return next(e);
    }
  });

  router.post("/:courseId/enroll", requireRole("INSTRUCTOR", "ADMIN"), async (req, res, next) => {
    try {
      const { courseId } = req.params;
      const studentId = req.body?.studentId;
      const email = req.body?.email;
      const enrollment = await coursesService.enrollStudent({
        actor: req.user,
        courseId,
        studentId,
        email,
      });
      return res.status(201).json(enrollment);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { makeCoursesRouter };

