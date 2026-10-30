import { ItemCard } from "@/components/ItemCard";
import { InputField, SelectField } from "@/components/Field";
import { LaminateMaterialThicknesses, LaminateMaterialTypes, LaminateMaterialWidths, type LaminateMaterial } from "@/types";

interface Props {
	laminate: LaminateMaterial;
	onChange: (patch: Partial<LaminateMaterial>) => void;
	onToggle: () => void;
	onDelete: () => void;
}

export function LaminateItem({ laminate, onChange, onToggle, onDelete }: Props) {
	const { colorCode, type, width, thickness } = laminate;

	return (
		<ItemCard
			complete={Boolean(colorCode)}
			expanded={laminate.isExpanded}
			onToggle={onToggle}
			onDelete={onDelete}
			badge={`${width} x ${thickness}`}
			title={<>
				<div className="font-semibold text-sm">{colorCode}</div>
				<div className="font-semibold text-sm">{type}</div>
			</>}
		>
			<div className="flex items-end gap-4 pt-2">
				<InputField label="Krāsas kods" placeholder="piem., w960" value={colorCode} onChange={(v) => onChange({ colorCode: v })} />
				<SelectField label="Tips" placeholder="Izvēlies tipu" options={LaminateMaterialTypes} value={type} onChange={(v) => onChange({ type: v })} />
			</div>
			<div className="flex items-end gap-4 pt-2">
				<SelectField label="Platums" placeholder="Izvēlies platumu" options={LaminateMaterialWidths} value={width} onChange={(v) => onChange({ width: v })} />
				<SelectField label="Biezums" placeholder="Izvēlies biezumu" options={LaminateMaterialThicknesses} value={thickness} onChange={(v) => onChange({ thickness: v })} />
			</div>
		</ItemCard>
	);
}
