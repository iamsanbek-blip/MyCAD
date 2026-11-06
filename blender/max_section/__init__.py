"""3ds Max style Section shape for Blender 4.2 LTS and newer.

Add > Curve > Section creates a rectangular section plane. Everything that the
plane cuts is outlined live in yellow, and "Create Shape" turns that outline
into editable spline curves, exactly like 3ds Max' Section shape.
"""
bl_info = {
    "name": "3ds Max Section",
    "author": "Rugby",
    "version": (1, 2, 0),
    "blender": (4, 2, 0),
    "location": "3D Viewport > Add > Curve > Section; Object properties; Sidebar > Section",
    "description": "3ds Max style Section shape: live cut outline and Create Shape",
    "category": "Add Curve",
}

import bmesh
import bpy
import numpy as np
from bpy.app.handlers import persistent
from bpy.props import BoolProperty, EnumProperty, FloatProperty, IntProperty, PointerProperty, StringProperty
from bpy_extras.object_utils import AddObjectHelper, object_data_add
from mathutils import Vector, geometry

from . import core

_MESH_TYPES = {"MESH", "CURVE", "SURFACE", "FONT", "META"}
_CACHE = {}              # section object session_uid -> {"polys": [...], "batch": None}
_DRAW_HANDLE = None
_SELF_EDITS = set()       # session_uids of live shapes we just rebuilt (skip their update)
_YELLOW = (1.0, 0.9, 0.0, 1.0)

UPDATE_MODES = [
    ("MOVE", "When Section Moves", "Update the outline whenever the section is moved, rotated or scaled"),
    ("SELECT", "When Selected", "Update the outline while the section is selected"),
    ("MANUAL", "Manually", "Update the outline only when Update Section is pressed"),
]
EXTENTS = [
    ("INFINITE", "Infinite", "Cut everything on the whole infinite plane"),
    ("BOUNDARY", "Section Boundary", "Cut only inside the section rectangle"),
    ("OFF", "Off", "Do not compute any intersection"),
]


# ---------------------------------------------------------------- geometry

def _is_section(obj):
    return obj is not None and getattr(obj, "max_section", None) is not None and obj.max_section.is_section


def _levels(sp):
    """Local Z of every cutting plane: 0, spacing, 2*spacing, ..."""
    return [i * sp.spacing for i in range(sp.copies)]


def _build_gizmo(obj):
    sp = obj.max_section
    hw, hl = sp.width / 2.0, sp.length / 2.0
    verts, edges = [], []
    for z in _levels(sp):
        n = len(verts)
        verts += [(-hw, -hl, z), (hw, -hl, z), (hw, hl, z), (-hw, hl, z)]
        edges += [(n, n + 1), (n + 1, n + 2), (n + 2, n + 3), (n + 3, n)]
    me = obj.data
    me.clear_geometry()
    me.from_pydata(verts, edges, [])
    me.update()


def compute_section(section, depsgraph):
    """Return the section outline as [(world_points (n, 3), closed), ...]."""
    sp = section.max_section
    if sp.extents == "OFF":
        return []
    mw = np.array(section.matrix_world, dtype=np.float64)
    try:
        inv = np.array(section.matrix_world.inverted_safe(), dtype=np.float64)
    except ValueError:
        return []
    out = []
    for inst in depsgraph.object_instances:
        ob = inst.object
        orig = ob.original
        if ob.type not in _MESH_TYPES or _is_section(orig) or orig.max_section.is_shape:
            continue
        try:
            me = ob.to_mesh()
        except RuntimeError:
            continue
        if me is None:
            continue
        try:
            me.calc_loop_triangles()
            nt, nv = len(me.loop_triangles), len(me.vertices)
            if nt == 0 or nv == 0:
                continue
            tri = np.empty(nt * 3, dtype=np.int32)
            me.loop_triangles.foreach_get("vertices", tri)
            co = np.empty(nv * 3, dtype=np.float32)
            me.vertices.foreach_get("co", co)
        finally:
            ob.to_mesh_clear()
        m = inv @ np.array(inst.matrix_world, dtype=np.float64)
        local = co.reshape(-1, 3).astype(np.float64) @ m[:3, :3].T + m[:3, 3]
        tri = tri.reshape(-1, 3)
        for z in _levels(sp):
            shifted = local - (0.0, 0.0, z)
            for line, closed in core.section_polylines(
                    shifted, tri, sp.extents, sp.width / 2.0, sp.length / 2.0):
                line = line + (0.0, 0.0, z)
                out.append((line @ mw[:3, :3].T + mw[:3, 3], closed))
    return out


