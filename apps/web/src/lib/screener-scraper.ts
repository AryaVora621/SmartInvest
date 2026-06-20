import * as cheerio from 'cheerio';

export type ScrapedQuickRatios = Record<string, string | null>;
export type ScrapedTableRow = { metric: string; values: (string | null)[] };
export type ScrapedProsCons = { pros: string[]; cons: string[] };
export type ScrapedGrowthData = {
    sales: Record<string, string>;
    profit: Record<string, string>;
    cagr: Record<string, string>;
    roe: Record<string, string>;
};
export type ScrapedShareholding = {
    periods: string[];
    data: { category: string; values: (string | null)[] }[];
};

export type ScrapedPeer = {
    Symbol: string;
    Name: string;
    CMP: string;
    PERatio: string;
    MarketCapitalization: string;
    DividendYield: string;
    NetIncome: string;
    TotalRevenue: string;
    ROCE: string;
};

export type ScrapedCompanyData = {
    name: string;
    symbol: string;
    sector: string;
    quickRatios: ScrapedQuickRatios;
    growth: ScrapedGrowthData;
    ratios: ScrapedTableRow[];
    shareholding: ScrapedShareholding;
    prosCons: ScrapedProsCons;
    quarterlyReports: ScrapedTableRow[];
    annualReports: ScrapedTableRow[];
    balanceSheets: ScrapedTableRow[];
    cashFlows: ScrapedTableRow[];
    ratiosTable: ScrapedTableRow[];
    peerData: ScrapedPeer[];
};

function nseSymbol(stockSymbol: string): string | null {
    const s = stockSymbol.toUpperCase();
    if (s.endsWith('.BSE')) return s.replace('.BSE', '');
    if (s.endsWith('.NS')) return s.replace('.NS', '');
    if (s.endsWith('.BO')) return s.replace('.BO', '');
    if (['GOOGL', 'MSFT', 'AAPL', 'AMZN'].includes(s)) return null;
    return s;
}

async function fetchPage(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
            },
        });
        if (!response.ok) return null;
        return await response.text();
    } catch {
        return null;
    }
}

function parseQuickRatios($: cheerio.CheerioAPI): ScrapedQuickRatios {
    const ratios: ScrapedQuickRatios = {};
    $('ul#top-ratios li').each((_, el) => {
        const name = $(el).find('.name').text().trim();
        const value = $(el).find('.value').text().trim().replace(/\s+/g, ' ');
        ratios[name] = value || null;
    });
    return ratios;
}

function parseProsCons($: cheerio.CheerioAPI): ScrapedProsCons {
    const pros: string[] = [];
    const cons: string[] = [];
    $('section#analysis .pros ul li').each((_, el) => pros.push($(el).text().trim()));
    $('section#analysis .cons ul li').each((_, el) => cons.push($(el).text().trim()));
    return { pros, cons };
}

function parseFinancialTable($: cheerio.CheerioAPI, $table: cheerio.Cheerio<cheerio.AnyNode>): { headers: string[]; rows: ScrapedTableRow[] } {
    const headers: string[] = [];
    $table.find('thead tr th').each((i, th) => {
        if (i === 0) return;
        headers.push($(th).text().trim());
    });

    const rows: ScrapedTableRow[] = [];
    $table.find('tbody tr').each((_, tr) => {
        const $tr = $(tr);
        const isSub = $tr.hasClass('sub');
        const isStrong = $tr.hasClass('strong');
        const isStripe = $tr.hasClass('stripe');

        const $tds = $tr.find('td');
        if ($tds.length < 2) return;

        const $firstTd = $tds.eq(0);
        const $btn = $firstTd.find('button');
        let metric = $btn.length ? $btn.text().trim().replace('+', '').trim() : $firstTd.text().trim();

        if (isSub) metric = '  ' + metric;
        if (metric === 'Raw PDF' || metric === '') return;

        const values: (string | null)[] = [];
        $tds.each((j, td) => {
            if (j === 0) return;
            const $td = $(td);
            if ($td.find('a').length > 0 || $td.find('i.icon-file-pdf').length > 0) {
                values.push(null);
            } else {
                const v = $td.text().trim();
                values.push(v || null);
            }
        });

        rows.push({ metric, values });
    });

    return { headers, rows };
}

function parseGrowthTables($: cheerio.CheerioAPI): ScrapedGrowthData {
    const extract = (tableIndex: number): Record<string, string> => {
        const result: Record<string, string> = {};
        const $tables = $('table.ranges-table');
        if ($tables.length <= tableIndex) return {};
        $tables.eq(tableIndex).find('tr').each((_, tr) => {
            const $tds = $(tr).find('td');
            if ($tds.length === 2) {
                const label = $tds.eq(0).text().trim().replace(':', '');
                const value = $tds.eq(1).text().trim();
                result[label] = value;
            }
        });
        return result;
    };

    return {
        sales: extract(0),
        profit: extract(1),
        cagr: extract(2),
        roe: extract(3),
    };
}

