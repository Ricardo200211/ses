"use server"; 

import { NextResponse } from 'next/server'; 
import prisma from "@/lib/prisma"; 
import { comparePassword, generateAuthToken } from "@/lib/auth"; 
import { serialize } from "cookie"; 

interface UserLogin {
  id: string;
  username: string;
  email: string;
  passwordHash: string; 
  roles: string[]; 
}

function validateInput(username: string, password: string): { valid: boolean; error?: string } {
  if (!username || username.trim() === "") { 
    return { valid: false, error: "Username is required." };
  }
  if (!password || password.length < 8 || password.length > 64) {
    return { valid: false, error: "Password must be between 8 and 64 characters." };
  }
  return { valid: true };
}

async function findUserByUsername(username: string): Promise<UserLogin | null> {
  const user = await prisma.user.findUnique({
    where: { username: username }, 
  });
  return user as UserLogin | null; 
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { username, password } = (await req.json()) as {
      username: string; 
      password: string;
    };

    const { valid, error } = validateInput(username, password);
    if (!valid) {
      return new NextResponse(JSON.stringify({ error }), { status: 422, headers: { "Content-Type": "application/json" } });
    }

    const user = await findUserByUsername(username); 
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "No user found with the provided username." }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    const isValid = await comparePassword(password, user.passwordHash); 
    if (!isValid) {
      return new NextResponse(JSON.stringify({ error: "Password is incorrect" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    const token = generateAuthToken(user.id, user.roles);

    const cookie = serialize("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", 
      path: "/",
      maxAge: 60 * 60, 
    });

    return new NextResponse(JSON.stringify({ message: "Login Successful", userId: user.id }), { 
      status: 200,
      headers: { "Set-Cookie": cookie, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in login route:", error);
    return new NextResponse(JSON.stringify({ error: "Internal Server Error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}