def _fill_curve(cu, polys):
    cu.splines.clear()
    for pts, closed in polys:
        spline = cu.splines.new("POLY")
        spline.points.add(len(pts) - 1)
        co4 = np.hstack([pts, np.ones((len(pts), 1))])
        spline.points.foreach_set("co", co4.ravel())
        spline.use_cyclic_u = closed


def _fill_solid(me, loops, normal=None):
    """Fill closed planar loops (world space) with faces; inner loops become holes.

    Faces point along `normal` (or a stable per-plane normal). Returns skipped count.
    """
    groups, skipped = core.group_coplanar(loops, normal=normal)
    verts, faces = [], []
    for g in groups:
        flat = [core.to_2d(l, g) for l in g["loops"]]
        tris = geometry.tessellate_polygon(
            [[Vector((x, y, 0.0)) for x, y in f] for f in flat])
        p2 = np.vstack(flat)
        base = len(verts)
        verts.extend(np.vstack(g["loops"]).tolist())
        for a, b, c in tris:
            ab, ac = p2[b] - p2[a], p2[c] - p2[a]
            if ab[0] * ac[1] - ab[1] * ac[0] < 0:
                b, c = c, b
            faces.append((base + a, base + b, base + c))
    me.clear_geometry()
    me.from_pydata(verts, [], faces)
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-9)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.0175, verts=bm.verts, edges=bm.edges)
    bm.to_mesh(me)
    bm.free()
    me.update()
    return skipped


def _section_normal(section):
    n = section.matrix_world.to_3x3().col[2].normalized()
    return (n.x, n.y, n.z)


def _closed_loops(polys):
    return [pts for pts, closed in polys if closed]


def _add_solidify(obj, thickness, offset):
    mod = obj.modifiers.new("Thickness", "SOLIDIFY")
    mod.thickness = thickness
    mod.offset = offset
    mod.use_even_offset = True
    return mod


def _default_thickness(context):
    """18 mm in scene units, whatever the unit scale is."""
    scale = context.scene.unit_settings.scale_length or 1.0
    return 0.018 / scale


def _live_shapes(section):
    return [ob for ob in bpy.data.objects
            if ob.type in {"CURVE", "MESH"} and ob.max_section.source == section]


def _update_live_shapes(section, polys):
    for ob in _live_shapes(section):
        if ob.type == "CURVE":
            _fill_curve(ob.data, polys)
            ob.data.update_tag()
        else:
            _fill_solid(ob.data, _closed_loops(polys), _section_normal(section))
        _SELF_EDITS.add(ob.session_uid)


def _tag_redraw():
    wm = bpy.context.window_manager
    if wm is None:
        return
    for win in wm.windows:
        for area in win.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def recompute(section, depsgraph=None, update_shapes=True):
    section = section.original
    key = section.session_uid
    if section.max_section.extents == "OFF":
        _CACHE.pop(key, None)
    else:
        try:
            depsgraph = depsgraph or bpy.context.evaluated_depsgraph_get()
        except AttributeError:
            return
        _CACHE[key] = {"polys": compute_section(section, depsgraph), "batch": None}
        if update_shapes:   # never from a draw callback: writing data there is not allowed
            _update_live_shapes(section, _CACHE[key]["polys"])
    _tag_redraw()


