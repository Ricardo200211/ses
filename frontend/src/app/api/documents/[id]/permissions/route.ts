import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/auth";
import { AccessRole } from "@prisma/client";

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('token')?.value;
  if (!token) return null;
  try {
    const decodedToken = verifyAuthToken(token);
    if (typeof decodedToken === 'object' && decodedToken !== null && 'userId' in decodedToken && typeof decodedToken.userId === 'string') {
        return decodedToken.userId;
    }
    return null;
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

    const userPermissions = await prisma.documentPermission.findMany({
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

    return NextResponse.json({
        isPublic: document.isPublic,
        publicAccessRole: document.publicAccessRole,
        userPermissions: userPermissions,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error fetching permissions:", error instanceof Error ? error.message : String(error));
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
    console.error("Error adding/updating permission:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    const resolvedParams = await params;
    const { id: documentId } = resolvedParams;
    const authenticatedUserId = await getAuthenticatedUserId(req);

    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const { isPublic, publicAccessRole } = await req.json();

      if (typeof isPublic !== 'boolean') {
        return NextResponse.json({ error: "Invalid 'isPublic' value. Must be a boolean." }, { status: 400 });
      }
      
      if (isPublic && publicAccessRole && ![AccessRole.VIEWER, AccessRole.EDITOR].includes(publicAccessRole)) {
        return NextResponse.json({ error: `Invalid 'publicAccessRole' value. Must be 'VIEWER' or 'EDITOR' when isPublic is true. Received: ${publicAccessRole}` }, { status: 400 });
      }
      if (isPublic && publicAccessRole === null) {
        return NextResponse.json({ error: "Public access role cannot be null when document is public." }, { status: 400 });
      }
      
      if (!isPublic && publicAccessRole !== null) {
          return NextResponse.json({ error: "Public access role must be null when document is not public." }, { status: 400 });
      }
      

      const existingDocument = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!existingDocument) {
        return NextResponse.json({ error: "Document not found" }, { status: 404 });
      }

      if (existingDocument.userId !== authenticatedUserId) {
        return NextResponse.json({ error: "Forbidden: Only the document owner can manage public permissions." }, { status: 403 });
      }

      const updatedDocument = await prisma.document.update({
        where: { id: documentId },
        data: {
          isPublic: isPublic,
          publicAccessRole: isPublic ? publicAccessRole : null,
          updatedAt: new Date(),
        },
        include: {
          user: {
              select: { id: true, username: true, email: true }
          }
        }
      });

      return NextResponse.json(updatedDocument, { status: 200 });

    } catch (error: unknown) {
      console.error("Error updating document public permissions:", error instanceof Error ? error.message : String(error));
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }

export async function DELETE(
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
  
    const urlParts = req.nextUrl.pathname.split('/');
    const permissionId = urlParts[urlParts.length - 1];
  
    if (!permissionId || permissionId === documentId) {
        return NextResponse.json({ error: "Permission ID is required for deletion." }, { status: 400 });
    }

    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });
  
      if (!document || document.userId !== authenticatedUserId) {
        return NextResponse.json({ error: "Access Denied: Not the document owner" }, { status: 403 });
      }
  
      const permissionToDelete = await prisma.documentPermission.findUnique({
        where: { id: permissionId },
      });

      if (!permissionToDelete || permissionToDelete.documentId !== documentId || permissionToDelete.userId === authenticatedUserId) {
          return NextResponse.json({ error: "Permission not found or not authorized to delete." }, { status: 404 });
      }

      await prisma.documentPermission.delete({
        where: { id: permissionId },
      });
  
      return new NextResponse(null, { status: 204 });
    } catch (error: unknown) {
      console.error("Error deleting permission:", error instanceof Error ? error.message : String(error));
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }
  
export async function PUT(
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
  
    const urlParts = req.nextUrl.pathname.split('/');
    const permissionId = urlParts[urlParts.length - 1];
  
    if (!permissionId || permissionId === documentId) {
        return NextResponse.json({ error: "Permission ID is required for update." }, { status: 400 });
    }

    try {
      const { role } = await req.json();

      if (!['EDITOR', 'VIEWER'].includes(role)) {
          return NextResponse.json({ error: "Invalid role provided." }, { status: 400 });
      }
  
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });
  
      if (!document || document.userId !== authenticatedUserId) {
        return NextResponse.json({ error: "Access Denied: Not the document owner" }, { status: 403 });
      }
  
      const permissionToUpdate = await prisma.documentPermission.findUnique({
        where: { id: permissionId },
      });

      if (!permissionToUpdate || permissionToUpdate.documentId !== documentId || permissionToUpdate.userId === authenticatedUserId) {
          return NextResponse.json({ error: "Permission not found or not authorized to update." }, { status: 404 });
      }

      const updatedPermission = await prisma.documentPermission.update({
        where: { id: permissionId },
        data: { role },
        include: {
            user: {
                select: { username: true, email: true }
            }
        }
      });
  
      return NextResponse.json(updatedPermission, { status: 200 });
    } catch (error: unknown) {
      console.error("Error updating permission:", error instanceof Error ? error.message : String(error));
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  }