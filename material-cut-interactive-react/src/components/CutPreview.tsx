import { Box } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { SideLabels, SIDES, type Cut, type LaminateMaterial, type Side } from "@/types";

// red strip on each edge that has edge
const edgeStrip: Record<Side, string> = {
	top: "top-0 left-0 w-full h-2.5",
	bottom: "bottom-0 left-0 w-full h-2.5",
	left: "top-0 left-0 w-2.5 h-full",
	right: "top-0 right-0 w-2.5 h-full",
};

const grainPattern: Record<string, string> = {
	'1': "bg-[linear-gradient(0deg,transparent_90%,#000_100%)] bg-[length:100%_8px]",
	'2': "bg-[linear-gradient(90deg,transparent_90%,#000_100%)] bg-[length:8px_100%]",
};

function Dimension({ value, className }: { value: number; className: string }) {
	return (
		<div className={cn("absolute flex items-center justify-between font-mono text-sm font-bold text-slate-700", className)}>
			<div className="h-px bg-slate-400 flex-1" />
			<span className="px-3">{value} mm</span>
			<div className="h-px bg-slate-400 flex-1" />
			<div className="absolute left-0 w-px h-2 bg-slate-400" />
			<div className="absolute right-0 w-px h-2 bg-slate-400" />
		</div>
	);
}

export function CutPreview({ cut, laminates }: { cut: Cut; laminates: LaminateMaterial[] }) {
	const { length, width, grain, edges } = cut;

	return (
		<Card className="sticky top-8 min-h-[600px] flex flex-col">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Box className="h-5 w-5" />
					Detaļas priekšskatījums
				</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 flex items-center justify-center bg-slate-100 m-6 rounded-xl border-2 border-dashed border-slate-300 p-20 relative overflow-hidden">
				<div className="relative w-[320px] h-[240px] bg-orange-200 border-2 border-orange-400 shadow-xl flex items-center justify-center">
					<div className={cn("absolute inset-0 opacity-20 pointer-events-none", grainPattern[grain])} />

					{SIDES.filter(side => edges[side].enabled).map(side => (
						<div key={side} className={cn("flex items-center justify-center absolute bg-red-500", edgeStrip[side])} title={SideLabels[side]}>
							<div className={cn("text-white", (side === 'left' || side === 'right') && "-rotate-90")}>
								{laminates.find(l => l.id === edges[side].colorID)?.colorCode}
							</div>
						</div>
					))}

					<span className="text-orange-950 font-black text-xl z-10 opacity-60">
						{length && width ? `${length} x ${width}` : 'Ievadiet izmērus'}
					</span>

					{length && <Dimension value={length} className="-top-10 left-0 w-full" />}
					<div className="absolute -bottom-9 left-0 w-full text-center text-xs font-mono uppercase tracking-widest text-slate-500 opacity-60">
						Garums
					</div>

					{width && <Dimension value={width} className="top-[108px] right-[-160px] w-[240px] -rotate-90" />}
					<div className="absolute top-0 -left-12 h-full flex items-center justify-center text-xs font-mono uppercase tracking-widest text-slate-500 opacity-60">
						<span className="-rotate-90">Platums</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
