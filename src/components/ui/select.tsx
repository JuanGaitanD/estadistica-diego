"use client";

import * as React from "react";
import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";

/*
 * Select dibujado con respaldo nativo (docs/05-diseno.md).
 *
 * Por debajo es un `<select>` nativo: teclado, lector de pantalla y lista
 * táctil son los de la plataforma. El control cerrado se dibuja igual en todos
 * los navegadores (`appearance: none`, borde, altura y flecha propios). La lista
 * abierta se dibuja solo donde el navegador admite `appearance: base-select`
 * (Chromium 135+); en Firefox, Safari y móviles queda la lista nativa.
 *
 * La API conserva la forma compuesta de Radix (Select, SelectTrigger,
 * SelectValue, SelectContent, SelectItem) para que los pasos no cambien:
 * `Select` lee a sus hijos y pinta un único `<select>`. Los demás componentes
 * son marcadores que no se renderizan por sí mismos.
 */

interface SelectItemData {
  value: string;
  label: React.ReactNode;
  disabled: boolean;
}

interface NativeSelectProps {
  id?: string | undefined;
  value: string;
  onValueChange: (value: string) => void;
  items: readonly SelectItemData[];
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}

/** `<select>` nativo dibujado. Úsalo directamente o a través de la API compuesta. */
function NativeSelect({
  id,
  value,
  onValueChange,
  items,
  placeholder,
  disabled,
  className,
}: NativeSelectProps) {
  // Si el valor guardado ya no está entre las opciones (p. ej. la columna dejó de ser
  // numérica), el control queda vacío en vez de mostrar la primera opción, que no es la elegida.
  const known = items.some((item) => item.value === value);
  const shownValue = known ? value : "";
  const isPlaceholder = !known && placeholder !== undefined;
  return (
    <div data-slot="select" className={cn("relative w-fit", className)}>
      <select
        id={id}
        data-slot="select-trigger"
        data-placeholder={isPlaceholder ? "" : undefined}
        value={shownValue}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        className="sl-select border-input bg-card text-foreground hover:border-muted-foreground disabled:bg-secondary disabled:text-muted-foreground data-[placeholder]:text-muted-foreground h-11 w-full min-w-0 cursor-pointer appearance-none rounded-md border py-1 pr-10 pl-3 text-base transition-[border-color] duration-[120ms] ease-[cubic-bezier(0.22,1,0.36,1)] disabled:cursor-not-allowed motion-reduce:transition-none"
      >
        {placeholder !== undefined ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : !known ? (
          <option value="" disabled hidden />
        ) : null}
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  );
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function Select({ value, onValueChange, disabled, children }: SelectProps) {
  const childList = React.Children.toArray(children).filter(React.isValidElement);
  const trigger = childList.find((child) => child.type === SelectTrigger) as
    React.ReactElement<SelectTriggerProps> | undefined;
  const content = childList.find((child) => child.type === SelectContent) as
    React.ReactElement<SelectContentProps> | undefined;

  const valueNode = React.Children.toArray(trigger?.props.children)
    .filter(React.isValidElement)
    .find((child) => child.type === SelectValue) as
    React.ReactElement<SelectValueProps> | undefined;
  const placeholder = valueNode?.props.placeholder;

  const items: SelectItemData[] = [];
  React.Children.toArray(content?.props.children).forEach((child) => {
    if (!React.isValidElement(child) || child.type !== SelectItem) return;
    const props = (child as React.ReactElement<SelectItemProps>).props;
    items.push({ value: props.value, label: props.children, disabled: props.disabled === true });
  });

  return (
    <NativeSelect
      id={trigger?.props.id}
      className={trigger?.props.className}
      value={value}
      onValueChange={onValueChange}
      items={items}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

interface SelectTriggerProps {
  id?: string;
  className?: string;
  children?: React.ReactNode;
}
/** Marcador: aporta `id` y `className` al `<select>` que pinta `Select`. */
function SelectTrigger(props: SelectTriggerProps) {
  void props;
  return null;
}

interface SelectValueProps {
  placeholder?: string;
}
/** Marcador: aporta el texto de la opción vacía deshabilitada. */
function SelectValue(props: SelectValueProps) {
  void props;
  return null;
}

interface SelectContentProps {
  children?: React.ReactNode;
}
/** Marcador: agrupa los `SelectItem`. */
function SelectContent(props: SelectContentProps) {
  void props;
  return null;
}

interface SelectItemProps {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;
}
/** Marcador: cada uno se vuelve una `<option>`. */
function SelectItem(props: SelectItemProps) {
  void props;
  return null;
}

export { NativeSelect, Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
