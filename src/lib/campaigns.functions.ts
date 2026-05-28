import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: leads } = await supabase
      .from("leads")
      .select("campaign_id, status, score");

    return {
      campaigns: (campaigns ?? []).map((c) => {
        const cl = (leads ?? []).filter((l) => l.campaign_id === c.id);
        const contacted = cl.filter((l) =>
          ["contacted", "replied", "meeting", "closed"].includes(l.status),
        ).length;
        const replied = cl.filter((l) =>
          ["replied", "meeting", "closed"].includes(l.status),
        ).length;
        const hot = cl.filter((l) => l.score === "hot" || l.score === "very_hot").length;
        return {
          ...c,
          leads_count: cl.length,
          contacted_count: contacted,
          reply_rate: contacted > 0 ? Math.round((replied / contacted) * 100) : 0,
          hot_count: hot,
        };
      }),
    };
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!campaign) throw new Error("Campanha não encontrada");

    const { data: leads, error: lErr } = await supabase
      .from("leads")
      .select("*")
      .eq("campaign_id", data.id)
      .order("score", { ascending: false })
      .order("created_at", { ascending: false });
    if (lErr) throw new Error(lErr.message);

    return { campaign, leads: leads ?? [] };
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(2).max(120),
      niche: z.string().trim().min(2).max(80),
      city: z.string().trim().min(2).max(80),
      notes: z.string().trim().max(2000).optional(),
      max_leads: z.number().int().min(5).max(50).default(20),
    }),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("campaigns")
      .insert({
        user_id: userId,
        name: data.name,
        niche: data.niche,
        city: data.city,
        notes: data.notes ?? null,
        max_leads: data.max_leads,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { campaign: row };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase } = context;
    const { error } = await supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: campaigns } = await supabase.from("campaigns").select("id, status, niche, city");
    const { data: leads } = await supabase
      .from("leads")
      .select("status, score, campaign_id");

    const totalLeads = leads?.length ?? 0;
    const hotLeads = leads?.filter((l) => l.score === "hot" || l.score === "very_hot").length ?? 0;
    const activeCampaigns = campaigns?.filter((c) => c.status === "running").length ?? 0;
    const contacted = leads?.filter((l) =>
      ["contacted", "replied", "meeting", "closed"].includes(l.status),
    ).length ?? 0;
    const replied = leads?.filter((l) =>
      ["replied", "meeting", "closed"].includes(l.status),
    ).length ?? 0;
    const converted = leads?.filter((l) => l.status === "closed").length ?? 0;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

    const byNiche = new Map<string, number>();
    const byCity = new Map<string, number>();
    for (const c of campaigns ?? []) {
      const ln = leads?.filter((l) => l.campaign_id === c.id).length ?? 0;
      byNiche.set(c.niche, (byNiche.get(c.niche) ?? 0) + ln);
      byCity.set(c.city, (byCity.get(c.city) ?? 0) + ln);
    }

    return {
      totalLeads,
      hotLeads,
      activeCampaigns,
      totalCampaigns: campaigns?.length ?? 0,
      contacted,
      converted,
      replyRate,
      byNiche: Array.from(byNiche.entries()).map(([name, value]) => ({ name, value })),
      byCity: Array.from(byCity.entries()).map(([name, value]) => ({ name, value })),
    };
  });
