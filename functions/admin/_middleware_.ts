import { cfTeamsAccessAuthMiddleware } from "../../src/cfAccess";

export const onRequest = [
    cfTeamsAccessAuthMiddleware
]