# -------------------------------------------------------------- properties

def _on_size(self, context):
    obj = self.id_data
    if self.is_section and obj.type == "MESH":
        _build_gizmo(obj)
        if self.update_mode != "MANUAL":
            recompute(obj)


def _on_extents(self, context):
    obj = self.id_data
    if self.is_section and (self.update_mode != "MANUAL" or self.extents == "OFF"):
        recompute(obj)


class MaxSectionProps(bpy.types.PropertyGroup):
    is_section: BoolProperty(default=False)
    length: FloatProperty(name="Length", description="Section size along local Y",
                          default=2.0, min=0.0001, unit="LENGTH", update=_on_size)
    width: FloatProperty(name="Width", description="Section size along local X",
                         default=2.0, min=0.0001, unit="LENGTH", update=_on_size)
    update_mode: EnumProperty(name="Update", items=UPDATE_MODES, default="MOVE")
    extents: EnumProperty(name="Section Extents", items=EXTENTS, default="BOUNDARY",
                          update=_on_extents)
    is_shape: BoolProperty(default=False, description="Created by a section; never cut by sections")
    copies: IntProperty(name="Count", description="Number of parallel section planes",
                        default=1, min=1, soft_max=200, update=_on_size)
    spacing: FloatProperty(name="Spacing", description="Distance between planes along local Z "
                           "(negative goes down)", default=0.1, unit="LENGTH", update=_on_size)
    source: PointerProperty(name="Section", type=bpy.types.Object,
                            description="Live shape: rebuilt whenever this section updates",
                            poll=lambda self, ob: _is_section(ob))


# --------------------------------------------------------------- operators

class OBJECT_OT_max_section_add(bpy.types.Operator, AddObjectHelper):
    bl_idname = "object.max_section_add"
    bl_label = "Section"
    bl_description = "Add a 3ds Max style Section shape"
    bl_options = {"REGISTER", "UNDO"}

    length: FloatProperty(name="Length", default=2.0, min=0.0001, unit="LENGTH")
    width: FloatProperty(name="Width", default=2.0, min=0.0001, unit="LENGTH")

    def execute(self, context):
        me = bpy.data.meshes.new("Section")
        me.from_pydata([(0, 0, 0)] * 4, [(0, 1), (1, 2), (2, 3), (3, 0)], [])
        obj = object_data_add(context, me, operator=self)
        sp = obj.max_section
        sp.is_section = True
        sp.length, sp.width = self.length, self.width
        _build_gizmo(obj)
        obj.display_type = "WIRE"
        obj.color = _YELLOW
        obj.hide_render = True
        recompute(obj)
        return {"FINISHED"}


class OBJECT_OT_max_section_update(bpy.types.Operator):
    bl_idname = "object.max_section_update"
    bl_label = "Update Section"
    bl_description = "Recompute the section outline now"

    @classmethod
    def poll(cls, context):
        return _is_section(context.object)

    def execute(self, context):
        recompute(context.object)
        return {"FINISHED"}


