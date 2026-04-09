export type SettingUIType = "text" | "password" | "toggle" | "number" | "select";

export interface SettingDefinition<T = unknown> {
  default: T;
  type: "string" | "boolean" | "number";
  label: string;
  description: string;
  ui: SettingUIType;
  options?: T[];
  optionLabels?: Record<string, string>;
  isSecret?: boolean;
}

export const API_ENDPOINTS = {
  local: "http://localhost:3333/api",
  remote: "https://study-sync.aryazos.ch/api"
} as const;

export const settingsRegistry = {
  "sync.apiUrl": {
    default: API_ENDPOINTS.remote,
    type: "string" as const,
    label: "API",
    description: "Choose local (development) or remote (production) API",
    ui: "select" as const,
    options: [API_ENDPOINTS.local, API_ENDPOINTS.remote] as string[],
    optionLabels: {
      [API_ENDPOINTS.local]: "Local (localhost:3333)",
      [API_ENDPOINTS.remote]: "Remote (study-sync.aryazos.ch)"
    } as Record<string, string>
  },
  "sync.useLocalApi": {
    default: false as boolean,
    type: "boolean" as const,
    label: "Use Local API",
    description: "Use local Study Sync server instead of remote",
    ui: "toggle" as const
  },
  "sync.autoConnect": {
    default: true,
    type: "boolean" as const,
    label: "Auto Connect",
    description: "Automatisch mit Sync verbinden beim Start",
    ui: "toggle" as const
  },
  "canvas.straightLineDetection": {
    default: true,
    type: "boolean" as const,
    label: "Straight Line Detection",
    description: "Erkennt gerade Linien beim Zeichnen und korrigiert sie",
    ui: "toggle" as const
  },
  "git.repoUrl": {
    default: "",
    type: "string" as const,
    label: "Repository URL",
    description: "Git Repository URL für Backup (z.B. GitHub)",
    ui: "text" as const
  },
  "git.token": {
    default: "",
    type: "string" as const,
    label: "Personal Access Token",
    description: "Token für Git Push (wird sicher im System-Keychain gespeichert)",
    ui: "password" as const,
    isSecret: true
  }
} as const;

export type SettingsKey = keyof typeof settingsRegistry;

type WidenLiteral<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T;

export type Settings = {
  [K in SettingsKey]: WidenLiteral<(typeof settingsRegistry)[K]["default"]>;
};
