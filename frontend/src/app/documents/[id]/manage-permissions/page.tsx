"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Permission {
  id: string;
  documentId: string;
  userId: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface DocumentDetails {
  id: string;
  title: string;
  userId: string;
  isPublic: boolean;
  publicAccessRole: 'VIEWER' | 'EDITOR' | null;
}

export default function ManagePermissionsPage() {
  const params = useParams();
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, userId: authenticatedUserId, logout } = useAuth();

  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [isPublic, setIsPublic] = useState(false);
  const [publicAccessRole, setPublicAccessRole] = useState<'VIEWER' | 'EDITOR' | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingPublicPermissions, setIsSavingPublicPermissions] = useState(false);

  const [newTargetUserIdentifier, setNewTargetUserIdentifier] = useState('');
  const [newRole, setNewRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');

  const fetchDocumentAndPermissions = useCallback(async () => {
    if (!documentId || authLoading) return;

    setLoading(true);
    setError(null);
    try {
      const docRes = await fetch(`/api/documents/${documentId}`, { credentials: 'include' });
      const docResData = await docRes.json();

      if (!docRes.ok) {
        if (docRes.status === 401) {
            logout();
            router.push('/login');
            return;
        }
        throw new Error(docResData.error || "Failed to load document.");
      }
      
      if (authenticatedUserId !== docResData.document.userId) {
        setError("Access denied: You are not the owner of this document to manage permissions.");
        setLoading(false);
        return;
      }

      setDocument({
          id: docResData.document.id,
          title: docResData.document.title,
          userId: docResData.document.userId,
          isPublic: docResData.document.isPublic,
          publicAccessRole: docResData.document.publicAccessRole,
      });
      setIsPublic(docResData.document.isPublic);
      setPublicAccessRole(docResData.document.publicAccessRole);

      const permissionsRes = await fetch(`/api/documents/${documentId}/permissions`, { credentials: 'include' });
      const permissionsResData = await permissionsRes.json();

      if (!permissionsRes.ok) {
        throw new Error(permissionsResData.error || "Failed to load document permissions.");
      }
      
      setPermissions(permissionsResData.userPermissions); 

    } catch (err: unknown) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while loading data.");
    } finally {
      setLoading(false);
    }
  }, [documentId, authLoading, authenticatedUserId, router, logout]);

  useEffect(() => {
    fetchDocumentAndPermissions();
  }, [fetchDocumentAndPermissions]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!documentId) return;

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserIdentifier: newTargetUserIdentifier, role: newRole }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Permission added/updated successfully!');
        setNewTargetUserIdentifier('');
        setNewRole('VIEWER');
        fetchDocumentAndPermissions();
      } else {
        throw new Error(data.error || 'Failed to add permission.');
      }
    } catch (err: unknown) {
      console.error("Error adding permission:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while adding permission.");
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    setMessage(null);
    setError(null);
    if (!documentId || !window.confirm("Are you sure you want to remove this permission?")) {
      setError("Document ID or confirmation missing.");
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${permissionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.status === 204) {
        setMessage('Permission removed successfully!');
        fetchDocumentAndPermissions();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove permission.');
      }
    } catch (err: unknown) {
      console.error("Error removing permission:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while removing permission.");
    }
  };

  const handleUpdatePermissionRole = async (permissionId: string, newRoleValue: 'EDITOR' | 'VIEWER') => {
    setMessage(null);
    setError(null);
    if (!documentId) {
      setError("Document ID missing.");
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions/${permissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRoleValue }),
        credentials: 'include',
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('Permission updated successfully!');
        fetchDocumentAndPermissions();
      } else {
        throw new Error(data.error || 'Failed to update permission.');
      }
    } catch (err: unknown) {
      console.error("Error updating permission:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while updating permission.");
    }
  };

  const handleSavePublicPermissions = async () => {
    setIsSavingPublicPermissions(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isPublic, publicAccessRole: isPublic ? publicAccessRole : null }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to update public permissions.');
      }

      setDocument(prevDoc => prevDoc ? { ...prevDoc, isPublic: data.isPublic, publicAccessRole: data.publicAccessRole } : null);
      setMessage('Public permissions updated successfully!');

    } catch (err: unknown) {
      console.error('Error saving public permissions:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while saving public permissions.');
    } finally {
      setIsSavingPublicPermissions(false);
    }
  };


  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700">Loading permission management...</p>
      </div>
    );
  }

  if (!isAuthenticated || !document) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-red-600">Document not found or unauthorized access. Please login.</p>
      </div>
    );
  }

  if (authenticatedUserId !== document.userId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <p className="text-2xl text-red-600 font-bold mb-4">{error || "Access Denied: You are not the owner of this document."}</p>
        <Link href={`/documents/${documentId}`} className="text-blue-600 hover:underline text-lg">
          Back to Document
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Manage Permissions for &quot;{document.title}&quot;
        </h1>

        {error && <p className="bg-red-100 text-red-800 p-3 rounded-md mb-4">{error}</p>}
        {message && <p className="bg-green-100 text-green-800 p-3 rounded-md mb-4">{message}</p>}

        <Link href={`/documents/${documentId}`} className="text-blue-600 hover:underline mb-6 block text-lg">
          &larr; Back to Document
        </Link>

        <div className="mb-8 p-4 border border-blue-200 rounded-md bg-blue-50">
            <h2 className="text-2xl font-semibold mb-4 text-blue-800">Public Access Settings</h2>
            <div className="mb-4">
                <label htmlFor="isPublic" className="flex items-center space-x-3 cursor-pointer">
                    <input
                        type="checkbox"
                        id="isPublic"
                        checked={isPublic}
                        onChange={(e) => {
                            setIsPublic(e.target.checked);
                            if (!e.target.checked) {
                                setPublicAccessRole(null);
                            } else {
                                if (publicAccessRole === null) {
                                    setPublicAccessRole('VIEWER');
                                }
                            }
                        }}
                        className="form-checkbox h-5 w-5 text-blue-600 rounded-md focus:ring-blue-500"
                    />
                    <span className="text-lg font-semibold text-blue-800">Make Document Publicly Accessible</span>
                </label>
            </div>

            {isPublic && (
                <div className="mb-6 ml-8">
                    <label htmlFor="publicAccessRole" className="block text-blue-800 text-lg font-semibold mb-2">Public Access Role:</label> 
                    <select
                        id="publicAccessRole"
                        value={publicAccessRole || ''}
                        onChange={(e) => setPublicAccessRole(e.target.value as 'VIEWER' | 'EDITOR')}
                        className="w-full p-3 border border-blue-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-100 text-gray-900" 
                    >
                        <option value="" disabled>Select an access role</option> 
                        <option value="VIEWER">Viewer (Read-only)</option>
                        <option value="EDITOR">Editor (Can edit content)</option>
                    </select>
                </div>
            )}
            <button
                onClick={handleSavePublicPermissions}
                disabled={isSavingPublicPermissions}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
                {isSavingPublicPermissions ? 'Saving...' : 'Save Public Access Settings'}
            </button>
        </div>

        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Add New User Permission</h2> 
          <form onSubmit={handleAddPermission} className="space-y-4">
            <div>
              <label htmlFor="targetUser" className="block text-gray-800 text-base font-bold mb-2">
                User Email or Username:
              </label>
              <input
                type="text"
                id="targetUser"
                value={newTargetUserIdentifier}
                onChange={(e) => setNewTargetUserIdentifier(e.target.value)}
                placeholder="Ex: user@example.com or username"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline text-base" 
                required
              />
            </div>
            <div>
              <label htmlFor="newRole" className="block text-gray-800 text-base font-bold mb-2"> 
                Role:
              </label>
              <select
                id="newRole"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="shadow border rounded w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:shadow-outline text-base" 
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline text-base" 
            >
              Add User Permission
            </button>
          </form>
        </div>

        <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Existing User Permissions</h2> 
          {permissions.length === 0 ? (
            <p className="text-gray-700 text-base">No explicit user permissions defined for this document yet.</p> 
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider"> 
                      Username / Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider"> 
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider"> 
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permissions.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900"> 
                        {p.user.username} ({p.user.email})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900">
                        <select
                          value={p.role}
                          onChange={(e) => handleUpdatePermissionRole(p.id, e.target.value as 'EDITOR' | 'VIEWER')}
                          className="shadow border rounded py-1 px-2 text-gray-900 leading-tight focus:outline-none focus:shadow-outline text-base" 
                          disabled={p.role === 'OWNER'}
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base font-medium"> 
                        <button
                          onClick={() => handleRemovePermission(p.id)}
                          className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={p.role === 'OWNER'}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}