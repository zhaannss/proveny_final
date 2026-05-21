/**
 * Week 1 Baseline Example - Proctored Session
 * 
 * Simple foundational code demonstrating basic programming concepts.
 * Upload this during Week 1 baseline capture in proctored session.
 * 
 * Expected Sophistication Score: 10-15 points
 */

function calculateFactorial(n) {
  if (n < 0) {
    return null;
  }
  if (n === 0 || n === 1) {
    return 1;
  }
  var result = 1;
  for (var i = 2; i <= n; i++) {
    result = result * i;
  }
  return result;
}

function reverseString(str) {
  var reversed = "";
  for (var i = str.length - 1; i >= 0; i--) {
    reversed = reversed + str[i];
  }
  return reversed;
}

function findMaxInArray(arr) {
  var max = arr[0];
  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }
  return max;
}

console.log("Factorial of 5:", calculateFactorial(5));
console.log("Reversed 'hello':", reverseString("hello"));
console.log("Max in [3, 7, 2, 9, 1]:", findMaxInArray([3, 7, 2, 9, 1]));
