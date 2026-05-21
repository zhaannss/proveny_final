/**
 * Week 2 Submission Example
 * 
 * Shows progress from Week 1 baseline with:
 * - Functional programming techniques (map, filter, reduce)
 * - Input validation
 * - Better naming conventions
 * 
 * Expected Sophistication Score: 25-35 points
 */

function calculateAverageScore(scores) {
  if (!scores || scores.length === 0) {
    return 0;
  }
  
  var sum = scores.reduce(function(accumulator, currentScore) {
    return accumulator + currentScore;
  }, 0);
  
  return sum / scores.length;
}

function filterPassingStudents(studentScores) {
  var passingThreshold = 60;
  return studentScores.filter(function(student) {
    return student.score >= passingThreshold;
  });
}

function generateStudentReport(students) {
  return students.map(function(student) {
    return {
      name: student.name,
      average: calculateAverageScore(student.scores),
      status: calculateAverageScore(student.scores) >= 60 ? "PASS" : "FAIL"
    };
  });
}

var studentData = [
  { name: "Alice", scores: [75, 82, 78] },
  { name: "Bob", scores: [55, 60, 50] },
  { name: "Charlie", scores: [90, 88, 92] }
];

var report = generateStudentReport(studentData);
console.log("Student Report:", report);

var passingStudents = filterPassingStudents(studentData.map(function(s) {
  return { name: s.name, score: calculateAverageScore(s.scores) };
}));
console.log("Passing Students:", passingStudents);
