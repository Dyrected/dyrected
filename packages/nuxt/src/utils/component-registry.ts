import { existsSync, readdirSync } from "fs";
import { basename, extname, join } from "path";

/** Registries a `components/dyrected/<registry>/` directory may populate. */
export const COMPONENT_REGISTRIES = [
  "fields",
  "dashboard",
  "collectionList",
  "collectionView",
  "forms",
  "viewLayouts",
  "pages",
  "customComponents",
] as const;

export type ComponentRegistryName = (typeof COMPONENT_REGISTRIES)[number];

export interface DiscoveredComponent {
  registry: ComponentRegistryName;
  /** Registry key: the file name without its `.vue` extension. */
  key: string;
  /** Absolute path to the component file. */
  filePath: string;
}

/**
 * Scans `<dir>/<registry>/<key>.vue` and returns every component found.
 * Unknown registry folders are ignored, and results are sorted so generated
 * output is stable between builds.
 */
export function discoverComponents(dir: string): DiscoveredComponent[] {
  if (!existsSync(dir)) return [];

  const found: DiscoveredComponent[] = [];
  for (const registry of COMPONENT_REGISTRIES) {
    const registryDir = join(dir, registry);
    if (!existsSync(registryDir)) continue;
    for (const file of readdirSync(registryDir).sort()) {
      if (extname(file) !== ".vue") continue;
      found.push({
        registry,
        key: basename(file, ".vue"),
        filePath: join(registryDir, file),
      });
    }
  }
  return found;
}

/** Builds the source of the generated registry module. */
export function renderComponentRegistry(components: DiscoveredComponent[]): string {
  const imports: string[] = [];
  const groups = new Map<string, string[]>();

  components.forEach((component, index) => {
    const id = `C${index}`;
    imports.push(`import ${id} from ${JSON.stringify(component.filePath)};`);
    const entries = groups.get(component.registry) ?? [];
    entries.push(`  ${JSON.stringify(component.key)}: ${id},`);
    groups.set(component.registry, entries);
  });

  const body = [...groups.entries()]
    .map(([registry, entries]) => `${JSON.stringify(registry)}: {\n${entries.join("\n")}\n}`)
    .join(",\n");

  return `${imports.join("\n")}\n\nexport default {\n${body}\n};\n`;
}
