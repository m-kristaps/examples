import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, Layers, Loader2, Palette, Plus } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/Section";
import { MaterialItem } from "@/components/MaterialItem";
import { LaminateItem } from "@/components/LaminateItem";
import { CutItem } from "@/components/CutItem";
import { CutPreview } from "@/components/CutPreview";
import { buildOrder, downloadBlob, OrderError, parseOrder, validateOrder } from "@/lib/excel";
import { newCut, newLaminate, newMaterial, SIDES, type Cut, type LaminateMaterial, type Material } from "@/types";

const patchById = <T extends { id: string }>(list: T[], id: string, patch: Partial<T>) =>
	list.map(item => (item.id === id ? { ...item, ...patch } : item));

export default function App() {
	const [materials, setMaterials] = useState<Material[]>([]);
	const [laminates, setLaminates] = useState<LaminateMaterial[]>([]);
	const [cuts, setCuts] = useState<Cut[]>([]);
	const [activeCutId, setActiveCutId] = useState<string | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);

	const activeCut = cuts.find(cut => cut.id === activeCutId);

	// Materials
	const updateMaterial = (id: string, patch: Partial<Material>) => setMaterials(list => patchById(list, id, patch));
	const deleteMaterial = (id: string) => {
		// keep cuts, unset their material - turn red and block export
		setCuts(list => list.map(cut => (cut.colorID === id ? { ...cut, colorID: null } : cut)));
		setMaterials(list => list.filter(m => m.id !== id));
	};

	// Edge colours
	const updateLaminate = (id: string, patch: Partial<LaminateMaterial>) => setLaminates(list => patchById(list, id, patch));
	const deleteLaminate = (id: string) => {
		setLaminates(list => list.filter(l => l.id !== id));
		setCuts(list => list.map(cut => {
			const edges = { ...cut.edges };
			for (const side of SIDES) {
				if (edges[side].colorID === id) edges[side] = { enabled: false, colorID: null };
			}
			return { ...cut, edges };
		}));
	};

	// Cuts
	const addCut = () => {
		const cut = newCut();
		if (cuts.length === 0) {
			cut.isExpanded = true;
			setActiveCutId(cut.id);
		}
		setCuts(list => [...list, cut]);
	};
	const updateCut = (id: string, patch: Partial<Cut>) => setCuts(list => patchById(list, id, patch));
	const toggleCut = (id: string) => {
		// only one cut open at time; clicked one is shown in preview
		setCuts(list => list.map(cut => ({ ...cut, isExpanded: cut.id === id ? !cut.isExpanded : false })));
		setActiveCutId(id);
	};
	const deleteCut = (id: string) => setCuts(list => list.filter(cut => cut.id !== id));

	// Excel
	const exportToExcel = async () => {
		const error = validateOrder(materials, cuts);
		if (error) {
			toast.error(error);
			return;
		}

		setIsExporting(true);
		try {
			downloadBlob(await buildOrder(materials, laminates, cuts), 'Pasutijums.xlsx');
		} catch (err) {
			console.error("Export error", err);
			toast.error(err instanceof OrderError ? err.message : "Kļūda eksportējot failu. Pārbaudiet datus.");
		} finally {
			setIsExporting(false);
		}
	};

	const chooseImportFile = () => {
		const hasData = materials.length > 0 || laminates.length > 0 || cuts.length > 0;
		if (hasData && !window.confirm("Uzmanību! Importējot jaunu failu, esošie dati tiks dzēsti. Vai turpināt?")) return;
		fileInput.current?.click();
	};

	const importFromExcel = async (file: File) => {
		try {
			const order = await parseOrder(file);
			setMaterials(order.materials);
			setLaminates(order.laminates);
			setCuts(order.cuts);
			setActiveCutId(order.cuts[0]?.id ?? null);
			toast.success(`Ielādētas ${order.cuts.length} detaļas`);
		} catch (err) {
			console.error("Import error", err);
			toast.error(err instanceof OrderError ? err.message : "Kļūda importējot failu. Pārliecinieties vai formāts ir pareizs.");
		}
	};

	return (
		<main className="container mx-auto p-4 lg:p-10 space-y-8">
			<Dialog open={isExporting} onOpenChange={setIsExporting}>
				<DialogContent className="sm:max-w-[300px] flex flex-col items-center justify-center py-10 outline-none">
					<DialogHeader className="flex flex-col items-center">
						<DialogTitle className="text-center">Gatavo failu</DialogTitle>
						<DialogDescription className="text-center">Lūdzu uzgaidiet, tiek ģenerēts pasūtījums...</DialogDescription>
					</DialogHeader>
					<Loader2 className="mt-4 h-10 w-10 animate-spin text-green-600" />
				</DialogContent>
			</Dialog>

			<header className="flex justify-between items-center">
				<h1 className="text-4xl font-extrabold tracking-tight">Detaļu griešana</h1>
				<div className="flex gap-2">
					<input
						ref={fileInput}
						type="file"
						id="excel-import"
						className="hidden"
						accept=".xlsx"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) importFromExcel(file);
							e.target.value = '';
						}}
					/>
					<Button variant="outline" size="lg" onClick={chooseImportFile}>
						<Plus className="mr-2 h-5 w-5" />
						Importēt Excel
					</Button>
					<Button
						size="lg"
						className="bg-green-600 hover:bg-green-700"
						onClick={exportToExcel}
						disabled={isExporting || !cuts.length || !materials.length}
					>
						{isExporting
							? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Ģenerē...</>
							: <><Download className="mr-2 h-5 w-5" />Eksportēt uz ekseli</>}
					</Button>
				</div>
			</header>

			<div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
				<div className="xl:col-span-5 space-y-6">
					<Section
						icon={Palette}
						title="Materiāli (loksnes)"
						description="Ievadiet loksnes izmērus"
						addLabel="Pievienot materiālu"
						onAdd={() => setMaterials(list => [...list, newMaterial()])}
						count={materials.length}
					>
						{materials.map(material => (
							<MaterialItem
								key={material.id}
								material={material}
								onChange={(patch) => updateMaterial(material.id, patch)}
								onToggle={() => updateMaterial(material.id, { isExpanded: !material.isExpanded })}
								onDelete={() => deleteMaterial(material.id)}
							/>
						))}
					</Section>

					<Section
						icon={Palette}
						title="Malu apdare"
						description="Ievadiet apdares krāsas"
						addLabel="Pievienot krāsu"
						onAdd={() => setLaminates(list => [...list, newLaminate()])}
						count={laminates.length}
					>
						{laminates.map(laminate => (
							<LaminateItem
								key={laminate.id}
								laminate={laminate}
								onChange={(patch) => updateLaminate(laminate.id, patch)}
								onToggle={() => updateLaminate(laminate.id, { isExpanded: !laminate.isExpanded })}
								onDelete={() => deleteLaminate(laminate.id)}
							/>
						))}
					</Section>

					{materials.some(m => m.colorCode.trim() !== '') && (
						<Section
							icon={Layers}
							title="Detaļas"
							description="Pievienot informāciju par detaļām"
							addLabel="Pievienot Detaļu"
							onAdd={addCut}
							count={cuts.length}
						>
							{cuts.map(cut => (
								<CutItem
									key={cut.id}
									cut={cut}
									materials={materials}
									laminates={laminates}
									onChange={(patch) => updateCut(cut.id, patch)}
									onToggle={() => toggleCut(cut.id)}
									onDelete={() => deleteCut(cut.id)}
								/>
							))}
						</Section>
					)}
				</div>

				{activeCut && (
					<div className="xl:col-span-7 relative">
						<CutPreview cut={activeCut} laminates={laminates} />
					</div>
				)}
			</div>
		</main>
	);
}
