import {
    type Settings,
    type SettingsKey,
    settingsRegistry,
} from "./registry";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import {
    Card,
    Heading,
    Icon,
    Stack,
    Text
} from "@dotnaos/react-ui";

export interface SettingsViewProps {
  settings: Partial<Settings>;
  onChange: (key: SettingsKey, value: any) => void;
  categories: Record<string, SettingsKey[]>;
  categoryLabels?: Record<string, string>;
  /** Optional slot for injecting custom auth UI */
  authSlot?: ReactNode;
}

// Simple Input for now (until we move Input to ui/primitives)
function SimpleInput({
  value,
  onChange,
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    />
  );
}

// Simple Toggle using primitives (rudimentary for now)
function SimpleToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-accent" : "bg-bg-1 border-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-text shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// Simple Select
function SimpleSelect({
  value,
  options,
  optionLabels,
  onChange,
}: {
  value: string;
  options: string[];
  optionLabels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((option) => {
        const isSelected = value === option;
        const label = optionLabels?.[option] ?? option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              isSelected
                ? "bg-accent text-bg-0 border-accent"
                : "bg-bg-2 border-border hover:bg-bg-1"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsView({
  settings,
  onChange,
  categories,
  categoryLabels = {},
  authSlot,
}: SettingsViewProps) {
  const renderInput = (key: SettingsKey) => {
    const def = settingsRegistry[key];
    const value = settings[key] ?? def.default;

    if (def.ui === "toggle") {
      return (
        <SimpleToggle checked={value as boolean} onChange={(v) => onChange(key, v)} />
      );
    }

    if (def.ui === "select" && def.options) {
      return (
        <SimpleSelect
          value={value as string}
          options={def.options as string[]}
          optionLabels={def.optionLabels}
          onChange={(v) => onChange(key, v)}
        />
      );
    }

    if (def.ui === "password") {
      return (
        <div className="relative w-72">
          <SimpleInput
            type="password"
            value={value as string}
            onChange={(v) => onChange(key, v)}
            className="w-full pr-10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <Icon name={Lock} size="s" />
          </span>
        </div>
      );
    }

    // Default text
    return (
      <SimpleInput
        value={value as string}
        onChange={(v) => onChange(key, v)}
        className="w-72"
      />
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-4">
      {/* Auth Slot (Account & Sync) */}
      {authSlot}

      {/* Generated Settings */}
      {Object.entries(categories).map(([category, keys]) => (
        <Card key={category} padding={4} radius={2}>
          <Stack gap={4}>
            <Heading level={3} className="capitalize">{categoryLabels[category] ?? category}</Heading>

            <Stack gap={4}>
              {keys.map((key) => {
                const def = settingsRegistry[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Text size="m" className="font-medium">
                        {def.label}
                      </Text>
                      <Text size="s" color="muted">
                        {def.description}
                      </Text>
                    </div>
                    <div>{renderInput(key)}</div>
                  </div>
                );
              })}
            </Stack>
          </Stack>
        </Card>
      ))}
    </div>
  );
}
