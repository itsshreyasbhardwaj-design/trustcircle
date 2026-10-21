// Integration tests run against a real SQLite database with the real schema.
//
// Two values are set for the suite only, and nothing in the application reads either:
//  - a fixed secret, so at-rest encryption is deterministic across runs;
//  - a much lower scrypt cost, because the production profile is ~1.5s per hash and
//    this suite registers hundreds of accounts. The stored hash records the cost it
//    was created with, so this changes speed, not the code path under test.
process.env.TRUSTCIRCLE_SECRET ||= 'test-secret-value-for-vitest-only-0123456789abcdef';
process.env.TRUSTCIRCLE_SCRYPT_N ||= '4096';
