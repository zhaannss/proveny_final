/**
 * Proveny — пример Week 1 baseline (прокторская сессия)
 *
 * Загрузка: Student → Week 1 Baseline → выбрать курс + код сессии → этот файл
 * Уровень: начальный (простые функции, без классов/async/decorators)
 */

function greet(name) {
  return "Hello, " + name;
}

function sum(numbers) {
  var total = 0;
  for (var i = 0; i < numbers.length; i++) {
    total = total + numbers[i];
  }
  return total;
}

function main() {
  console.log(greet("Student"));
  console.log("Sum:", sum([1, 2, 3, 4, 5]));
}

main();
