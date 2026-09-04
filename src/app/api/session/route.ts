import { NextRequest, NextResponse } from "next/server";
import { getLearnerProfile, getLessonPlan, getSession } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId") || "default_user";

    if (sessionId) {
      const session = await getSession(sessionId);
      const plan = await getLessonPlan(sessionId);
      return NextResponse.json({ success: true, session, plan });
    }

    const profile = await getLearnerProfile(userId);
    return NextResponse.json({ success: true, profile });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to retrieve session/profile" },
      { status: 500 }
    );
  }
}
