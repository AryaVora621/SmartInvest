
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Stock } from "@/types";
import { Lightbulb, ShieldAlert, ThumbsDown, ThumbsUp, Zap } from "lucide-react";

const SwotSection = ({ title, items, icon, colorClass }: { title: string, items: string[], icon: React.ReactNode, colorClass: string }) => (
    <div className="border p-4 rounded-lg">
        <CardTitle className={`font-semibold flex items-center gap-2 mb-4 p-2 bg-secondary/50 rounded-md text-sm ${colorClass}`}>
            {icon}
            {title}
        </CardTitle>
        <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            {items.length > 0 ? items.map((item, index) => <li key={index}>{item}</li>) : <li>No items available.</li>}
        </ul>
    </div>
);


export function SwotCard({ stock, strengths, weaknesses, opportunities, threats }: { stock: Stock, strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-baseline gap-2">
                    <CardTitle className="flex items-center gap-2 font-headline text-base">
                        <Zap className="text-primary" />
                        SWOT Analysis
                    </CardTitle>
                    <CardDescription className="text-xs">A strategic overview of {stock.name}'s strengths, weaknesses, opportunities, and threats.</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <SwotSection title="Strengths" items={strengths} icon={<ThumbsUp size={16}/>} colorClass="text-green-600" />
                    <SwotSection title="Weaknesses" items={weaknesses} icon={<ThumbsDown size={16}/>} colorClass="text-red-600" />
                    <SwotSection title="Opportunities" items={opportunities} icon={<Lightbulb size={16}/>} colorClass="text-blue-600" />
                    <SwotSection title="Threats" items={threats} icon={<ShieldAlert size={16}/>} colorClass="text-orange-600" />
                </div>
            </CardContent>
        </Card>
    );
}

    

    

