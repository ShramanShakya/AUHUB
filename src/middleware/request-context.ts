import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export const requestContext: RequestHandler = (request, response, next) => {
  const supplied = request.header("x-request-id");
  request.requestId =
    supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
  response.setHeader("x-request-id", request.requestId);
  next();
};
