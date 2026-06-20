'use client';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartStyle } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { PriceData } from "@/types";
import * as React from "react";
import { format } from "date-fns";

const chartConfig = {
    price: {
        label: "Price",
        color: "hsl(var(--chart-1))",
    },
};

export function PriceChart({ data }: { data: PriceData[] }) {
    const yAxisDomain = React.useMemo(() => {
        if (!data || data.length === 0) return [0, 100];
        const prices = data.map(p => p.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const padding = (max - min) * 0.1;
        return [min - padding, max + padding];
    }, [data]);

    return (
        <ChartContainer config={chartConfig} className="w-full h-full">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                 <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => format(new Date(value), 'yyyy-MM-dd')}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    domain={yAxisDomain}
                    tickFormatter={(value) => `$${Math.round(value)}`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" formatter={(value) => `$${(value as number).toFixed(2)}`} />}
                />
                <defs>
                    <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                    </linearGradient>
                </defs>
                <Area
                    dataKey="price"
                    type="natural"
                    fill="url(#fillPrice)"
                    stroke="hsl(var(--chart-1))"
                    stackId="a"
                />
            </AreaChart>
        </ChartContainer>
    );
}
