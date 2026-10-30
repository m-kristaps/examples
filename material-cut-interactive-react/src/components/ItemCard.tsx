import type { ReactNode } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
	complete: boolean;
	expanded: boolean;
	onToggle: () => void;
	onDelete: () => void;
	badge: string;
	title: ReactNode;
	children: ReactNode;
}

export function ItemCard({ complete, expanded, onToggle, onDelete, badge, title, children }: Props) {
	return (
		<Card className={cn("py-0 gap-0 overflow-hidden border-l-4 transition-all duration-200", complete ? "border-l-green-500" : "border-l-red-500")}>
			<div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 group" onClick={onToggle}>
				<div className="flex items-center gap-4">
					<ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", expanded && "rotate-90")} />
					<div className="bg-slate-100 px-2 py-1 rounded text-xs font-mono font-bold text-slate-600">{badge}</div>
					{title}
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-8 text-slate-500 cursor-pointer hover:text-red-600"
					onClick={(e) => {
						e.stopPropagation();
						onDelete();
					}}
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</div>
			{expanded && (
				<CardContent className="p-4 pt-4 mt-0 border-t bg-white space-y-6 animate-in slide-in-from-top-1 duration-200">
					{children}
				</CardContent>
			)}
		</Card>
	);
}
