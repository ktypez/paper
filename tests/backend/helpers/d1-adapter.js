import { DatabaseSync } from "node:sqlite";

class D1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  first() {
    return this.database.prepare(this.sql).get(...this.values) ?? null;
  }

  all() {
    return { success: true, results: this.database.prepare(this.sql).all(...this.values) };
  }

  run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return {
      success: true,
      meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
    };
  }
}

export function createTestD1(path = ":memory:") {
  const database = new DatabaseSync(path);
  return {
    database,
    d1: {
      prepare(sql) {
        return new D1Statement(database, sql);
      },
      async batch(statements) {
        database.exec("BEGIN");
        try {
          const results = statements.map((statement) => statement.run());
          database.exec("COMMIT");
          return results;
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
}
