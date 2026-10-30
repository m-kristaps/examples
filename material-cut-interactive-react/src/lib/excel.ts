import type { Cut, LaminateMaterial, Material, Side } from "@/types";

// row layout - public/order.xlsx
const LAM_START = 6, LAM_MAX = 100;
const MAT_START = 108, MAT_MAX = 100;
const CUT_START = 214, CUT_MAX = 900;
// excel edge columns
const EDGE_COLUMNS: [Side, string][] = [['bottom', 'G'], ['top', 'H'], ['left', 'I'], ['right', 'J']];

export class OrderError extends Error {}

const loadExcel = async () => (await import('exceljs')).default;

export function validateOrder(materials: Material[], cuts: Cut[]): string | null {
	const badCut = cuts.findIndex(cut => !cut.length || !cut.width || !cut.amount || !materials.some(m => m.id === cut.colorID));
	if (badCut !== -1) return `Detaļai #${badCut + 1} trūkst izmēru, daudzuma vai materiāla`;

	const badMaterial = materials.findIndex(m => !m.colorCode || !m.length || !m.width);
	if (badMaterial !== -1) return `Materiālam #${badMaterial + 1} trūkst krāsas koda vai izmēru`;

	return null;
}

export async function buildOrder(materials: Material[], laminates: LaminateMaterial[], cuts: Cut[]): Promise<Blob> {
	const response = await fetch('/order.xlsx');
	if (!response.ok || response.headers.get('content-type')?.includes('html')) {
		throw new OrderError('Nav atrasta pasūtījuma veidne (public/order.xlsx)');
	}

	const ExcelJS = await loadExcel();
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(await response.arrayBuffer());
	const worksheet = workbook.getWorksheet(1);
	if (!worksheet) throw new Error('Template has no worksheet');

	// hide unused rows instead of clearing them: first row of each section holds "master" shared formula. Editing it causes "Master must exist" error
	const hideUnused = (start: number, max: number, used: number) => {
		for (let i = Math.max(used, 1); i < max; i++) {
			worksheet.getRow(start + i).hidden = true;
		}
	};

	const dateCell = worksheet.getCell('C3');
	dateCell.value = new Date();
	dateCell.numFmt = '[$-lv-LV]dddd, yyyy". gada "d. mmmm';

	laminates.forEach((lam, index) => {
		const row = worksheet.getRow(LAM_START + index);
		row.getCell('A').value = index + 1;
		row.getCell('B').value = lam.type;
		row.getCell('C').value = lam.colorCode;
		row.getCell('F').value = parseInt(lam.width);
		row.getCell('H').value = parseFloat(lam.thickness.replace(',', '.'));
	});
	hideUnused(LAM_START, LAM_MAX, laminates.length);

	materials.forEach((mat, index) => {
		const row = worksheet.getRow(MAT_START + index);
		row.getCell('A').value = index + 1;
		row.getCell('B').value = mat.type;
		row.getCell('C').value = mat.colorCode;
		row.getCell('E').value = mat.length;
		row.getCell('G').value = mat.width;
		row.getCell('H').value = parseFloat(mat.thickness.replace(',', '.'));
	});
	hideUnused(MAT_START, MAT_MAX, materials.length);

	cuts.forEach((cut, index) => {
		const row = worksheet.getRow(CUT_START + index);
		row.getCell('A').value = index + 1;
		row.getCell('B').value = materials.findIndex(m => m.id === cut.colorID) + 1;
		row.getCell('C').value = cut.length;
		row.getCell('D').value = cut.width;
		row.getCell('E').value = Number(cut.amount);
		row.getCell('F').value = parseInt(cut.grain); // šķiedra

		for (const [side, column] of EDGE_COLUMNS) {
			const edge = cut.edges[side];
			const lamIndex = edge.enabled ? laminates.findIndex(l => l.id === edge.colorID) : -1;
			row.getCell(column).value = lamIndex !== -1 ? lamIndex + 1 : '';
		}
	});
	hideUnused(CUT_START, CUT_MAX, cuts.length);

	const buffer = await workbook.xlsx.writeBuffer();
	return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function parseOrder(file: File): Promise<{ materials: Material[]; laminates: LaminateMaterial[]; cuts: Cut[] }> {
	const ExcelJS = await loadExcel();
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(await file.arrayBuffer());
	const worksheet = workbook.getWorksheet(1);
	if (!worksheet) throw new Error('Worksheet not found');

	let rowMaterials = -1;
	let rowCNC = -1;
	worksheet.eachRow((row, rowNumber) => {
		const cellA = row.getCell('A').value?.toString().trim();
		if (cellA === 'Materiāls') rowMaterials = rowNumber;
		if (cellA === 'CNC, Urbšana') rowCNC = rowNumber;
	});
	if (rowMaterials === -1 || rowCNC === -1) {
		throw new OrderError("Trūkst atslēgvārdi 'Materiāls' vai 'CNC, Urbšana'");
	}

	const text = (row: number, col: string) => worksheet.getRow(row).getCell(col).value?.toString();

	const laminates: LaminateMaterial[] = [];
	for (let i = LAM_START; i < rowMaterials; i++) {
		const colorCode = text(i, 'C');
		if (!colorCode) continue;
		laminates.push({
			id: crypto.randomUUID(),
			type: text(i, 'B') || 'ABS',
			colorCode,
			width: text(i, 'F') || '23',
			thickness: text(i, 'H')?.replace('.', ',') || '2',
			isExpanded: false,
		});
	}

	const materials: Material[] = [];
	for (let i = rowMaterials + 2; i < rowCNC; i++) {
		const colorCode = text(i, 'C');
		if (!colorCode) continue;
		materials.push({
			id: crypto.randomUUID(),
			type: text(i, 'B') || 'LKSP',
			colorCode,
			length: Number(text(i, 'E')) || null,
			width: Number(text(i, 'G')) || null,
			thickness: text(i, 'H')?.replace('.', ',') || '18',
			isExpanded: false,
		});
	}

	const lamId = (row: number, col: string) => laminates[parseInt(text(row, col) ?? '') - 1]?.id ?? null;

	const cuts: Cut[] = [];
	for (let i = rowCNC + 6; i <= 2000; i++) {
		const row = worksheet.getRow(i);
		const matRef = row.getCell('B').value;
		if (!matRef) break;

		const edges = {} as Cut['edges'];
		for (const [side, column] of EDGE_COLUMNS) {
			edges[side] = { enabled: !!row.getCell(column).value, colorID: lamId(i, column) };
		}

		cuts.push({
			id: crypto.randomUUID(),
			length: Number(row.getCell('C').value),
			width: Number(row.getCell('D').value),
			amount: Number(row.getCell('E').value) || 1,
			grain: text(i, 'F') || '0',
			colorID: materials[Number(matRef) - 1]?.id ?? null,
			edges,
			isExpanded: cuts.length === 0,
		});
	}

	return { materials, laminates, cuts };
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000); // safari fix
}
