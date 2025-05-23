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
  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long.",
    };
  }
  return { valid: true };
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const { username, email, password } = (await req.json()) as RegisterInput;

    const { valid, error } = validateInput(username, email, password);
    if (!valid) {
      return NextResponse.json({ error }, { status: 422 });
    }

    const hashedPassword = await hashPassword(password);

    await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        roles: ["public_user"],
      },
    });

    return NextResponse.json({ message: "User created successfully" }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prismaError = error as any;
        if (prismaError.code === 'P2002') {
            if (prismaError.meta && prismaError.meta.target && typeof prismaError.meta.target === 'object') {
                const target = prismaError.meta.target as string[];
                if (target.includes('username')) {
                    return NextResponse.json({ error: "Username already exists." }, { status: 409 });
                }
                if (target.includes('email')) {
                    return NextResponse.json({ error: "Email already exists." }, { status: 409 });
                }
            }
            return NextResponse.json({ error: "User already exists (username/email conflict)." }, { status: 409 });
        }
    }
    console.error("Error in register route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}