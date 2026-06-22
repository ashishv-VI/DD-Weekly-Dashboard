import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL environment variable is not set")
  return drizzle(neon(url), { schema })
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop: string) {
    return createDb()[prop as keyof ReturnType<typeof createDb>]
  },
})
