import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { AccessRole } from "@prisma/client";

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decodedToken = verifyAuthToken(token);
    if (typeof decodedToken === 'object' && decodedToken !== null && 'userId' in decodedToken) {
        return decodedToken.userId as string;
    }
    return null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          {
            userId: authenticatedUserId,
          },
          {
            permissions: {
              some: {
                userId: authenticatedUserId,
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(documents, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching documents:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const newDocument = await prisma.document.create({
      data: {
        title,
        content: content || '',
        userId: authenticatedUserId,
        isPublic: false,
        publicAccessRole: null,
        permissions: {
          create: {
            userId: authenticatedUserId,
            role: AccessRole.OWNER,
          },
        },
      },
    });

    return NextResponse.json(newDocument, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating document:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}