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

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const resolvedParams = await params; 
  const { id } = resolvedParams; 
  const authenticatedUserId = await getAuthenticatedUserId(req);

  try {
    const document = await prisma.document.findUnique({
      where: {
        id: id,
      },
      include: {
        permissions: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let userRole: 'OWNER' | 'EDITOR' | 'VIEWER' | 'PUBLIC_VIEWER' | 'PUBLIC_EDITOR' | 'NONE' = 'NONE';

    if (authenticatedUserId === document.userId) {
      userRole = 'OWNER';
    } else {
      const userPermission = document.permissions.find(p => p.userId === authenticatedUserId);
      if (userPermission) {
        userRole = userPermission.role;
      } else if (document.isPublic) {
        userRole = document.publicEdit ? 'PUBLIC_EDITOR' : 'PUBLIC_VIEWER';
      }
    }

    if (userRole === 'NONE') {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    return NextResponse.json({ document, userRole }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error fetching document:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const resolvedParams = await params; 
  const { id } = resolvedParams; 
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content } = await req.json();

    const existingDocument = await prisma.document.findUnique({
      where: { id: id },
      include: { permissions: true },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = existingDocument.userId === authenticatedUserId;
    const hasEditPermission = existingDocument.permissions.some(
      p => p.userId === authenticatedUserId && p.role === 'EDITOR'
    );
    const hasPublicEditPermission = existingDocument.isPublic && existingDocument.publicEdit;

    if (!isOwner && !hasEditPermission && !hasPublicEditPermission) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit this document." }, { status: 403 });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: id },
      data: {
        title: title ?? existingDocument.title,
        content: content ?? existingDocument.content,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedDocument, { status: 200 });
  } catch (error: unknown) {
    console.error("Error updating document:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const resolvedParams = await params; 
  const { id } = resolvedParams; 
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingDocument = await prisma.document.findUnique({
      where: { id: id },
    });

    if (!existingDocument) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (existingDocument.userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden: You are not the owner of this document." }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id: id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("Error deleting document:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}