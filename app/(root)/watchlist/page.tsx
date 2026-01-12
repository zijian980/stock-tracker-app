import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { getWatchlistItemsByEmail } from "@/lib/actions/watchlist.actions";
import Link from "next/link";
import WatchlistButton from "@/components/WatchlistButton";
import { fetchJSON } from "@/lib/actions/finnhub.actions";

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

async function getStockQuote(symbol: string): Promise<QuoteData> {
  try {
    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) return {};
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const data = await fetchJSON<QuoteData>(url, 60); // cache for 60 seconds
    return data;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return {};
  }
}

async function getStockProfile(symbol: string): Promise<ProfileData> {
  try {
    const token = process.env.FINNHUB_API_KEY ?? process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!token) return {};
    const url = `${FINNHUB_BASE_URL}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${token}`;
    const data = await fetchJSON<ProfileData>(url, 3600); // cache for 1 hour
    return data;
  } catch (error) {
    console.error(`Error fetching profile for ${symbol}:`, error);
    return {};
  }
}

export default async function WatchlistPage() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user?.email) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Watchlist</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view your watchlist</p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const watchlistItems = await getWatchlistItemsByEmail(session.user.email);

  if (watchlistItems.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-16 h-16 mx-auto mb-4 text-muted-foreground"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.385a.563.563 0 00-.182-.557L3.04 10.385a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345l2.125-5.111z"
            />
          </svg>
          <h1 className="text-3xl font-bold mb-4">Your Watchlist is Empty</h1>
          <p className="text-muted-foreground mb-6">
            Start building your watchlist by searching for stocks and adding them to keep track of your favorite companies.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Explore Stocks
          </Link>
        </div>
      </div>
    );
  }

  // Fetch quotes and profiles for all watchlist items
  const stocksWithData = await Promise.all(
    watchlistItems.map(async (item) => {
      const [quote, profile] = await Promise.all([
        getStockQuote(item.symbol),
        getStockProfile(item.symbol),
      ]);
      return {
        ...item,
        quote,
        profile,
      };
    })
  );

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Watchlist</h1>
          <p className="text-muted-foreground">
            Track your favorite stocks and monitor their performance
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stocksWithData.map((stock) => {
            const currentPrice = stock.quote.c;
            const priceChange = stock.quote.dp;
            const marketCap = stock.profile.marketCapitalization;
            const companyName = stock.profile.name || stock.company;

            const isPositive = (priceChange ?? 0) >= 0;
            const changeColor = isPositive ? "text-green-500" : "text-red-500";

            return (
              <div
                key={stock.symbol}
                className="relative rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <Link
                      href={`/stocks/${stock.symbol}`}
                      className="text-xl font-bold hover:underline"
                    >
                      {stock.symbol}
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {companyName}
                    </p>
                  </div>
                  <WatchlistButton
                    symbol={stock.symbol}
                    company={stock.company}
                    isInWatchlist={true}
                    type="icon"
                    userEmail={session.user.email}
                  />
                </div>

                {currentPrice !== undefined ? (
                  <div className="mb-4">
                    <div className="text-3xl font-bold mb-1">
                      ${currentPrice.toFixed(2)}
                    </div>
                    {priceChange !== undefined && (
                      <div className={`text-sm font-medium ${changeColor}`}>
                        {isPositive ? "+" : ""}
                        {priceChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground">
                      Price data unavailable
                    </div>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {marketCap !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Cap</span>
                      <span className="font-medium">
                        ${(marketCap / 1000).toFixed(2)}B
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Added</span>
                    <span className="font-medium">
                      {new Date(stock.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/stocks/${stock.symbol}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  View Details
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
