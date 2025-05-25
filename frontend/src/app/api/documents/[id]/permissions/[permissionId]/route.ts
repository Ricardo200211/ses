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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; permissionId: string } }
): Promise<NextResponse> {

  const { id: documentId, permissionId } = params;
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    console.error("API PUT: Unauthorized - no authenticated user.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!documentId || !permissionId) {
    console.error("API PUT: Validation failed - Missing documentId or permissionId after extraction.");
    return NextResponse.json({ error: "Document ID and Permission ID are required" }, { status: 400 });
  }

  try {
    const { role } = await req.json();

    if (!['EDITOR', 'VIEWER'].includes(role)) {
      console.error("API PUT: Invalid role provided:", role);
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== authenticatedUserId) {
      console.error("API PUT: Access Denied - Not the document owner.");
      return NextResponse.json({ error: "Access Denied: Not the document owner" }, { status: 403 });
    }

    const updatedPermission = await prisma.documentPermission.update({
      where: {
        id: permissionId,
        documentId: documentId,
        userId: { not: authenticatedUserId },
      },
      data: { role },
    });
    return NextResponse.json(updatedPermission, { status: 200 });
  } catch (error: unknown) {
    console.error("API PUT: Error updating permission:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; permissionId: string } }
): Promise<NextResponse> {

  const { id: documentId, permissionId } = params;
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    console.error("API DELETE: Unauthorized - no authenticated user.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!documentId || !permissionId) {
    console.error("API DELETE: Validation failed - Missing documentId or permissionId after extraction.");
    return NextResponse.json({ error: "Document ID and Permission ID are required" }, { status: 400 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== authenticatedUserId) {
      console.error("API DELETE: Access Denied - Not the document owner.");
      return NextResponse.json({ error: "Access Denied: Not the document owner" }, { status: 403 });
    }

    await prisma.documentPermission.delete({
      where: {
        id: permissionId,
        documentId: documentId,
        userId: { not: authenticatedUserId },
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    console.error("API DELETE: Error deleting permission:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}