declare module "@dotnaos/react-ui" {
  import * as React from "react";

  export const cn: (...inputs: unknown[]) => string;
  export const Center: React.ComponentType<any>;
  export const Heading: React.ComponentType<any>;
  export const Icon: React.ComponentType<any>;
  export const FileIcon: React.ComponentType<any>;
  export const Stack: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const Card: React.ComponentType<any>;
  export const ThemeProvider: React.ComponentType<any>;
}

declare module "@dotnaos/react-ui/shadcn" {
  import * as React from "react";

  export const Accordion: React.ComponentType<any>;
  export const AccordionContent: React.ComponentType<any>;
  export const AccordionItem: React.ComponentType<any>;
  export const Button: React.ComponentType<any>;
}

declare module "@dotnaos/react-ui/tokens.css";
declare module "@dotnaos/react-ui/tailwind-theme.css";
declare module "@dotnaos/react-ui/styles.css";
