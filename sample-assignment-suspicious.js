/**
 * Proveny — пример «подозрительной» сдачи (для теста action queue)
 *
 * Используйте ПОСЛЕ sample-week1-baseline.js на том же курсе.
 * В коде появляются CircuitBreaker, async/await, классы — которых не было в Week 1.
 * Система сравнивает metrics submission с baseline → genealogy penalty → FLAGGED/CRITICAL.
 */

class CircuitBreaker {
  constructor(threshold) {
    this.threshold = threshold;
    this.failures = 0;
  }

  async execute(fn) {
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (err) {
      this.failures += 1;
      if (this.failures >= this.threshold) {
        throw new Error("Circuit open");
      }
      throw err;
    }
  }
}

class ApiClient {
  get(path) {
    return Promise.resolve({ path: path, ok: true });
  }
}

class UserService {
  constructor(api) {
    this.api = api;
    this.breaker = new CircuitBreaker(3);
  }

  async fetchUser(id) {
    return this.breaker.execute(() => this.api.get("/users/" + id));
  }
}

const service = new UserService(new ApiClient());
service.fetchUser("42").then(console.log);
