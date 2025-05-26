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
  const { id } = params;
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!id) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: id },
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

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let userRole: 'OWNER' | 'EDITOR' | 'VIEWER' | 'PUBLIC_VIEWER' | 'PUBLIC_EDITOR' | null = null;

    if (document.userId === authenticatedUserId) {
      userRole = 'OWNER';
    } else {
      if (authenticatedUserId) {
        const permission = await prisma.documentPermission.findUnique({
          where: {
            documentId_userId: {
              documentId: id,
              userId: authenticatedUserId,
            },
          },
        });
        if (permission) {
          userRole = permission.role;
        }
      }

      if (!userRole && document.isPublic) {
        if (document.publicAccessRole === AccessRole.EDITOR) {
            userRole = 'PUBLIC_EDITOR';
        } else if (document.publicAccessRole === AccessRole.VIEWER) {
            userRole = 'PUBLIC_VIEWER';
        }
      }
    }

    if (!userRole) {
      return NextResponse.json({ error: "Forbidden: Not authorized to view this document." }, { status: 403 });
    }

    return NextResponse.json({ document, userRole }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error fetching document:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
    const { id } = params;
    const authenticatedUserId = await getAuthenticatedUserId(req);

    try {
        const { title, content } = await req.json();

        const existingDocument = await prisma.document.findUnique({
            where: { id: id },
        });

        if (!existingDocument) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        let canEdit = false;

        if (existingDocument.userId === authenticatedUserId) {
            canEdit = true;
        } else {
            if (authenticatedUserId) {
                const userPermission = await prisma.documentPermission.findUnique({
                    where: {
                        documentId_userId: {
                            documentId: id,
                            userId: authenticatedUserId,
                        },
                    },
                });
                if (userPermission && userPermission.role === AccessRole.EDITOR) {
                    canEdit = true;
                }
            }

            if (existingDocument.isPublic && existingDocument.publicAccessRole === AccessRole.EDITOR) {
                canEdit = true;
            }
        }

        if (!canEdit) {
            if (authenticatedUserId) {
                return NextResponse.json({ error: "Forbidden: Not authorized to edit this document." }, { status: 403 });
            } else {
                return NextResponse.json({ error: "Unauthorized: Please log in to edit this document." }, { status: 401 });
            }
        }

        const updatedDocument = await prisma.document.update({
            where: { id: id },
            data: {
                title: title,
                content: content,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({ message: "Document updated successfully", document: updatedDocument }, { status: 200 });

    } catch (error: unknown) {
        console.error("Error updating document:", error instanceof Error ? error.message : String(error));
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const { id } = params;
  const authenticatedUserId = await getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: id },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (document.userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden: Not authorized to delete this document." }, { status: 403 });
    }

    await prisma.document.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: "Document deleted successfully" }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error deleting document:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}