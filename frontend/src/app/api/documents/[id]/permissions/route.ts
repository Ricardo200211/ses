import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decodedToken = verifyAuthToken(token);
    return decodedToken.userId;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const resolvedParams = await params; 
  const { id: documentId } = resolvedParams;
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!documentId) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Access Denied: Not the document owner" }, { status: 403 });
    }

    const permissions = await prisma.documentPermission.findMany({
      where: {
        documentId: documentId,
        userId: { not: authenticatedUserId },
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
    });

    return NextResponse.json(permissions, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching permissions:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const resolvedParams = await params; 
  const { id: documentId } = resolvedParams;
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!documentId) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  try {
    const { targetUserIdentifier, role } = await req.json();

    if (!targetUserIdentifier || !['EDITOR', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: "Invalid user identifier or role" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Access Denied: Not the document owner" }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetUserIdentifier },
          { username: targetUserIdentifier },
        ],
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    if (targetUser.id === authenticatedUserId) {
      return NextResponse.json({ error: "Cannot add/change permission for yourself (the owner)." }, { status: 400 });
    }

    const permission = await prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId: documentId,
          userId: targetUser.id,
        },
      },
      update: {
        role,
      },
      create: {
        documentId: documentId,
        userId: targetUser.id,
        role,
      },
      include: {
        user: {
          select: { username: true, email: true },
        },
      },
    });

    return NextResponse.json(permission, { status: 200 });
  } catch (error: unknown) {
    console.error("Error adding/updating permission:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}