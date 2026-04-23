import { describe, expect, it } from "vitest";
import { createPropInstancer } from "../../src/render/prop-instancer";
import type { AssetCatalog } from "../../src/engine/assets";

const noCatalog = null;

describe("prop instancer", () => {
  it("groups same propId instances into a single InstancedMesh (procedural fallback)", () => {
    const instancer = createPropInstancer(noCatalog);
    instancer.addInstance("mailbox", [0, 0, 0], 0, "small");
    instancer.addInstance("mailbox", [5, 0, 0], 0.2, "small");
    instancer.addInstance("bin",     [0, 0, 5], 0, "medium");
    const group = instancer.build();
    const meshes = group.children.filter((c) => c.type === "Mesh" || c.type === "InstancedMesh");
    expect(meshes.length).toBe(2);
  });

  it("uses catalog geometry when an asset is registered for the propId", () => {
    // Minimal fake catalog — only getMesh + getMaterial matter here.
    const fakeCatalog = {
      registerGLB: () => {},
      loadAll: async () => {},
      getMesh: (id: string) => (id === "prop:mailbox" ? new (require("three")).SphereGeometry(0.1) : null),
      getMaterial: (id: string) => (id === "prop:mailbox" ? new (require("three")).MeshStandardMaterial() : null),
      dispose: () => {}
    } as unknown as AssetCatalog;

    const instancer = createPropInstancer(fakeCatalog);
    instancer.addInstance("mailbox", [0, 0, 0], 0, "small");
    const group = instancer.build();
    const instanced = group.children[0] as import("three").InstancedMesh;
    expect(instanced.geometry.type).toBe("SphereGeometry");
  });
});