class OBJECT_OT_max_section_create_shape(bpy.types.Operator):
    bl_idname = "object.max_section_create_shape"
    bl_label = "Create Shape"
    bl_description = "Turn the current section outline into an editable spline object"
    bl_options = {"REGISTER", "UNDO"}

    shape_name: StringProperty(name="Name", default="Section Shape")
    live: BoolProperty(name="Live (parametric)", default=True,
                       description="Keep the shape linked: it is rebuilt whenever the section updates")
    shape_type: EnumProperty(name="Type", default="CURVE", items=[
        ("CURVE", "Curve", "Editable spline outline (3ds Max Create Shape)"),
        ("SOLID", "Solid", "Filled faces with thickness (Solidify modifier); inner loops become holes"),
    ])
    thickness: FloatProperty(name="Thickness", default=0.018, min=0.0, unit="LENGTH")
    offset: FloatProperty(name="Offset", default=0.0, min=-1.0, max=1.0,
                          description="-1 / +1: thickness on one side of the cut, 0: centred")

    @classmethod
    def poll(cls, context):
        return _is_section(context.object)

    def invoke(self, context, event):
        self.shape_name = context.object.name + " Shape"
        self.thickness = _default_thickness(context)
        return context.window_manager.invoke_props_dialog(self)

    def draw(self, context):
        col = self.layout.column()
        col.prop(self, "shape_name")
        col.prop(self, "shape_type", expand=True)
        if self.shape_type == "SOLID":
            col.prop(self, "thickness")
            col.prop(self, "offset", slider=True)
        col.prop(self, "live")

    def execute(self, context):
        section = context.object
        entry = _CACHE.get(section.original.session_uid)
        if entry is None:
            recompute(section)
            entry = _CACHE.get(section.original.session_uid)
        polys = entry["polys"] if entry else []
        if not polys:
            self.report({"WARNING"}, "The section does not cut anything")
            return {"CANCELLED"}
        if self.shape_type == "SOLID":
            loops = _closed_loops(polys)
            if not loops:
                self.report({"WARNING"}, "No closed outline to fill (open cuts cannot be solid)")
                return {"CANCELLED"}
            me = bpy.data.meshes.new(self.shape_name)
            skipped = _fill_solid(me, loops, _section_normal(section))
            obj = bpy.data.objects.new(self.shape_name, me)
            _add_solidify(obj, self.thickness, self.offset)
            open_n = len(polys) - len(loops) + skipped
            if open_n:
                self.report({"WARNING"}, f"{open_n} open or degenerate outline(s) were not filled")
        else:
            cu = bpy.data.curves.new(self.shape_name, "CURVE")
            cu.dimensions = "3D"
            _fill_curve(cu, polys)
            obj = bpy.data.objects.new(self.shape_name, cu)
        obj.max_section.is_shape = True
        if self.live:
            obj.max_section.source = section.original
        context.collection.objects.link(obj)
        for o in context.selected_objects:
            o.select_set(False)
        obj.select_set(True)
        context.view_layer.objects.active = obj
        return {"FINISHED"}


class OBJECT_OT_max_section_unlink(bpy.types.Operator):
    bl_idname = "object.max_section_unlink"
    bl_label = "Bake (unlink from Section)"
    bl_description = "Stop live updates; the curve stays as it is now"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        ob = context.object
        return ob is not None and ob.type in {"CURVE", "MESH"} and ob.max_section.source is not None

    def execute(self, context):
        context.object.max_section.source = None
        return {"FINISHED"}


class OBJECT_OT_max_section_curve_to_solid(bpy.types.Operator):
    bl_idname = "object.max_section_curve_to_solid"
    bl_label = "Curve to Solid"
    bl_description = ("Fill the closed, flat splines of the selected curves and give them thickness "
                      "(one new mesh per curve, Solidify modifier)")
    bl_options = {"REGISTER", "UNDO"}

    thickness: FloatProperty(name="Thickness", default=0.018, min=0.0, unit="LENGTH")
    offset: FloatProperty(name="Offset", default=0.0, min=-1.0, max=1.0, subtype="FACTOR",
                          description="-1 / +1: thickness on one side of the outline plane, 0: centred")
    hide_curves: BoolProperty(name="Hide source curves", default=True)

    @classmethod
    def poll(cls, context):
        return any(o.type == "CURVE" for o in context.selected_objects)

    def invoke(self, context, event):
        self.thickness = _default_thickness(context)
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        made, skipped = [], 0
        for ob in [o for o in context.selected_objects if o.type == "CURVE"]:
            mw = np.array(ob.matrix_world, dtype=np.float64)
            loops = []
            for sp in ob.data.splines:
                if not sp.use_cyclic_u:
                    skipped += 1
                    continue
                if sp.type == "BEZIER":
                    pts = np.array([p.co[:] for p in sp.bezier_points], dtype=np.float64)
                else:
                    pts = np.array([p.co[:3] for p in sp.points], dtype=np.float64)
                if len(pts) >= 3:
                    loops.append(pts @ mw[:3, :3].T + mw[:3, 3])
            if not loops:
                continue
            me = bpy.data.meshes.new(ob.name + " Solid")
            skipped += _fill_solid(me, loops)
            new = bpy.data.objects.new(ob.name + " Solid", me)
            new.max_section.is_shape = True
            _add_solidify(new, self.thickness, self.offset)
            context.collection.objects.link(new)
            made.append(new)
            if self.hide_curves:
                ob.hide_set(True)
        if not made:
            self.report({"WARNING"}, "No closed flat spline found in the selected curves")
            return {"CANCELLED"}
        for o in context.selected_objects:
            o.select_set(False)
        for o in made:
            o.select_set(True)
        context.view_layer.objects.active = made[0]
        if skipped:
            self.report({"WARNING"}, f"{skipped} open or non-flat spline(s) were skipped")
        return {"FINISHED"}


