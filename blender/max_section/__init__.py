"""3ds Max style Section shape for Blender 4.2 LTS and newer.

Add > Curve > Section creates a rectangular section plane. Everything that the
plane cuts is outlined live in yellow, and "Create Shape" turns that outline
into editable spline curves, exactly like 3ds Max' Section shape.
"""
bl_info = {
    "name": "3ds Max Section",
    "author": "Rugby",
    "version": (1, 0, 0),
    "blender": (4, 2, 0),
    "location": "3D Viewport > Add > Curve > Section; Object properties; Sidebar > Section",
    "description": "3ds Max style Section shape: live cut outline and Create Shape",
    "category": "Add Curve",
}

import bpy
import numpy as np
from bpy.app.handlers import persistent
from bpy.props import BoolProperty, EnumProperty, FloatProperty, PointerProperty, StringProperty
from bpy_extras.object_utils import AddObjectHelper, object_data_add
from mathutils import Matrix

from . import core

_MESH_TYPES = {"MESH", "CURVE", "SURFACE", "FONT", "META"}
_CACHE = {}              # section object session_uid -> {"polys": [...], "batch": None}
_DRAW_HANDLE = None
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


def _build_gizmo(obj):
    sp = obj.max_section
    hw, hl = sp.width / 2.0, sp.length / 2.0
    for v, co in zip(obj.data.vertices, ((-hw, -hl, 0), (hw, -hl, 0), (hw, hl, 0), (-hw, hl, 0))):
        v.co = co
    obj.data.update()


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
        if ob.type not in _MESH_TYPES or _is_section(ob.original):
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
        for line, closed in core.section_polylines(
                local, tri.reshape(-1, 3), sp.extents, sp.width / 2.0, sp.length / 2.0):
            out.append((line @ mw[:3, :3].T + mw[:3, 3], closed))
    return out


def _tag_redraw():
    wm = bpy.context.window_manager
    if wm is None:
        return
    for win in wm.windows:
        for area in win.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def recompute(section, depsgraph=None):
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

    @classmethod
    def poll(cls, context):
        return _is_section(context.object)

    def invoke(self, context, event):
        self.shape_name = context.object.name + " Shape"
        return context.window_manager.invoke_props_dialog(self)

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
        cu = bpy.data.curves.new(self.shape_name, "CURVE")
        cu.dimensions = "3D"
        for pts, closed in polys:
            spline = cu.splines.new("POLY")
            spline.points.add(len(pts) - 1)
            co4 = np.hstack([pts, np.ones((len(pts), 1))])
            spline.points.foreach_set("co", co4.ravel())
            spline.use_cyclic_u = closed
        obj = bpy.data.objects.new(self.shape_name, cu)
        context.collection.objects.link(obj)
        for o in context.selected_objects:
            o.select_set(False)
        obj.select_set(True)
        context.view_layer.objects.active = obj
        return {"FINISHED"}


# ---------------------------------------------------------------------- UI

def _draw_params(layout, obj):
    sp = obj.max_section
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


class OBJECT_PT_max_section(bpy.types.Panel):
    bl_label = "3ds Max Section"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "object"

    @classmethod
    def poll(cls, context):
        return _is_section(context.object)

    def draw(self, context):
        _draw_params(self.layout, context.object)


class VIEW3D_PT_max_section(bpy.types.Panel):
    bl_label = "3ds Max Section"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Section"

    def draw(self, context):
        if _is_section(context.object):
            _draw_params(self.layout, context.object)
        else:
            self.layout.operator("object.max_section_add", icon="MESH_PLANE")
            self.layout.label(text="Select a section to edit it")


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
            recompute(ob, ctx.evaluated_depsgraph_get())
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
    moved = set()
    for upd in depsgraph.updates:
        if isinstance(upd.id, bpy.types.Object) and upd.is_updated_transform:
            moved.add(upd.id.original.session_uid)
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
