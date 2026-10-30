import { useMemo } from "react";
import { useGetContactInfo } from "../api/initial/useGetContactInfo";
import { useTradablePortfolioSelect } from "../components/TradingModals/useTradablePortfolioSelect";
import { useGetContractIdData } from "../providers/ContractIdProvider";

export const useExtId = (fallBackToFirst = true) => {
    const { selectedContactId } = useGetContractIdData();
    const { portfolioId } = useTradablePortfolioSelect();
    const { data: { portfolios } = { portfolios: [] }, refetch } = useGetContactInfo(false, selectedContactId);

    const foundPortfolio = useMemo(
        () => portfolios.find((p) => p.id === portfolioId),
        [portfolios, portfolioId]
    );

    const isFallback = fallBackToFirst && !foundPortfolio;
    const selectedPortfolio = isFallback ? portfolios[0] : foundPortfolio;

    // short name looks like "EXT123-Something", ext id is the first part
    const extId = selectedPortfolio?.shortName?.split('-')[0] ?? '';

    return {
        extId,
        selectedContactId,
        portfolioId,
        selectedPortfolio,
        portfolios,
        isFallback,
        refetch,
    };
};
