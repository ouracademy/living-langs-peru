import type { SupabaseClient } from "@supabase/supabase-js";

export type Answer = { data: unknown; error: unknown };

/** What a query asked for: its table, columns, filters and order. */
export type Asked = {
  table: string;
  columns?: string;
  filters: [string, unknown][];
  order?: [string, unknown];
  single?: boolean;
};

type Handlers = {
  from?: (asked: Asked) => Answer;
  rpc?: (name: string, args: Record<string, unknown>) => Answer;
};

/**
 * A stand-in for the parts of supabase-js the pack library uses: `from(…)`
 * with `select`, `eq`, `order`, then `maybeSingle()` or a plain `await`; and
 * `rpc(…)`. Records every query in `queries` and every call in `calls`.
 */
export function fakePackClient(handlers: Handlers) {
  const queries: Asked[] = [];
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const empty: Answer = { data: null, error: null };

  const client = {
    from(table: string) {
      const asked: Asked = { table, filters: [] };
      queries.push(asked);
      const answer = () => (handlers.from ? handlers.from(asked) : empty);
      const query = {
        select(columns: string) {
          asked.columns = columns;
          return query;
        },
        eq(column: string, value: unknown) {
          asked.filters.push([column, value]);
          return query;
        },
        order(column: string, options: unknown) {
          asked.order = [column, options];
          return query;
        },
        maybeSingle: async () => {
          asked.single = true;
          return answer();
        },
        // `await query` without maybeSingle(), as listVersions does.
        then(resolve: (value: Answer) => unknown) {
          return Promise.resolve(answer()).then(resolve);
        },
      };
      return query;
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return handlers.rpc ? handlers.rpc(name, args) : empty;
    },
  } as unknown as SupabaseClient;

  return { client, queries, calls };
}
