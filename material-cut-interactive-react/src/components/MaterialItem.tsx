import { ItemCard } from "@/components/ItemCard";
import { InputField, SelectField } from "@/components/Field";
import { toNumber } from "@/lib/utils";
import { MaterialThicknesses, MaterialTypes, type Material } from "@/types";

interface Props {
	material: Material;
	onChange: (patch: Partial<Material>) => void;
	onToggle: () => void;
	onDelete: () => void;
}

export function MaterialItem({ material, onChange, onToggle, onDelete }: Props) {
	const { colorCode, type, length, width, thickness } = material;
	const hasSize = Boolean(length && width);

	return (
		<ItemCard
			complete={hasSize}
			expanded={material.isExpanded}
			onToggle={onToggle}
			onDelete={onDelete}
			badge={hasSize ? `${length} x ${width} x ${thickness}` : 'Ievadiet izmērus'}
			title={<>
				<div className="font-semibold text-sm">{colorCode}</div>
				<div className="font-semibold text-sm">{type}</div>
			</>}
		>
			<div className="flex items-end gap-4 pt-2">
				<InputField label="Krāsas kods" placeholder="piem., w960" value={colorCode} onChange={(v) => onChange({ colorCode: v })} />
				<InputField label="Garums" type="number" placeholder="mm" value={length} onChange={(v) => onChange({ length: toNumber(v) })} />
				<InputField label="Platums" type="number" placeholder="mm" value={width} onChange={(v) => onChange({ width: toNumber(v) })} />
			</div>
			<div className="flex gap-4 pt-2">
				<SelectField label="Tips" placeholder="Izvēlies tipu" options={MaterialTypes} value={type} onChange={(v) => onChange({ type: v })} />
				<SelectField label="Biezums" placeholder="Izvēlies biezumu" options={MaterialThicknesses} value={thickness} onChange={(v) => onChange({ thickness: v })} />
			</div>
		</ItemCard>
	);
}
