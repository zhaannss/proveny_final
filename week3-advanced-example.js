/**
 * Week 3 Advanced Submission Example
 * 
 * Demonstrates advanced techniques:
 * - Error handling with try/catch
 * - Class-based architecture
 * - Custom error types
 * - Complex data transformations
 * 
 * Expected Sophistication Score: 40-55 points
 */

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
}

class StudentAnalyzer {
  constructor(students) {
    if (!Array.isArray(students) || students.length === 0) {
      throw new ValidationError("Students array cannot be empty");
    }
    this.students = students;
  }
  
  validateStudentData() {
    try {
      this.students.forEach(function(student) {
        if (!student.name || typeof student.name !== "string") {
          throw new ValidationError("Invalid student name");
        }
        if (!Array.isArray(student.scores) || student.scores.length === 0) {
          throw new ValidationError("Student must have scores");
        }
      });
      return true;
    } catch (error) {
      console.error("Validation failed:", error.message);
      return false;
    }
  }
  
  calculateClassStatistics() {
    try {
      if (!this.validateStudentData()) {
        throw new ValidationError("Data validation failed");
      }
      
      var allScores = this.students.reduce(function(accumulator, student) {
        return accumulator.concat(student.scores);
      }, []);
      
      var average = allScores.reduce(function(a, b) { return a + b; }, 0) / allScores.length;
      var sorted = allScores.sort(function(a, b) { return a - b; });
      var median = sorted[Math.floor(sorted.length / 2)];
      
      return {
        classAverage: average.toFixed(2),
        classMedian: median,
        totalStudents: this.students.length,
        totalScores: allScores.length
      };
    } catch (error) {
      console.error("Statistics calculation failed:", error.message);
      return null;
    }
  }
  
  identifyOutliers(threshold) {
    try {
      var stats = this.calculateClassStatistics();
      if (!stats) throw new ValidationError("Cannot calculate statistics");
      
      var classAverage = parseFloat(stats.classAverage);
      
      return this.students.map(function(student) {
        var studentAverage = student.scores.reduce(function(a, b) { return a + b; }, 0) / student.scores.length;
        var deviation = Math.abs(studentAverage - classAverage);
        
        return {
          name: student.name,
          average: studentAverage.toFixed(2),
          isOutlier: deviation > threshold
        };
      });
    } catch (error) {
      console.error("Outlier detection failed:", error.message);
      return [];
    }
  }
}

var students = [
  { name: "Alice Johnson", scores: [95, 92, 98, 94] },
  { name: "Bob Smith", scores: [45, 50, 48, 52] },
  { name: "Charlie Brown", scores: [85, 88, 82, 90] }
];

try {
  var analyzer = new StudentAnalyzer(students);
  var statistics = analyzer.calculateClassStatistics();
  console.log("Class Statistics:", statistics);
  
  var outliers = analyzer.identifyOutliers(15);
  console.log("Outlier Analysis:", outliers);
} catch (error) {
  console.error("Fatal error:", error.message);
}
