"use server"; 

import { NextResponse } from "next/server"; 
import { serialize } from "cookie";

function createResponse(
    body: Record<string, unknown>,
    status: number,
    headers: Record<string, string> = { "Content-Type": "application/json" }
  ): NextResponse { 
    return new NextResponse(JSON.stringify(body), { status, headers });
  }
  
  function clearAuthToken(): string {
    const isSecure = process.env.NODE_ENV === "production";
    return serialize("token", "", { 
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
  }
  
  export async function GET(): Promise<Response> { 
    return createResponse({ message: "Logout successful" }, 200, {
      "Set-Cookie": clearAuthToken(),
    });
  }