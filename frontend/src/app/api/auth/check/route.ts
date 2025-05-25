"use server";

import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth"; 
import { serialize } from "cookie"; 

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.cookies.get('token')?.value; 

    if (!token) {
      return NextResponse.json({ isAuthenticated: false, userId: null }, { status: 401 });
    }

    try {
      const decodedToken = verifyAuthToken(token);

      return NextResponse.json({ isAuthenticated: true, userId: decodedToken.userId }, { status: 200 });

    } catch (tokenError: unknown) { 
      console.error("Failed to verify token:", tokenError instanceof Error ? tokenError.message : tokenError);

      const clearedCookie = serialize("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });

      return NextResponse.json(
        { isAuthenticated: false, userId: null, error: "Token invalid or expired" },
        { status: 401, headers: { "Set-Cookie": clearedCookie } }
      );
    }

  } catch (error: unknown) { 
    console.error("Error in auth check route:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}