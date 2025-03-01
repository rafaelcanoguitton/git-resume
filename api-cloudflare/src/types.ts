// import { InferModel } from 'drizzle-orm'
// import { InferSelectModel } from 'drizzle-orm'
// import { users } from './db/schema'
// import { initDbConnect } from './db'
//
// export type User = InferSelectModel<typeof users>
//
// declare module 'hono' {
//   interface ContextVariableMap {
//     user: User
//     jwtPayload: {
//       userId: typeof users.id;
//     },
//     db: ReturnType<typeof initDbConnect>
//   }
// }

