"""Run inside Blender:  blender -b --python tests/test_blender.py
or with the pip module: python3 tests/test_blender.py   (needs `pip install bpy`)"""
import os, sys
import bpy
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
import max_section

print("Blender", bpy.app.version_string)
max_section.register()
try:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_cube_add(size=2)           # cube, half-size 1, at origin
    cube = bpy.context.object
    cube.name = "Cube"
    bpy.ops.object.max_section_add(length=4, width=4)
    sec = bpy.context.object
    sp = sec.max_section
    assert sp.is_section and sec.display_type == "WIRE" and sp.extents == "BOUNDARY"
    ys = [v.co.y for v in sec.data.vertices]
    assert abs(max(ys) - 2) < 1e-6 and abs(min(ys) + 2) < 1e-6

    def polys():
        return max_section._CACHE[sec.session_uid]["polys"]

    def perim(p):
        pts, closed = p
        q = np.vstack([pts, pts[:1]]) if closed else pts
        return np.linalg.norm(np.diff(q, axis=0), axis=1).sum()

    # section at z=0 cuts the unit cube: one closed loop, perimeter 8
    assert len(polys()) == 1 and polys()[0][1] and abs(perim(polys()[0]) - 8) < 1e-5

    # move the section up -> loop follows (depsgraph handler, "When Section Moves")
    sec.location.z = 0.5
    bpy.context.view_layer.update()
    pts = polys()[0][0]
    assert np.allclose(pts[:, 2], 0.5, atol=1e-5), pts[:, 2]

    # rotate 90deg about X: plane becomes vertical y=0 cut, still a closed loop
    sec.location = (0, 0, 0); sec.rotation_euler = (1.5707963, 0, 0)
    bpy.context.view_layer.update()
    assert np.allclose(polys()[0][0][:, 1], 0, atol=1e-5) and abs(perim(polys()[0]) - 8) < 1e-4

    # moving the section off the cube -> nothing
    sec.rotation_euler = (0, 0, 0); sec.location.z = 3
    bpy.context.view_layer.update()
    assert polys() == []
    sec.location.z = 0
    bpy.context.view_layer.update()

    # Section Boundary clips: shrink to a 1x1 rectangle, loop (half 1) is cut away fully
    sp.width = sp.length = 1.0
    assert polys() == []
    sp.extents = "INFINITE"
    assert len(polys()) == 1 and polys()[0][1]
    sp.extents = "OFF"
    assert sec.session_uid not in max_section._CACHE
    sp.extents = "BOUNDARY"; sp.width = sp.length = 4.0

    # Manual mode ignores moves until Update Section
    sp.update_mode = "MANUAL"
    before = polys()[0][0].copy()
    sec.location.z = 0.25
    bpy.context.view_layer.update()
    assert np.allclose(polys()[0][0], before)
    assert bpy.ops.object.max_section_update() == {"FINISHED"}
    assert np.allclose(polys()[0][0][:, 2], 0.25, atol=1e-5)
    sp.update_mode = "MOVE"

    # Create Shape -> editable POLY spline object in world space
    sec.location.z = 0
    bpy.context.view_layer.update()
    bpy.ops.object.max_section_create_shape(shape_name="Cut")
    shape = bpy.context.object
    assert shape.name == "Cut" and shape.type == "CURVE" and len(shape.data.splines) == 1
    s0 = shape.data.splines[0]
    assert s0.type == "POLY" and s0.use_cyclic_u and len(s0.points) >= 4
    assert all(abs(p.co.z) < 1e-5 for p in s0.points)
    # the new shape is not itself cut by the section, and sections never cut sections
    bpy.context.view_layer.update()
    assert len(polys()) == 1

    # Evaluated mesh (Subdivision modifier) is what gets cut: closed sphere -> closed loop
    bpy.ops.mesh.primitive_uv_sphere_add(location=(10, 0, 0))
    bpy.context.object.modifiers.new("s", "SUBSURF")
    sec.location = (10, 0, 0.3)
    bpy.context.view_layer.update()
    assert len(polys()) == 1 and polys()[0][1] and len(polys()[0][0]) > 64
    # Suzanne has open edges (eye sockets), so its cut may legitimately be open lines
    bpy.ops.mesh.primitive_monkey_add(location=(20, 0, 0))
    sec.location = (20, 0, 0.2)
    bpy.context.view_layer.update()
    assert len(polys()) >= 1
    print("blender: all ok")
finally:
    max_section.unregister()
