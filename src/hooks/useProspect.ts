import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchLeads, generateOutreach } from "@/lib/prospect.functions";
import type { Lead } from "@/components/LeadTable";

type Outreach = Awaited<ReturnType<typeof generateOutreach>>;

export function useProspect() {
  const search = useServerFn(searchLeads);
  const outreach = useServerFn(generateOutreach);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState<{ niche: string; city: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [outreachData, setOutreachData] = useState<Outreach | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachError, setOutreachError] = useState<string | null>(null);

  const runSearch = async (niche: string, city: string) => {
    setSearching(true);
    setSearchError(null);
    setLeads([]);
    try {
      const res = await search({ data: { niche, city } });
      setLeads(res.leads);
      setQuery({ niche, city });
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Erro ao buscar leads");
    } finally {
      setSearching(false);
    }
  };

  const runOutreach = async (lead: Lead) => {
    setActiveLead(lead);
    setOutreachData(null);
    setOutreachError(null);
    setOutreachLoading(true);
    try {
      const res = await outreach({
        data: {
          businessName: lead.name,
          niche: query?.niche ?? "",
          city: query?.city ?? "",
          hasWebsite: lead.hasWebsite,
          websiteOutdated: lead.websiteOutdated,
          weakBranding: lead.weakBranding,
          instagram: lead.instagram,
        },
      });
      setOutreachData(res);
    } catch (e) {
      setOutreachError(e instanceof Error ? e.message : "Erro ao gerar abordagem");
    } finally {
      setOutreachLoading(false);
    }
  };

  const closeOutreach = () => {
    setActiveLead(null);
    setOutreachData(null);
    setOutreachError(null);
  };

  return {
    leads,
    query,
    searching,
    searchError,
    runSearch,
    activeLead,
    outreachData,
    outreachLoading,
    outreachError,
    runOutreach,
    closeOutreach,
  };
}