# ---------------------------------------------------------------------- UI

def _draw_live_shape(layout, obj):
    box = layout.box()
    box.label(text="Live shape of: " + obj.max_section.source.name, icon="LINKED")
    box.operator("object.max_section_unlink", icon="UNLINKED")
    if obj.type == "CURVE":
        layout.operator("object.max_section_curve_to_solid", icon="MOD_SOLIDIFY")


def _draw_params(layout, obj):
    if not _is_section(obj):
        _draw_live_shape(layout, obj)
        return
    sp = obj.max_section
    if any(m.type == "ARRAY" for m in obj.modifiers):
        layout.label(text="Array only copies the frame - use Section Copies", icon="ERROR")
    box = layout.box()
    box.label(text="Section Parameters")
    box.operator("object.max_section_create_shape", icon="CURVE_DATA")
    col = box.column(align=True)
    col.label(text="Update")
    col.operator("object.max_section_update", icon="FILE_REFRESH")
    col.prop(sp, "update_mode", expand=True)
    col = box.column(align=True)
    col.label(text="Section Extents")
    col.prop(sp, "extents", expand=True)
    box = layout.box()
    box.label(text="Section Size")
    box.prop(sp, "length")
    box.prop(sp, "width")
    box = layout.box()
    box.label(text="Section Copies")
    box.prop(sp, "copies")
    row = box.row()
    row.active = sp.copies > 1
    row.prop(sp, "spacing")
    live = _live_shapes(obj.original)
    if live:
        layout.label(text="Live shapes: " + ", ".join(o.name for o in live), icon="LINKED")


class OBJECT_PT_max_section(bpy.types.Panel):
    bl_label = "3ds Max Section"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "object"

    @classmethod
    def poll(cls, context):
        ob = context.object
        return _is_section(ob) or (ob is not None and ob.max_section.source is not None)

    def draw(self, context):
        _draw_params(self.layout, context.object)


class VIEW3D_PT_max_section(bpy.types.Panel):
    bl_label = "3ds Max Section"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Section"

    def draw(self, context):
        ob = context.object
        if _is_section(ob) or (ob is not None and ob.max_section.source is not None):
            _draw_params(self.layout, ob)
        else:
            self.layout.operator("object.max_section_add", icon="MESH_PLANE")
            self.layout.label(text="Select a section to edit it")
        if ob is not None and ob.type == "CURVE" and ob.max_section.source is None:
            self.layout.operator("object.max_section_curve_to_solid", icon="MOD_SOLIDIFY")


def _menu_func(self, context):
    self.layout.operator("object.max_section_add", text="Section", icon="MESH_PLANE")


# ------------------------------------------------------- drawing + handlers

