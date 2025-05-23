"use client";

import { LoginForm } from '@/components/AuthForms';
import React from 'react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-gray-800">
      <LoginForm />
    </div>
  );
}