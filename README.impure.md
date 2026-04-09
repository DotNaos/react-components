# Impure Blocks

## Flows
- Impure blocks perform side effects and are platform-dependent.

## Requirements
- Only use in environments that provide required capabilities (e.g. Electron).
- Keep surface area small and explicit.

## UX
- Delegate UI rendering to pure blocks where possible.

## Style
- Isolate side-effectful logic from pure UI blocks.

## Data Models
- Inputs/outputs are defined by explicit APIs and events.
