import { useParams } from "react-router-dom";
import { useGetContactInfo } from "../api/initial/useGetContactInfo";
import { TOTAL_INVESTMENTS_OPTION_ID } from "./useGetPortfolioOptions";

export const useGetAvailableAccountsCurrencies = () => {
    const { portfolioId: portfolioIdUrl } = useParams();
    const portfolioId = portfolioIdUrl ? parseInt(portfolioIdUrl, 10) : TOTAL_INVESTMENTS_OPTION_ID;

    const { data: contactInfo } = useGetContactInfo();

    const portfolios = (contactInfo?.portfolios ?? []).filter(
        (portfolio) => portfolioId === TOTAL_INVESTMENTS_OPTION_ID || portfolio.id === portfolioId
    );

    // account name ends with currency, e.g. "12345-EUR"
    const currencies = portfolios
        .flatMap((portfolio) => portfolio.accounts)
        .map((account) => account.accountName.split('-').pop())
        .filter((currency): currency is string => Boolean(currency));

    return {
        availableCurrencies: [...new Set(currencies)],
    };
};
