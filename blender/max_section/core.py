"""Pure-numpy section geometry (no bpy), shared by the add-on and the tests.

Everything works in the SECTION's local space: the cutting plane is z == 0 and
the visible section rectangle is |x| <= half_width, |y| <= half_length.
"""
import numpy as np


def slice_triangles(verts, tris):
    """Intersect a triangle soup with the plane z == 0.

    verts: (n, 3) float array, tris: (m, 3) int array.
    Returns (points (k, 3), segments (s, 2) of point ids). A vertex lying exactly
    on the plane counts as the positive side, so the cut is always a closed or
    cleanly open curve, never a broken one. Points are shared per mesh edge, so
    neighbouring triangles join without any distance tolerance.
    """
    verts = np.asarray(verts, dtype=np.float64).reshape(-1, 3)
    tris = np.asarray(tris, dtype=np.int64).reshape(-1, 3)
    empty = (np.zeros((0, 3)), np.zeros((0, 2), dtype=np.int64))
    if len(verts) == 0 or len(tris) == 0:
        return empty
    d = verts[:, 2]
    s = d >= 0.0
    st = s[tris]
    mixed = ~((st[:, 0] == st[:, 1]) & (st[:, 1] == st[:, 2]))
    if not mixed.any():
        return empty
    t = tris[mixed]
    # Edge i joins corner i and corner (i + 1) % 3; a mixed triangle crosses two.
    nxt = np.roll(t, -1, axis=1)
    cross = s[t] != s[nxt]
    order = np.argsort(~cross, axis=1, kind="stable")[:, :2]
    rows = np.arange(len(t))
    nv = len(verts)
    keys = []
    for col in range(2):
        e = order[:, col]
        a = t[rows, e]
        b = nxt[rows, e]
        keys.append(np.minimum(a, b) * nv + np.maximum(a, b))
    m = len(t)
    uniq, inv = np.unique(np.concatenate(keys), return_inverse=True)
    va = uniq // nv
    vb = uniq % nv
    da = d[va]
    db = d[vb]
    f = da / (da - db)
    pts = verts[va] + (verts[vb] - verts[va]) * f[:, None]
    segs = np.stack([inv[:m], inv[m:]], axis=1)
    return pts, segs


def chain_segments(segs):
    """Join segments into polylines. Returns [(point_id_list, closed), ...]."""
    segs = np.asarray(segs).reshape(-1, 2)
    adj = {}
    for i, (u, v) in enumerate(segs.tolist()):
        adj.setdefault(u, []).append((v, i))
        adj.setdefault(v, []).append((u, i))
    used = [False] * len(segs)

    def walk(start):
        path = [start]
        cur = start
        while True:
            nxt = None
            for v, i in adj[cur]:
                if not used[i]:
                    used[i] = True
                    nxt = v
                    break
            if nxt is None:
                break
            path.append(nxt)
            cur = nxt
            if cur == start:
                break
        return path

    def has_free(n):
        return any(not used[i] for _, i in adj[n])

    out = []
    for n in list(adj):                      # open chains start at odd-degree ends
        if len(adj[n]) % 2 == 1:
            while has_free(n):
                out.append((walk(n), False))
    for n in list(adj):                      # what is left are closed loops
        while has_free(n):
            p = walk(n)
            out.append((p, len(p) > 2 and p[0] == p[-1]))
    res = []
    for p, closed in out:
        if closed:
            p = p[:-1]
        if len(p) >= 2:
            res.append((p, closed))
    return res


def _clip_segment(a, b, hw, hl):
    """Liang-Barsky clip of segment a-b to the section rectangle."""
    t0, t1 = 0.0, 1.0
    for k, h in ((0, hw), (1, hl)):
        p = b[k] - a[k]
        for sign in (-1.0, 1.0):
            num = h - sign * a[k]            # boundary: sign * x <= h
            den = sign * p
            if den == 0.0:
                if num < 0.0:
                    return None
            else:
                r = num / den
                if den < 0.0:
                    if r > t1:
                        return None
                    t0 = max(t0, r)
                else:
                    if r < t0:
                        return None
                    t1 = min(t1, r)
    return t0, t1


