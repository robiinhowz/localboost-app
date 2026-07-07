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
      .select("status, score, campaign_id, has_website, instagram, ai_problems, raw_data, created_at");

    const totalLeads = leads?.length ?? 0;
    const hotLeads = leads?.filter((l) => l.score === "hot" || l.score === "very_hot").length ?? 0;
    const veryHot = leads?.filter((l) => l.score === "very_hot").length ?? 0;
    const activeCampaigns = campaigns?.filter((c) => c.status === "running").length ?? 0;
    const contacted = leads?.filter((l) =>
      ["contacted", "replied", "meeting", "closed"].includes(l.status),
    ).length ?? 0;
    const replied = leads?.filter((l) =>
      ["replied", "meeting", "closed"].includes(l.status),
    ).length ?? 0;
    const converted = leads?.filter((l) => l.status === "closed").length ?? 0;
    const replyRate = contacted > 0 ? Math.round((replied / contacted) * 100) : 0;

    const probMatch = (l: { ai_problems?: unknown }, re: RegExp) => {
      const arr = Array.isArray(l.ai_problems) ? (l.ai_problems as unknown[]) : [];
      return arr.some((p) => typeof p === "string" && re.test(p));
    };
    const noWebsite = leads?.filter((l) => !l.has_website).length ?? 0;
    const oldSite = leads?.filter((l) => probMatch(l, /antig|desatualiz|wix|canva|obsolet/i)).length ?? 0;
    const brokenSite = leads?.filter((l) => probMatch(l, /indispon|fora do ar|erro|404|offline/i)).length ?? 0;
    const abandonedIg = leads?.filter((l) => probMatch(l, /instagram.*abandon|bio fraca|sem posts|inativo/i)).length ?? 0;
    const withInstagram = leads?.filter((l) => !!l.instagram).length ?? 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = leads?.filter((l) => new Date(l.created_at) >= today).length ?? 0;

    const byNiche = new Map<string, number>();
    const byCity = new Map<string, number>();
    for (const l of leads ?? []) {
      const camp = campaigns?.find((c) => c.id === l.campaign_id);
      const raw = (l.raw_data ?? {}) as { discovered_niche?: string; discovered_city?: string };
      const niche = raw.discovered_niche || camp?.niche || "—";
      const city = raw.discovered_city || camp?.city || "—";
      byNiche.set(niche, (byNiche.get(niche) ?? 0) + 1);
      byCity.set(city, (byCity.get(city) ?? 0) + 1);
    }

    return {
      totalLeads,
      hotLeads,
      veryHot,
      activeCampaigns,
      totalCampaigns: campaigns?.length ?? 0,
      contacted,
      converted,
      replyRate,
      todayCount,
      opportunities: {
        noWebsite,
        brokenSite,
        oldSite,
        abandonedIg,
        withInstagram,
        veryHot,
      },
      byNiche: Array.from(byNiche.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name, value]) => ({ name, value })),
      byCity: Array.from(byCity.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([name, value]) => ({ name, value })),
    };
  });
