"""Shared helpers for generating clean-room RC racer props in Blender."""
from __future__ import annotations

import os
import bpy


def reset_scene() -> None:
    """Clear the default cube + lights so each script starts clean."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.length_unit = "METERS"


def add_simple_pbr_material(name: str, base_color_hex: str, roughness: float, metallic: float = 0.0) -> bpy.types.Material:
    """Create a PBR material with a named tint. Clean-room — no texture images, only procedural tint."""
    r = int(base_color_hex[1:3], 16) / 255.0
    g = int(base_color_hex[3:5], 16) / 255.0
    b = int(base_color_hex[5:7], 16) / 255.0
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (r, g, b, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def uv_smart_project(obj: bpy.types.Object) -> None:
    """Smart-UV-unwrap an object so baked AO has sane seams."""
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")


def export_glb(obj: bpy.types.Object, out_path: str) -> None:
    """Export a single object as `.glb`."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_draco_mesh_compression_enable=False,
        export_animations=False,
        export_lights=False,
        export_cameras=False
    )
    print(f"[blender] wrote {out_path}")