def clip_polyline(pts, closed, hw, hl):
    """Clip a polyline to the rectangle. Returns [(pts, closed), ...]."""
    pts = np.asarray(pts, dtype=np.float64)
    eps = 1e-12
    inside = (np.abs(pts[:, 0]) <= hw + eps) & (np.abs(pts[:, 1]) <= hl + eps)
    if inside.all():
        return [(pts, closed)]
    seq = np.vstack([pts, pts[:1]]) if closed else pts
    runs, cur = [], []
    for i in range(len(seq) - 1):
        a, b = seq[i], seq[i + 1]
        r = _clip_segment(a, b, hw, hl)
        if r is None:
            if cur:
                runs.append(cur)
                cur = []
            continue
        t0, t1 = r
        p0 = a + (b - a) * t0
        p1 = a + (b - a) * t1
        if t0 > 0.0 and cur:
            runs.append(cur)
            cur = []
        if not cur:
            cur = [p0]
        cur.append(p1)
        if t1 < 1.0:
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    if closed and len(runs) > 1 and inside[0] and cur:
        runs[0] = runs.pop() + runs[0][1:]   # the loop's seam lies inside
    return [(np.array(r), False) for r in runs if len(r) >= 2]


def section_polylines(verts, tris, extents, half_width, half_length):
    """Full pipeline for one mesh. extents: 'INFINITE' | 'BOUNDARY' | 'OFF'."""
    if extents == "OFF":
        return []
    pts, segs = slice_triangles(verts, tris)
    out = []
    for ids, closed in chain_segments(segs):
        line = pts[ids]
        if extents == "BOUNDARY":
            out.extend(clip_polyline(line, closed, half_width, half_length))
        else:
            out.append((line, closed))
    return out


# ------------------------------------------------------- planar fill helpers

def dedupe_loop(pts, eps=1e-9):
    """Drop consecutive duplicate points (and a repeated first point) of a closed loop."""
    pts = np.asarray(pts, dtype=np.float64)
    if len(pts) == 0:
        return pts
    keep = [0]
    for i in range(1, len(pts)):
        if np.linalg.norm(pts[i] - pts[keep[-1]]) > eps:
            keep.append(i)
    if len(keep) > 1 and np.linalg.norm(pts[keep[-1]] - pts[keep[0]]) <= eps:
        keep.pop()
    return pts[keep]


def newell_normal(pts):
    """Robust normal of a (possibly concave) closed polygon; zero vector if degenerate."""
    p = np.asarray(pts, dtype=np.float64)
    q = np.roll(p, -1, axis=0)
    n = np.array([
        np.sum((p[:, 1] - q[:, 1]) * (p[:, 2] + q[:, 2])),
        np.sum((p[:, 2] - q[:, 2]) * (p[:, 0] + q[:, 0])),
        np.sum((p[:, 0] - q[:, 0]) * (p[:, 1] + q[:, 1])),
    ])
    ln = np.linalg.norm(n)
    return n / ln if ln > 0 else n


def _canonical(n):
    """Pick a stable sign for a plane normal: largest component positive."""
    return n if n[np.argmax(np.abs(n))] >= 0 else -n


def plane_basis(n):
    """Orthonormal u, v with u x v == n."""
    n = np.asarray(n, dtype=np.float64)
    a = np.array([1.0, 0.0, 0.0]) if abs(n[0]) < 0.9 else np.array([0.0, 1.0, 0.0])
    u = np.cross(a, n)
    u /= np.linalg.norm(u)
    v = np.cross(n, u)
    return u, v


def group_coplanar(loops, normal=None, rel_tol=1e-4):
    """Group closed loops that lie in one plane, so inner loops can become holes.

    loops: list of (k, 3) arrays (world space). normal: force this plane normal
    (e.g. the section's Z) instead of estimating one per loop.
    Returns (groups, skipped) where groups = [{"n", "origin", "u", "v", "loops"}]
    and skipped counts loops that were degenerate or not planar.
    """
    groups, skipped = [], 0
    for loop in loops:
        loop = dedupe_loop(loop)
        if len(loop) < 3:
            skipped += 1
            continue
        size = float(np.linalg.norm(loop.max(axis=0) - loop.min(axis=0))) or 1.0
        tol = rel_tol * size
        n = np.asarray(normal, dtype=np.float64) if normal is not None else newell_normal(loop)
        ln = np.linalg.norm(n)
        if ln == 0:
            skipped += 1
            continue
        n = n / ln
        if normal is None:
            n = _canonical(n)
        c = loop.mean(axis=0)
        if np.max(np.abs((loop - c) @ n)) > tol:
            skipped += 1                       # not flat: cannot be filled
            continue
        d = float(c @ n)
        for g in groups:
            if abs(float(g["n"] @ n)) > 1 - 1e-6 and abs(float(g["n"] @ c) - g["d"]) <= max(tol, g["tol"]):
                g["loops"].append(loop)
                break
        else:
            u, v = plane_basis(n)
            groups.append({"n": n, "d": d, "origin": c, "u": u, "v": v, "loops": [loop], "tol": tol})
    return groups, skipped


def to_2d(loop, g):
    rel = np.asarray(loop) - g["origin"]
    return np.stack([rel @ g["u"], rel @ g["v"]], axis=1)