function parseShareholding($: cheerio.CheerioAPI): ScrapedShareholding {
    const periods: string[] = [];
    const data: { category: string; values: (string | null)[] }[] = [];

    const $table = $('#quarterly-shp table.data-table');
    if (!$table.length) return { periods, data };

    $table.find('thead tr th').each((i, th) => {
        if (i === 0) return;
        periods.push($(th).text().trim());
    });

    $table.find('tbody tr').each((_, tr) => {
        const $tds = $(tr).find('td');
        if ($tds.length < 2) return;

        const $firstTd = $tds.eq(0);
        const $btn = $firstTd.find('button');
        const category = $btn.length ? $btn.text().trim().replace('+', '').trim() : $firstTd.text().trim();

        const values: (string | null)[] = [];
        $tds.each((j, td) => {
            if (j === 0) return;
            const v = $(td).text().trim();
            values.push(v || null);
        });

        data.push({ category, values });
    });

    return { periods, data };
}

function parseRatiosTable($: cheerio.CheerioAPI): ScrapedTableRow[] {
    const $table = $('section#ratios table.data-table');
    if (!$table.length) return [];
    const { rows } = parseFinancialTable($, $table);
    return rows;
}

function extractIndustryUrl(html: string): string | null {
    const $ = cheerio.load(html);
    const link = $('a[title="Industry"]').attr('href');
    return link || null;
}

async function parsePeerComparison(industryUrl: string): Promise<ScrapedPeer[]> {
    const peers: ScrapedPeer[] = [];
    try {
        const url = `https://www.screener.in${industryUrl}`;
        const html = await fetchPage(url);
        if (!html) return peers;

        const $ = cheerio.load(html);
        $('table.data-table tbody tr').each((_, tr) => {
            const $tds = $(tr).find('td');
            if ($tds.length < 10) return;

            const nameEl = $tds.eq(1).find('a');
            const name = nameEl.length ? nameEl.text().trim() : $tds.eq(1).text().trim();
            const href = nameEl.length ? nameEl.attr('href') || '' : '';
            const sym = href.replace('/company/', '').replace(/\/.*$/, '');
            if (!name) return;

            const getVal = (idx: number): string => $tds.eq(idx).text().trim() || '0';

            peers.push({
                Symbol: sym || name.replace(/\s+/g, ''),
                Name: name,
                CMP: getVal(2),
                PERatio: getVal(3),
                MarketCapitalization: parseScreenerNumber(getVal(4)).toString(),
                DividendYield: getVal(5).replace('%', ''),
                NetIncome: parseScreenerNumber(getVal(6)).toString(),
                TotalRevenue: parseScreenerNumber(getVal(8)).toString(),
                ROCE: getVal(10).replace('%', ''),
            });
        });
    } catch (e) {
        console.warn('Failed to parse peer comparison:', e);
    }
    return peers;
}

function parseScreenerNumber(val: string): number {
    const clean = val.replace(/[,\s]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

function determineSector(name: string): string {
    const sectorMap: Record<string, string> = {
        'reliance': 'Energy',
        'tata consultancy': 'IT',
        'hdfc bank': 'Finance',
        'infosys': 'IT',
        'hindustan unilever': 'FMCG',
        'icici bank': 'Finance',
        'state bank of india': 'Finance',
        'bajaj finance': 'Finance',
        'krishna defence': 'Defence',
        'apollo micro': 'Industrials',
    };
    const lower = name.toLowerCase();
    for (const [key, sector] of Object.entries(sectorMap)) {
        if (lower.includes(key)) return sector;
    }
    return 'Other';
}

export async function scrapeScreener(symbol: string, name: string): Promise<ScrapedCompanyData | null> {
    const nseSym = nseSymbol(symbol);
    if (!nseSym) return null;

    const url = `https://www.screener.in/company/${encodeURIComponent(nseSym)}/consolidated/`;
    const html = await fetchPage(url);
    if (!html) return null;

    const $ = cheerio.load(html);

    const companyName = $('h1').first().text().trim() || name;

    const quickRatios = parseQuickRatios($);
    const prosCons = parseProsCons($);

    const $quarters = $('section#quarters table.data-table');
    const quarterlyReports = $quarters.length ? parseFinancialTable($, $quarters).rows : [];

    const $pl = $('section#profit-loss table.data-table');
    const annualReports = $pl.length ? parseFinancialTable($, $pl).rows : [];

    const $bs = $('section#balance-sheet table.data-table');
    const balanceSheets = $bs.length ? parseFinancialTable($, $bs).rows : [];

    const $cf = $('section#cash-flow table.data-table');
    const cashFlows = $cf.length ? parseFinancialTable($, $cf).rows : [];

    const growth = parseGrowthTables($);
    const shareholding = parseShareholding($);
    const ratiosTable = parseRatiosTable($);
    const industryUrl = extractIndustryUrl(html);
    const peerData = industryUrl ? await parsePeerComparison(industryUrl) : [];
    const filteredPeers = peerData.filter(p => {
        const peerName = p.Name.toUpperCase().trim();
        const coName = companyName.toUpperCase().trim();
        const peerSym = p.Symbol.toUpperCase().trim();
        return peerSym !== nseSym.toUpperCase() && !coName.includes(peerName) && !peerName.includes(coName);
    });

    return {
        name: companyName,
        symbol: nseSym,
        sector: determineSector(name),
        quickRatios,
        growth,
        ratios: ratiosTable,
        shareholding,
        prosCons,
        quarterlyReports,
        annualReports,
        balanceSheets,
        cashFlows,
        ratiosTable,
        peerData: filteredPeers,
    };
}
