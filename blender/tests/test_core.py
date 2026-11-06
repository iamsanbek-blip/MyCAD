"""Plain Python (numpy only) tests for the section geometry. Run: python3 test_core.py"""
import importlib.util, os, sys
import numpy as np

spec = importlib.util.spec_from_file_location(
    "core", os.path.join(os.path.dirname(__file__), "..", "max_section", "core.py"))
core = importlib.util.module_from_spec(spec); spec.loader.exec_module(core)


def cube(c=(0, 0, 0), h=1.0):
    v = np.array([[x, y, z] for z in (-1, 1) for y in (-1, 1) for x in (-1, 1)], float) * h + c
    q = [(0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)]
    t = [(a,b,c_) for a,b,c_,d in q] + [(a,c_,d) for a,b,c_,d in q]
    return v, np.array(t)


def length(pl):
    p = pl[0]; q = np.vstack([p, p[:1]]) if pl[1] else p
    return np.linalg.norm(np.diff(q, axis=0), axis=1).sum()


# 1. cube cut through the middle -> one closed square of perimeter 8
v, t = cube()
r = core.section_polylines(v, t, "INFINITE", 5, 5)
assert len(r) == 1 and r[0][1] and abs(length(r[0]) - 8) < 1e-9, r
assert np.allclose(r[0][0][:, 2], 0)

# 2. plane exactly through the cube's vertices (z = -1 .. 1 shifted): still clean loop
v2 = v.copy(); v2[:, 2] -= 1.0           # top face lies exactly on the plane
r = core.section_polylines(v2, t, "INFINITE", 5, 5)
assert len(r) == 1 and r[0][1] and abs(length(r[0]) - 8) < 1e-9, r
v2[:, 2] += 2.0                           # bottom face on the plane: nothing cut
assert core.section_polylines(v2, t, "INFINITE", 5, 5) == []

# 3. boundary clip: rectangle 1x1 half-extent 0.5 -> cube loop of half 1 is fully outside
r = core.section_polylines(v, t, "BOUNDARY", 0.5, 0.5)
assert r == [], r
# 4. rectangle half 1.5 contains it fully -> closed stays closed
r = core.section_polylines(v, t, "BOUNDARY", 1.5, 1.5)
assert len(r) == 1 and r[0][1]
# 5. cube shifted so the loop straddles the rectangle edge x=0.5 (hw): clipped open
vs, ts = cube(c=(0.5, 0, 0), h=1.0)       # loop spans x in [-0.5, 1.5]
r = core.section_polylines(vs, ts, "BOUNDARY", 1.0, 2.0)
assert len(r) == 1 and not r[0][1]
assert np.all(r[0][0][:, 0] <= 1.0 + 1e-9)
# clipped part: x in [-0.5, 1.0] -> 3 sides of lengths 2(y), 1.5(x), 2(y) wait: two x-edges + y-edge
assert abs(length(r[0]) - (1.5 + 2 + 1.5)) < 1e-9, length(r[0])
# 6. Off and no-hit
assert core.section_polylines(v, t, "OFF", 5, 5) == []
v3, t3 = cube(c=(0, 0, 5))
assert core.section_polylines(v3, t3, "INFINITE", 5, 5) == []
# 7. two separate cubes -> two loops; open sheet -> one open polyline
vv = np.vstack([cube(c=(-3,0,0))[0], cube(c=(3,0,0))[0]]); tt = np.vstack([t, t + 8])
assert len(core.section_polylines(vv, tt, "INFINITE", 9, 9)) == 2
sheet_v = np.array([[-1,0,-1],[1,0,-1],[1,0,1],[-1,0,1]], float); sheet_t = np.array([[0,1,2],[0,2,3]])
r = core.section_polylines(sheet_v, sheet_t, "INFINITE", 9, 9)
assert len(r) == 1 and not r[0][1] and abs(length(r[0]) - 2) < 1e-9
print("core: all ok")
