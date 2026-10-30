import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const labelClass = "text-xs uppercase text-slate-500";

export function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
	return (
		<div className={cn("space-y-2 flex-1", className)}>
			<Label className={labelClass}>{label}</Label>
			{children}
		</div>
	);
}

export function InputField({ label, value, onChange, className, ...props }: {
	label: string;
	value: string | number | null;
	onChange: (value: string) => void;
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange'>) {
	return (
		<Field label={label}>
			<Input
				className={cn("w-full h-9", !value && "border-red-500", className)}
				value={value ?? ''}
				onChange={(e) => onChange(e.target.value)}
				{...props}
			/>
		</Field>
	);
}

export type Option = string | { value: string; label: string };

export function SelectBox({ value, onChange, options, placeholder, className }: {
	value: string | null;
	onChange: (value: string) => void;
	options: Option[];
	placeholder?: string;
	className?: string;
}) {
	return (
		<Select value={value ?? ''} onValueChange={onChange}>
			<SelectTrigger className={cn("w-full h-9", className)}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((o) => {
					const { value, label } = typeof o === 'string' ? { value: o, label: o } : o;
					return <SelectItem key={value} value={value}>{label}</SelectItem>;
				})}
			</SelectContent>
		</Select>
	);
}

export function SelectField({ label, ...props }: { label: string } & ComponentProps<typeof SelectBox>) {
	return (
		<Field label={label}>
			<SelectBox {...props} />
		</Field>
	);
}
