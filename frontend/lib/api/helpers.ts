import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// API Response helpers
export function jsonResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function notFoundResponse(resource = "Resource") {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

// Get authenticated user from request
export async function getAuthUser(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// Require authentication - returns user or throws error response
export async function requireAuth(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    throw unauthorizedResponse("Authentication required");
  }
  return user;
}

// Parse JSON body safely
export async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Parse query params
export function getQueryParams(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return Object.fromEntries(searchParams.entries());
}

// Pagination helpers
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}

// Validation helpers
export function validateRequired(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      return `${field} is required`;
    }
  }
  return null;
}

export function validateEnum<T extends string>(
  value: string,
  validValues: T[],
  fieldName: string
): string | null {
  if (!validValues.includes(value as T)) {
    return `${fieldName} must be one of: ${validValues.join(", ")}`;
  }
  return null;
}

// UUID validation
export function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function validateUUID(id: string, fieldName = "id"): string | null {
  if (!isValidUUID(id)) {
    return `Invalid ${fieldName} format`;
  }
  return null;
}
