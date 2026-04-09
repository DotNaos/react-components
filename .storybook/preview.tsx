import type { Preview } from "@storybook/react-vite";
import { ThemeProvider } from "@dotnaos/react-ui";
import "../stories/storybook.css";

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider
        defaultTheme="dark"
        storageKey="storybook-react-components-theme"
      >
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
