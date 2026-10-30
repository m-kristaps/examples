export type Side = 'top' | 'bottom' | 'left' | 'right';
export const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];

export interface Edge {
	enabled: boolean;
	colorID: string | null;
}

export interface Cut {
	id: string;
	length: number | null;
	width: number | null;
	colorID: string | null;
	grain: string;
	amount: number | null;
	edges: Record<Side, Edge>;
	isExpanded: boolean;
}

export interface Material {
	id: string;
	colorCode: string;
	type: string;
	length: number | null;
	width: number | null;
	thickness: string;
	isExpanded: boolean;
}

export interface LaminateMaterial {
	id: string;
	colorCode: string;
	type: string;
	width: string;
	thickness: string;
	isExpanded: boolean;
}

export const MaterialTypes = ['HPL', 'LDF', 'HDF', 'LKSP', 'MDF', 'Akrils', 'KSP', 'Plywood', 'OSB'];
export const MaterialThicknesses = ['3', '6', '8', '10', '12', '16', '18', '19', '22', '25', '28', '38'];
export const MaterialGrainDirections = ['0 — Bez šķiedras', '1 — Šķiedra garumā (Horizontāli)', '2 — Šķiedra platumā (Vertikāli)'];
export const LaminateMaterialTypes = ['ABS', 'PVC', 'HPL', 'AKRILS', 'KOKS'];
export const LaminateMaterialWidths = ['23', '28', '42'];
export const LaminateMaterialThicknesses = ['0,3', '0,6', '0,8', '1', '1,3', '1,5', '2', '2,5', '3'];

export const SideLabels: Record<Side, string> = {
	top: 'Augšējā mala',
	bottom: 'Apakšējā mala',
	left: 'Kreisā mala',
	right: 'Labā mala',
};

const noEdge = (): Edge => ({ enabled: false, colorID: null });

export const newCut = (): Cut => ({
	id: crypto.randomUUID(),
	length: null,
	width: null,
	colorID: null,
	grain: '0',
	amount: 1,
	edges: { top: noEdge(), bottom: noEdge(), left: noEdge(), right: noEdge() },
	isExpanded: false,
});

export const newMaterial = (): Material => ({
	id: crypto.randomUUID(),
	colorCode: '',
	type: MaterialTypes[0],
	length: null,
	width: null,
	thickness: MaterialThicknesses[0],
	isExpanded: true,
});

export const newLaminate = (): LaminateMaterial => ({
	id: crypto.randomUUID(),
	colorCode: '',
	type: LaminateMaterialTypes[0],
	width: LaminateMaterialWidths[0],
	thickness: LaminateMaterialThicknesses[0],
	isExpanded: true,
});
