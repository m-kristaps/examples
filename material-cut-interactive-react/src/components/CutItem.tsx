import { ItemCard } from "@/components/ItemCard";
import { InputField, SelectBox, SelectField } from "@/components/Field";
import { Label } from "@/components/ui/label";
import { cn, toNumber } from "@/lib/utils";
import { MaterialGrainDirections, SideLabels, SIDES, type Cut, type LaminateMaterial, type Material, type Side } from "@/types";

const NO_EDGE = '-1';

interface Props {
	cut: Cut;
	materials: Material[];
	laminates: LaminateMaterial[];
	onChange: (patch: Partial<Cut>) => void;
	onToggle: () => void;
	onDelete: () => void;
}

export function CutItem({ cut, materials, laminates, onChange, onToggle, onDelete }: Props) {
	const { length, width, amount, colorID, grain, edges } = cut;
	const hasSize = Boolean(length && width);

	const setEdge = (side: Side, value: string) =>
		onChange({ edges: { ...edges, [side]: { enabled: value !== NO_EDGE, colorID: value } } });

	return (
		<ItemCard
			complete={hasSize}
			expanded={cut.isExpanded}
			onToggle={onToggle}
			onDelete={onDelete}
			badge={hasSize ? `${length} x ${width}` : 'Ievadiet izmērus'}
			title={
				<span className="font-semibold text-sm">
					{materials.find(m => m.id === colorID)?.colorCode}
					<span className="text-slate-400 font-normal ml-1">({amount} gab.)</span>
				</span>
			}
		>
			<div className="grid grid-cols-3 gap-4">
				<InputField label="Garums (L)" type="number" placeholder="mm" value={length} onChange={(v) => onChange({ length: toNumber(v) })} />
				<InputField label="Platums (W)" type="number" placeholder="mm" value={width} onChange={(v) => onChange({ width: toNumber(v) })} />
				<InputField label="Daudzums" type="number" value={amount} onChange={(v) => onChange({ amount: toNumber(v) })} />
			</div>

			<div className="flex gap-4 pt-2">
				<SelectField
					label="Pamatkrāsa"
					placeholder="Izvēlies krāsu"
					className={cn(!colorID && "border-red-500")}
					options={materials.map(m => ({ value: m.id, label: m.colorCode }))}
					value={colorID}
					onChange={(v) => onChange({ colorID: v })}
				/>
				<SelectField
					label="Šķiedras virziens"
					placeholder="Izvēlies virzienu"
					options={MaterialGrainDirections.map((label, i) => ({ value: String(i), label }))}
					value={grain}
					onChange={(v) => onChange({ grain: v })}
				/>
			</div>

			{laminates.some(l => l.colorCode) && (
				<div className="space-y-3">
					<Label className="text-xs uppercase text-slate-500">Malu apdare</Label>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{SIDES.map((side) => (
							<div key={side} className="flex items-center gap-4 space-y-2 p-2 border rounded-md bg-slate-50/50">
								<Label className="mb-0 text-xs uppercase text-slate-500">{SideLabels[side]}</Label>
								<SelectBox
									className="h-8 text-xs bg-white"
									placeholder="Bez apdares"
									options={[{ value: NO_EDGE, label: 'Bez apdares' }, ...laminates.map(l => ({ value: l.id, label: l.colorCode }))]}
									value={edges[side].colorID}
									onChange={(v) => setEdge(side, v)}
								/>
							</div>
						))}
					</div>
				</div>
			)}
		</ItemCard>
	);
}
