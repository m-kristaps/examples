import { useGetAvailableBalancesExperimental } from "api/overview/useGetAvailableBalancesExperimental";
import { useExtId } from "./useExtId";

export interface AvailableCash {
    refetch: () => Promise<void>;
    loading: boolean;
    data: Record<string, number>;
}

export const useGetAvailableCashForActiveAccount = (): { availableCash: AvailableCash } => {
    const { selectedPortfolio, refetch: refetchExtId } = useExtId();
    const { balances, loading, refetch: refetchBalances } = useGetAvailableBalancesExperimental();

    const accountName = selectedPortfolio?.accounts[0]?.accountName.split('-')[0] ?? '';
    const tradingBalances: { currency: string; amount: number }[] = balances[accountName]?.trading ?? [];

    const data = Object.fromEntries(tradingBalances.map((item) => [item.currency, item.amount]));

    const refetch = async () => {
        await refetchExtId();
        await refetchBalances();
    };

    return {
        availableCash: { refetch, loading, data },
    };
};