def _draw_callback():
    import gpu
    from gpu_extras.batch import batch_for_shader

    ctx = bpy.context
    scene, view_layer = ctx.scene, ctx.view_layer
    if scene is None or view_layer is None:
        return
    shader = gpu.shader.from_builtin("POLYLINE_UNIFORM_COLOR")
    seen = set()
    drawn = False
    for ob in scene.objects:
        if not _is_section(ob) or ob.max_section.extents == "OFF":
            continue
        key = ob.session_uid
        seen.add(key)
        entry = _CACHE.get(key)
        if entry is None:       # first display after load/undo
            recompute(ob, ctx.evaluated_depsgraph_get(), update_shapes=False)
            entry = _CACHE.get(key)
            if entry is None:
                continue
        if not ob.visible_get(view_layer=view_layer) or not entry["polys"]:
            continue
        if entry["batch"] is None:
            coords = []
            for pts, closed in entry["polys"]:
                seq = np.vstack([pts, pts[:1]]) if closed else pts
                coords.extend(np.repeat(seq, 2, axis=0)[1:-1].tolist())
            entry["batch"] = batch_for_shader(shader, "LINES", {"pos": coords})
        if not drawn:
            gpu.state.blend_set("ALPHA")
            gpu.state.depth_test_set("NONE")
            shader.bind()
            shader.uniform_float("viewportSize", gpu.state.viewport_get()[2:])
            shader.uniform_float("lineWidth", 2.0)
            shader.uniform_float("color", _YELLOW)
            drawn = True
        entry["batch"].draw(shader)
    if drawn:
        gpu.state.blend_set("NONE")
    for key in [k for k in _CACHE if k not in seen]:
        del _CACHE[key]


@persistent
def _on_depsgraph(scene, depsgraph):
    sections = [ob for ob in scene.objects if _is_section(ob)]
    if not sections:
        return
    moved, changed = set(), set()
    for upd in depsgraph.updates:
        if isinstance(upd.id, bpy.types.Object):
            uid = upd.id.original.session_uid
            changed.add(uid)
            if upd.is_updated_transform:
                moved.add(uid)
    if _SELF_EDITS:
        own = changed <= _SELF_EDITS     # only our rebuilt live shapes changed
        _SELF_EDITS.clear()
        if own:
            return
    for ob in sections:
        mode = ob.max_section.update_mode
        if mode == "MOVE" and ob.session_uid in moved:
            recompute(ob, depsgraph)
        elif mode == "SELECT" and ob.select_get():
            recompute(ob, depsgraph)


# ------------------------------------------------------------ registration

_CLASSES = (
    MaxSectionProps,
    OBJECT_OT_max_section_add,
    OBJECT_OT_max_section_update,
    OBJECT_OT_max_section_create_shape,
    OBJECT_OT_max_section_unlink,
    OBJECT_OT_max_section_curve_to_solid,
    OBJECT_PT_max_section,
    VIEW3D_PT_max_section,
)


def register():
    global _DRAW_HANDLE
    for cls in _CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Object.max_section = PointerProperty(type=MaxSectionProps)
    bpy.types.VIEW3D_MT_curve_add.append(_menu_func)
    bpy.app.handlers.depsgraph_update_post.append(_on_depsgraph)
    if not bpy.app.background:
        _DRAW_HANDLE = bpy.types.SpaceView3D.draw_handler_add(_draw_callback, (), "WINDOW", "POST_VIEW")


def unregister():
    global _DRAW_HANDLE
    if _DRAW_HANDLE is not None:
        bpy.types.SpaceView3D.draw_handler_remove(_DRAW_HANDLE, "WINDOW")
        _DRAW_HANDLE = None
    if _on_depsgraph in bpy.app.handlers.depsgraph_update_post:
        bpy.app.handlers.depsgraph_update_post.remove(_on_depsgraph)
    bpy.types.VIEW3D_MT_curve_add.remove(_menu_func)
    del bpy.types.Object.max_section
    for cls in reversed(_CLASSES):
        bpy.utils.unregister_class(cls)
    _CACHE.clear()
