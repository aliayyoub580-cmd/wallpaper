export function makeUserFactory(overrides = {}) {
  return {
    name: "Demo User",
    email: "demo@example.com",
    ...overrides,
  };
}
