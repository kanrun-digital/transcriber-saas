import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

function straicoConfig() {
  return {
    apiKey: process.env["STRAICO_API_KEY"] || "",
    apiUrl: "https://api.straico.com",
  };
}

/**
 * GET /api/admin/agents — list agents from Straico API + NCB
 * DELETE /api/admin/agents — delete agent
 */
export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const config = straicoConfig();

    // Fetch agents from Straico API
    let straicoAgents: any[] = [];
    try {
      const res = await fetch(`${config.apiUrl}/v0/agent`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        straicoAgents = data.data || data.agents || [];
        if (!Array.isArray(straicoAgents)) straicoAgents = [];
      }
    } catch (e: any) {
      console.warn("[Admin Agents] Straico fetch failed:", e.message);
    }

    // Also fetch from NCB rag_agents table
    let ncbAgents: any[] = [];
    try {
      const result = await ncb.read<any>("rag_agents", {
        limit: 200,
        sort: "created_at",
        order: "desc",
      });
      ncbAgents = result.data || [];
    } catch {}

    // Enrich NCB agents with owner info
    const enrichedNcb = await Promise.all(ncbAgents.map(async (agent: any) => {
      let ownerEmail = "—";
      try {
        if (agent.owner_user_id) {
          const user = await ncb.readOne<any>("app_users", agent.owner_user_id);
          ownerEmail = user?.email || "—";
        }
      } catch {}
      return { ...agent, ownerEmail, source: "ncb" };
    }));

    // Map Straico agents
    const mappedStraico = straicoAgents.map((a: any) => ({
      id: a._id || a.id,
      name: a.name || "Unnamed",
      description: a.description || "",
      straico_agent_id: a._id || a.id,
      status: "active",
      source: "straico",
      ownerEmail: "system",
      created_at: a.createdAt || a.created_at || "",
    }));

    // Merge: NCB agents + Straico agents not in NCB
    const ncbStraicoIds = new Set(enrichedNcb.map((a: any) => a.straico_agent_id).filter(Boolean));
    const uniqueStraico = mappedStraico.filter((a: any) => !ncbStraicoIds.has(a.straico_agent_id));

    return NextResponse.json({
      data: [...enrichedNcb, ...uniqueStraico],
      ncbCount: enrichedNcb.length,
      straicoCount: mappedStraico.length,
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { agentId, straicoAgentId } = body;
    const config = straicoConfig();

    // Delete from Straico
    const deleteId = straicoAgentId || agentId;
    if (deleteId) {
      try {
        await fetch(`${config.apiUrl}/v0/agent/${deleteId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${config.apiKey}` },
        });
      } catch (e: any) {
        console.warn("[Admin Agents] Straico delete failed:", e.message);
      }
    }

    // Mark deleted in NCB if exists
    if (agentId && typeof agentId === "number") {
      try {
        await ncb.update("rag_agents", agentId, { status: "deleted" });
      } catch {}
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
