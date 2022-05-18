import { Context } from "./types";

export const notFoundHandler = async (req: Request, ctx: Context) => {
  ctx.isNotFound = true;
  return new Response("Not Found", { status: 404 });
};
