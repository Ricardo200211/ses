"use server"; 

import jwt, { JwtPayload } from "jsonwebtoken";
import { NextResponse } from "next/server"; 

function extractTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null; 
  }

  const tokenCookie = cookieHeader.split("; ").find((c) => c.startsWith("token="));

  if (tokenCookie) {
    const tokenValue = tokenCookie.split("=")[1];
    
    if (tokenValue === undefined || tokenValue.trim() === "") {
        return null;
    }
    return tokenValue;
  }

  return null;
}

function createResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = { "Content-Type": "application/json" }
): NextResponse { 
  return new NextResponse(JSON.stringify(body), { status, headers });
}

function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export async function GET(req: Request): Promise<Response> { 
  try {
    const cookieHeader = req.headers.get("cookie");
    const token = extractTokenFromCookie(cookieHeader);

    if (!token || typeof token !== "string" || token.trim() === "") {
      return createResponse(
        { error: "Unauthorized - Token not found or invalid" },
        401
      );
    }

    let decoded: JwtPayload;
    try {
      if (!process.env.JWT_SECRET) { 
        throw new Error("JWT_SECRET is not defined.");
      }
      decoded = verifyToken(token, process.env.JWT_SECRET);
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        return createResponse({ error: "Token Expired" }, 401);
      } else if (error.name === "JsonWebTokenError") {
        return createResponse({ error: "Invalid Token" }, 401);
      }
      console.log("Error during token verification:", error);
      return createResponse({ error: "Internal Server error" }, 500);
    }

    if (!decoded || !decoded.userId || typeof decoded.userId !== 'string') { 
      return createResponse({ error: "Invalid token structure or missing userId" }, 401);
    }

    return createResponse(
      { authenticated: true, userId: decoded.userId as string }, 
      200
    );
  } catch (error) {
    console.error("Error in /api/auth/check:", error);
    return createResponse({ error: "Internal Server Error" }, 500);
  }
}