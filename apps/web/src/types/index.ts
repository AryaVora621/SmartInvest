

export type Stock = {
    symbol: string;
    name: string;
    sector: string;
    fairPE: number;
    lastQuarterProfit: number;
};

export type Screener = {
    id: string;
    name: string;
    criteria: string;
};

export type PriceData = {
    date: string;
    price: number;
};

export type TechnicalIndicator = {
    name: string;
    value: string;
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
};

export type Transaction = {
    id: string;
    stockSymbol: string;
    stockName: string;
    type: 'buy' | 'sell';
    quantity: number;
    price: number;
    date: string;
    pe?: number;
    indPE?: number;
    investedPercent?: number;
    target?: number;
};

export type Ledger = {
    stockName: string;
    stockSymbol: string;
    buyAmount: number;
    sellAmount: number;
    balanceAmount: number;
    buyQuantity: number;
    sellQuantity: number;
    balanceQuantity: number;
};

export type CashbookEntry = {
    id: number;
    date: string;
    particulars: string;
    withdrawals: { rs: number; p: number };
    deposits: { rs: number; p: number };
    balance: { rs: number; p: number };
};

export type NewsArticle = {
    title: string;
    source: string;
    summary: string;
    link: string;
    published: string;
};

export type FixedDeposit = {
    id: string;
    bankName: string;
    familyMember: string;
    principal: number;
    startDate: string;
    period: {
        years: number;
        months: number;
        days: number;
    };
    maturityDate: string;
    numberOfDays: number;
    interestRate: number;
    interestAmount: number;
    maturityAmount: number;
    daysToMaturity: number;
};

export type WatchlistStock = {
    id: string;
    date: string;
    name: string;
    price: number;
    pe: number;
};

export type AlertConfig = {
    stockId: string;
    stockName: string;
    period: string;
    threshold: string;
    email: boolean;
    telegram: boolean;
    createdAt?: number;
};

export type SentAlert = {
    id: number;
    stockName: string;
    message: string;
    sentVia: ('email' | 'telegram')[];
    time: Date;
    source: 'WL' | 'Port';
};

export type UserProfile = {
  name: string;
  email: string;
  mobile: string;
  investableAmount?: number;
};

export type HighValueInvestor = {
  id: string;
  name: string;
  addedAt: string;
};

export type BulkDeal = {
  date: string;
  symbol: string;
  securityName: string;
  clientName: string;
  buySell: 'BUY' | 'SELL';
  quantityTraded: number;
  tradePrice: number;
};
