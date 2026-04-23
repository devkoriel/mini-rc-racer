"""Generate pickup geometry. Phase 1 ships only Spark Burst."""
from __future__ import annotations

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import bpy  # noqa: E402
from _lib import reset_scene, add_simple_pbr_material, uv_smart_project, export_glb  # noqa: E402

OUT_DIR = os.environ.get("RC_ASSETS_OUT", os.path.join(SCRIPT_DIR, "..", "..", "public", "content", "meshes", "pickups"))


def spark_burst() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.22)
    obj = bpy.context.active_object
    obj.location = (0, 0, 0.3)
    bpy.ops.object.transform_apply(location=True)
    obj.name = "spark_burst"
    mat = add_simple_pbr_material("SparkBurst", "#ffd24a", roughness=0.15, metallic=0.2)
    obj.data.materials.append(mat)
    # emissive shove so it glows
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Emission Color"].default_value = (1.0, 0.78, 0.18, 1.0)
    bsdf.inputs["Emission Strength"].default_value = 2.5
    uv_smart_project(obj)
    export_glb(obj, os.path.join(OUT_DIR, "spark_burst.glb"))


if __name__ == "__main__":
    spark_burst()
    print("[blender] pickup build complete")
