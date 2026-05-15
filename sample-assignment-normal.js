/**
 * Proveny — пример обычной сдачи assignment (ожидаемый рост навыков)
 *
 * Загрузка: Student → Assignment Submit → после lock baseline proctor'ом
 * Сравнивается с Week 1 baseline того же курса — умеренный прирост score
 */

function greet(name) {
  if (!name) {
    return "Hello";
  }
  return "Hello, " + name;
}

function sum(numbers) {
  return numbers.reduce(function (acc, n) {
    return acc + n;
  }, 0);
}

function average(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  return sum(numbers) / numbers.length;
}

function main() {
  console.log(greet("Student"));
  console.log("Average:", average([10, 20, 30]));
}

main();
