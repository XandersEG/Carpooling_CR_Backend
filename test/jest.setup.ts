// Runs before every test file.
// queries.ts creates the database client on import and needs DATABASE_URL.
// Unit tests mock the repos, so this placeholder is never actually connected to.
process.env.DATABASE_URL ??= 'postgres://test:test@127.0.0.1:5432/test';
