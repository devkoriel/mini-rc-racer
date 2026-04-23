"""Generate low-poly neighborhood props for Phase 1. Clean-room — all geometry authored here, nothing traced."""
from __future__ import annotations

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import bpy  # noqa: E402
from _lib import reset_scene, add_simple_pbr_material, uv_smart_project, export_glb  # noqa: E402

OUT_DIR = os.environ.get("RC_ASSETS_OUT", os.path.join(SCRIPT_DIR, "..", "..", "public", "content", "meshes", "props"))


def mailbox() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cube_add(size=1)
    post = bpy.context.active_object
    post.scale = (0.04, 0.04, 0.35)
    post.location = (0, 0, 0.35)
    bpy.ops.object.transform_apply(location=True, scale=True)
    mat_post = add_simple_pbr_material("MailboxPost", "#5a5450", roughness=0.9)
    post.data.materials.append(mat_post)

    bpy.ops.mesh.primitive_cube_add(size=1)
    body = bpy.context.active_object
    body.scale = (0.15, 0.25, 0.12)
    body.location = (0, 0, 0.8)
    bpy.ops.object.transform_apply(location=True, scale=True)
    mat_body = add_simple_pbr_material("MailboxBody", "#6a5e4a", roughness=0.7)
    body.data.materials.append(mat_body)

    bpy.ops.object.select_all(action="DESELECT")
    post.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "mailbox"
    uv_smart_project(joined)
    export_glb(joined, os.path.join(OUT_DIR, "mailbox.glb"))


def bin_trash() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cylinder_add(radius=0.2, depth=0.6, vertices=16)
    obj = bpy.context.active_object
    obj.location = (0, 0, 0.3)
    bpy.ops.object.transform_apply(location=True)
    obj.name = "bin"
    mat = add_simple_pbr_material("BinBody", "#30322e", roughness=0.6, metallic=0.1)
    obj.data.materials.append(mat)
    uv_smart_project(obj)
    export_glb(obj, os.path.join(OUT_DIR, "bin.glb"))


def cone() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cone_add(radius1=0.14, depth=0.32, vertices=12)
    obj = bpy.context.active_object
    obj.location = (0, 0, 0.16)
    bpy.ops.object.transform_apply(location=True)
    obj.name = "cone"
    mat = add_simple_pbr_material("ConeOrange", "#d35a1a", roughness=0.5)
    obj.data.materials.append(mat)
    uv_smart_project(obj)
    export_glb(obj, os.path.join(OUT_DIR, "cone.glb"))


def fence_post() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.active_object
    obj.scale = (0.04, 0.04, 0.6)
    obj.location = (0, 0, 0.6)
    bpy.ops.object.transform_apply(location=True, scale=True)
    obj.name = "fence_post"
    mat = add_simple_pbr_material("FenceWood", "#9a6e3c", roughness=0.95)
    obj.data.materials.append(mat)
    uv_smart_project(obj)
    export_glb(obj, os.path.join(OUT_DIR, "fence_post.glb"))


def tree_conifer() -> None:
    reset_scene()
    # stub trunk
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.6, vertices=10)
    trunk = bpy.context.active_object
    trunk.location = (0, 0, 0.3)
    mat_t = add_simple_pbr_material("Trunk", "#5b3a20", roughness=0.95)
    trunk.data.materials.append(mat_t)
    bpy.ops.object.transform_apply(location=True)
    # cone canopy
    bpy.ops.mesh.primitive_cone_add(radius1=0.7, radius2=0.0, depth=1.8, vertices=10)
    canopy = bpy.context.active_object
    canopy.location = (0, 0, 1.5)
    bpy.ops.object.transform_apply(location=True)
    mat_c = add_simple_pbr_material("Canopy", "#3a7a48", roughness=1.0)
    canopy.data.materials.append(mat_c)

    bpy.ops.object.select_all(action="DESELECT")
    trunk.select_set(True)
    canopy.select_set(True)
    bpy.context.view_layer.objects.active = canopy
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "tree_conifer"
    uv_smart_project(joined)
    export_glb(joined, os.path.join(OUT_DIR, "tree_conifer.glb"))


def street_light() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cube_add(size=1)
    post = bpy.context.active_object
    post.scale = (0.04, 0.04, 1.6)
    post.location = (0, 0, 1.6)
    bpy.ops.object.transform_apply(location=True, scale=True)
    post.name = "street_light"
    mat = add_simple_pbr_material("LampPost", "#7a7a7a", roughness=0.55, metallic=0.3)
    post.data.materials.append(mat)
    uv_smart_project(post)
    export_glb(post, os.path.join(OUT_DIR, "street_light.glb"))


def parked_sedan() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cube_add(size=1)
    body = bpy.context.active_object
    body.scale = (0.95, 1.9, 0.6)
    body.location = (0, 0, 0.45)
    bpy.ops.object.transform_apply(location=True, scale=True)
    body.name = "parked_sedan"
    mat = add_simple_pbr_material("SedanPaint", "#184468", roughness=0.35, metallic=0.6)
    body.data.materials.append(mat)
    uv_smart_project(body)
    export_glb(body, os.path.join(OUT_DIR, "parked_sedan.glb"))


def house_block() -> None:
    reset_scene()
    bpy.ops.mesh.primitive_cube_add(size=1)
    walls = bpy.context.active_object
    walls.scale = (2.0, 1.5, 1.1)
    walls.location = (0, 0, 1.1)
    bpy.ops.object.transform_apply(location=True, scale=True)
    mat_w = add_simple_pbr_material("HouseWalls", "#c06a4a", roughness=0.85)
    walls.data.materials.append(mat_w)
    # roof prism
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.3, radius2=0.0, depth=1.0)
    roof = bpy.context.active_object
    roof.location = (0, 0, 2.7)
    roof.rotation_euler = (0, 0, 0.785398)
    bpy.ops.object.transform_apply(location=True, rotation=True)
    mat_r = add_simple_pbr_material("HouseRoof", "#5a2a18", roughness=0.95)
    roof.data.materials.append(mat_r)

    bpy.ops.object.select_all(action="DESELECT")
    walls.select_set(True)
    roof.select_set(True)
    bpy.context.view_layer.objects.active = walls
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = "house_block"
    uv_smart_project(joined)
    export_glb(joined, os.path.join(OUT_DIR, "house_block.glb"))


def main() -> None:
    mailbox()
    bin_trash()
    cone()
    fence_post()
    tree_conifer()
    street_light()
    parked_sedan()
    house_block()
    print("[blender] prop build complete")


if __name__ == "__main__":
    main()
