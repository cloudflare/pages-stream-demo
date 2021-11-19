import jwt_decode, { JwtPayload } from "jwt-decode";
import { base64url } from "rfc4648";
import { parse } from "worktop/cookie";

// Verify Cloudflare Access JWT
export const verifyCloudflareAccessJwt = async (request, env) => {
  type JwtPayloadExtended = JwtPayload & { kid: string; name: string, email: string };

  try {
    const cookie = parse(request.headers.get("Cookie") || "");
    const jwtToken = request.headers.get("Cf-Access-Jwt-Assertion") || cookie["CF_Authorization"]

    // Make sure JWT or client id/secret was passed
    if (!jwtToken) {
        throw new Error("Missing Cf-Access-Jwt-Assertion header, make sure this endpoint is behind Cloudflare Access")
    }

    const header = jwt_decode(jwtToken, { header: true }) as JwtPayloadExtended;
    const payload = jwt_decode(jwtToken) as JwtPayloadExtended;
    const jwk = await getCloudflareAccessJwk(header.kid, env);

    const verified = await verifyJwtSignature(jwtToken, jwk);
    if (!verified) throw 'JWT token could not be verified'

    if (!payload.aud.includes(env.CF_ACCESS_APP_AUD))
      throw "JWT token 'aud' is not valid";
    if (
      payload.iss !== `https://${env.CF_ACCESS_TEAM_NAME}.cloudflareaccess.com`
    )
      throw "JWT token issuer is not valid";

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTime) throw "JWT token is expired";
    if (payload.iat > currentTime) throw "JWT token issued in the future";
    if (payload.nbf > currentTime) throw "JWT token is not valid yet";

    return {
      success: true,
      header,
      payload,
    };
  } catch (e) {
    return {
      success: false,
      error: e.toString(),
    }
  }
};

// Get Cloudflare Access jwk for key id
const getCloudflareAccessJwk = async (kid, env) => {
  type JwkKeys = {
    keys: Record<string, string>[];
  };

  // TODO implement caching
  const apiRes = await fetch(
    `https://${env.CF_ACCESS_TEAM_NAME}.cloudflareaccess.com/cdn-cgi/access/certs`
  );
  return ((await apiRes.json()) as JwkKeys).keys.find((x) => x.kid === kid);
};

export const verifyJwtSignature = (jwsObject, jwk) => {
  const jwsSigningInput = jwsObject.split(".").slice(0, 2).join(".");
  const jwsSignature = jwsObject.split(".")[2];
  return crypto.subtle
    .importKey(
      "jwk",
      jwk,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: { name: "SHA-256" },
      },
      false,
      ["verify"]
    )
    .then((key) =>
      crypto.subtle.verify(
        { name: "RSASSA-PKCS1-v1_5" },
        key,
        base64url.parse(jwsSignature, { loose: true }),
        new TextEncoder().encode(jwsSigningInput)
      )
    );
};

// Validate JWT and pass user info to next middlewares/onRequest handler
export const cfTeamsAccessAuthMiddleware = async ({request, data, env, next}) => {
  try {
      // Validate Cloudflare Access JWT token and return decoded data
      const decodedJwt = await verifyCloudflareAccessJwt(request, env);
      if (!decodedJwt.success) {
           throw new Error(decodedJwt.error)
      }

      // Pass user info to next handlers
      data.user = {
          name: decodedJwt.payload.name,
          email: decodedJwt.payload.email,
      }

      return next()
  } catch (e) {
      return new Response(e.toString(), {status: 401})
  }
}