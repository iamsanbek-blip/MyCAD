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

    # Section Copies: 3 planes 0.5 apart -> z = 0, 0.5, 1.0 (top face) -> 3 loops
    sec.location = (0, 0, 0)
    bpy.context.view_layer.update()
    sp.copies, sp.spacing = 3, 0.5
    assert len(sec.data.vertices) == 12 and len(sec.data.edges) == 12
    zs = sorted(round(float(p_[0][0, 2]), 4) for p_ in polys())
    assert zs == [0.0, 0.5, 1.0], zs
    sp.copies = 5                                  # z = 1.5, 2.0 miss the cube
    assert len(polys()) == 3

    # Live (parametric) shape follows the section
    bpy.context.view_layer.objects.active = sec
    sec.select_set(True)
    bpy.ops.object.max_section_create_shape(shape_name="Live", live=True)
    live = bpy.data.objects["Live"]
    assert live.max_section.source == sec and len(live.data.splines) == 3
    sec.location.z = -0.25                         # planes -0.25, 0.25, 0.75 (1.25, 1.75 miss)
    bpy.context.view_layer.update()
    bpy.context.view_layer.update()                # our own rebuild must not loop/recompute
    zl = sorted(round(live.data.splines[i].points[0].co.z, 4) for i in range(len(live.data.splines)))
    assert zl == [-0.25, 0.25, 0.75], zl
    sp.copies = 1
    assert len(live.data.splines) == 1
    # Baked shape stops following
    bpy.context.view_layer.objects.active = live
    assert bpy.ops.object.max_section_unlink() == {"FINISHED"}
    sp.copies = 3
    assert len(live.data.splines) == 1
    bpy.context.view_layer.objects.active = sec
    sp.copies, sec.location.z = 1, 0
    bpy.context.view_layer.update()

    # Solid: 3 copies -> 3 filled square faces + Solidify; live; never cut by the section
    sp.copies, sp.spacing = 3, 0.5
    bpy.context.view_layer.objects.active = sec
    bpy.ops.object.max_section_create_shape(shape_name="Slab", shape_type="SOLID",
                                            thickness=0.1, offset=0.0, live=True)
    slab = bpy.data.objects["Slab"]
    assert slab.type == "MESH" and len(slab.data.polygons) == 3, len(slab.data.polygons)
    assert all(abs(f.normal.z - 1) < 1e-6 for f in slab.data.polygons)
    assert abs(sum(f.area for f in slab.data.polygons) - 12) < 1e-4
    mod = slab.modifiers["Thickness"]
    assert mod.type == "SOLIDIFY" and abs(mod.thickness - 0.1) < 1e-6
    bpy.context.view_layer.update()
    assert len(polys()) == 3                       # the slab itself is not cut
    ev = slab.evaluated_get(bpy.context.evaluated_depsgraph_get())
    zs_ = [ (ev.matrix_world @ v.co).z for v in ev.data.vertices]
    assert abs(min(zs_) + 0.05) < 1e-5 and abs(max(zs_) - 1.05) < 1e-5, (min(zs_), max(zs_))
    sp.copies = 2                                  # live solid follows
    assert len(slab.data.polygons) == 2
    sp.copies = 1
    bpy.context.view_layer.update()

    # Hole: a torus cut through its middle gives two loops -> one ring-shaped face area
    bpy.ops.mesh.primitive_torus_add(location=(30, 0, 0), major_radius=1, minor_radius=0.25,
                                     major_segments=96, minor_segments=24)
    sec.location = (30, 0, 0)
    bpy.context.view_layer.update()
    assert len(polys()) == 2
    bpy.context.view_layer.objects.active = sec
    bpy.ops.object.max_section_create_shape(shape_name="Ring", shape_type="SOLID", live=False)
    ring = bpy.data.objects["Ring"]
    area = sum(f.area for f in ring.data.polygons)
    assert 3.0 < area < 3.1416, area             # pi*(1.25^2-0.75^2) = pi, polygonal a bit less
    assert ring.max_section.source is None and ring.max_section.is_shape

    # Curve to Solid on an existing (baked) curve shape
    bpy.context.view_layer.objects.active = sec
    bpy.ops.object.max_section_create_shape(shape_name="RingCurve", shape_type="CURVE", live=False)
    rc = bpy.data.objects["RingCurve"]
    bpy.ops.object.select_all(action="DESELECT")
    rc.select_set(True); bpy.context.view_layer.objects.active = rc
    assert bpy.ops.object.max_section_curve_to_solid(thickness=0.05) == {"FINISHED"}
    rs = bpy.context.object
    assert rs.name == "RingCurve Solid" and abs(rs.modifiers["Thickness"].thickness - 0.05) < 1e-6
    assert abs(sum(f.area for f in rs.data.polygons) - area) < 1e-6
    assert rc.hide_get()
    bpy.context.view_layer.objects.active = sec
    sec.select_set(True)
    sec.location = (0, 0, 0)
    bpy.context.view_layer.update()

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
