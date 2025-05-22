"use server";

import { NextRequest, NextResponse } from "next/server"; 
import prisma from "@/lib/prisma"; 
import { hashPassword } from "@/lib/auth"; 

interface RegisterInput {
  username: string; 
  email: string;
  password: string;
}

function validateInput(username: string, email: string, password: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  if (username.length < 2 || username.length > 50) { 
    return { valid: false, error: "Username must be between 2 and 50 characters." };
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || password.length < 8) {
    return {
      valid: false,
      error: "Password must include uppercase, lowercase, number, and be at least 8 characters long.",
    };
  }
  return { valid: true };
}

function createResponse<T extends Record<string, unknown>>(
  body: T,
  status: number,
  headers: Record<string, string> = { "Content-Type": "application/json" }
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { username, email, password } = (await req.json()) as RegisterInput;

    const { valid, error } = validateInput(username, email, password); 
    if (!valid) {
      return createResponse({ error }, 422);
    }

    const hashedPassword = await hashPassword(password);
    
    await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: hashedPassword, 
        roles: ["public_user"], 
      },
    });

    return createResponse({ message: "User created" }, 201);
  } catch (error: any) {
    if (error.code === 'P2002') {
        if (error.meta && error.meta.target && typeof error.meta.target === 'object') {
          const target = error.meta.target as string[];
          if (target.includes('username')) {
            return createResponse({ error: "Username already exists." }, 409); 
          }
          if (target.includes('email')) {
            return createResponse({ error: "Email already exists." }, 409); 
          }
        }
        return createResponse({ error: "User already exists (username/email conflict)." }, 409);
    }
    console.error("Error in register route:", error);
    return createResponse({ error: "Internal Server Error" }, 500);
  }
}