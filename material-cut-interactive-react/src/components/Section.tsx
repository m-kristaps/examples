import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
	icon: LucideIcon;
	title: string;
	description: string;
	addLabel: string;
	onAdd: () => void;
	count: number;
	children: ReactNode;
}

export function Section({ icon: Icon, title, description, addLabel, onAdd, count, children }: Props) {
	const addButton = (className?: string) => (
		<Button variant="outline" size="sm" onClick={onAdd} className={className}>
			<Plus className="h-4 w-4 mr-1" />
			{addLabel}
		</Button>
	);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<div className="space-y-1">
					<CardTitle className="text-xl flex items-center gap-2">
						<Icon className="h-5 w-5" />
						{title}
					</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				{addButton()}
			</CardHeader>
			{count > 0 && <CardContent className="space-y-3">{children}</CardContent>}
			{count >= 3 && addButton("mx-4")}
		</Card>
	);
}
