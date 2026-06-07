import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Test 1: Query users table to see structure/columns
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("*")
      .limit(1)

    // Test 2: Query interview_usage table
    const { data: usageData, error: usageError } = await supabase
      .from("interview_usage")
      .select("*")
      .limit(1)

    return NextResponse.json({
      success: true,
      users: {
        error: usersError ? usersError.message : null,
        data: usersData,
      },
      interview_usage: {
        error: usageError ? usageError.message : null,
        data: usageData,
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 })
  }
}
