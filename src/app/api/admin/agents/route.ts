import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * GET /api/admin/agents — list all Straico agents from rag_agents table
 * DELETE /api/admin/agents — delete agent { agentId }
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const result = await ncb.read<any>("rag_agents", {
      limit: 200,
      sort: "created_at",
      order: "desc",
    });

    const agents = result.data || [];

    // Enrich with owner info
    const enriched = await Promise.all(agents.map(async (agent: any) => {
      let ownerEmail = "—";
      try {
        if (agent.owner_user_id) {
          const user = await ncb.readOne<any>("app_users", agent.owner_user_id);
          ownerEmail = user?.email || "—";
        }
      } catch {}
      return { ...agent, ownerEmail };
    }));

    return NextResponse.json({ data: enriched });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { agentId } = body;

    if (!agentId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }

    const agent = await ncb.readOne<any>("rag_agents", agentId);
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete from Straico if has straico_agent_id
    if (agent.straico_agent_id) {
      try {
        const config = { apiKey: process.env["STRAICO_API_KEY"] || "", apiUrl: "https://api.straico.com" };
        await fetch(`${config.apiUrl}/v0/agent/${agent.straico_agent_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
      } catch (e: any) {
        console.warn("[Admin Agents] Straico delete failed:", e.message);
      }
    }

    // Mark deleted in NCB
    await ncb.update("rag_agents", agentId, {
      status: "deleted",
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
