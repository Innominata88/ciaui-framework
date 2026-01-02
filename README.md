# CIAUI Framework

**WebGPU-native, WebXR-first adaptive UI framework for collaborative immersive analytics**

> ⚠️ **Early Development** - This framework is in active development. APIs will change.

## Vision

CIAUI enables building user interfaces that work seamlessly across desktop and immersive VR/AR environments from a single component definition. Designed specifically for scientific data visualization and collaborative analysis.

## Key Features

- **Adaptive Components** - One definition renders appropriately in desktop or VR
- **WebGPU-native** - Modern GPU rendering with WebGL2 fallback
- **WebXR-first** - VR/AR is core architecture, not bolted on
- **Collaboration-ready** - Built-in presence, shared state, audit trails
- **React-like DX** - Familiar hooks and component model

## Quick Start

```bash
# Clone the repo
git clone https://github.com/your-org/ciaui-framework

# Install dependencies
npm install

# Run hello-world example
npm run dev
```

## Core Concept: Adaptive Components

```typescript
import { adaptive, useState } from '@ciaui/core';

const Button = adaptive({
  name: 'Button',
  
  props: {
    label: String,
    onClick: Function,
  },
  
  setup(props) {
    const [hovered, setHovered] = useState(false);
    return { hovered, setHovered };
  },
  
  // Desktop: renders to DOM
  desktop({ props, state, tokens }) {
    return (
      <button 
        style={{ height: tokens.buttonHeight.md }}
        onClick={props.onClick}
      >
        {props.label}
      </button>
    );
  },
  
  // Immersive: renders to 3D
  immersive({ props, state, tokens }) {
    return (
      <Box 
        height={tokens.buttonHeight.md}
        onSelect={props.onClick}
      >
        <Text>{props.label}</Text>
      </Box>
    );
  },
});
```

## Packages

| Package | Description |
|---------|-------------|
| `@ciaui/core` | Adaptive components, hooks, tokens |
| `@ciaui/render-webgpu` | WebGPU renderer |
| `@ciaui/render-dom` | DOM renderer (coming soon) |
| `@ciaui/xr` | WebXR integration (coming soon) |
| `@ciaui/collab` | Collaboration primitives (coming soon) |

## Project Structure

```
ciaui-framework/
├── packages/
│   ├── core/           # Adaptive component system
│   ├── render-webgpu/  # WebGPU rendering
│   ├── render-dom/     # DOM rendering (planned)
│   ├── xr/             # WebXR integration (planned)
│   └── collab/         # Collaboration (planned)
├── examples/
│   └── hello-world/    # Basic WebGPU test
└── docs/               # Documentation
```

## Development

```bash
# Type check
npm run typecheck

# Build all packages
npm run build

# Run specific example
cd examples/hello-world
npm run dev
```

## Browser Support

- **WebGPU**: Chrome 113+, Edge 113+, Firefox (behind flag)
- **WebXR**: Chrome, Edge, Oculus Browser, Safari (Vision Pro)

## Roadmap

- [x] Core reactive system (signals, effects)
- [x] Adaptive component wrapper
- [x] Token system
- [x] WebGPU quad renderer
- [ ] Text rendering (SDF)
- [ ] WebXR session management
- [ ] VR primitives (Box, Text, Panel)
- [ ] Hit testing / pointer events
- [ ] DOM renderer
- [ ] Collaboration hooks
- [ ] Component library

## License

MIT © 2025

---

*Part of the CIA Web (Collaborative Immersive Analytics) project*
