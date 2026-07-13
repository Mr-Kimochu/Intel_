import math

import matplotlib.pyplot as plt
import numpy as np


def _contour_levels(grid_flat: list, interval: int = None) -> list:
    valid = [v for v in grid_flat if v != -9999 and not math.isnan(v)]
    if not valid:
        return []
    lo, hi = min(valid), max(valid)
    rng = hi - lo
    if interval is None:
        interval = 2 if rng < 30 else 5 if rng < 100 else 10 if rng < 300 else 25
    start = math.ceil(lo / interval) * interval
    return list(range(int(start), int(hi), interval))


def _draw_osm_on_ax(ax, osm_data: dict):
    """Shared helper — draw OSM features on a matplotlib axes."""
    ROAD_COLORS = {"major road":"#c0622a","secondary road":"#c0832a","local road":"#a09070","track / path":"#c8c0b0"}
    VEG_COLORS  = {"forest":("#2d6a1f",0.18),"farmland":("#c8b44a",0.15),"grassland":("#9ecf6a",0.15),"scrub":("#7ab36a",0.12),"wetland":("#4a9fc7",0.12)}
    for veg in osm_data.get("vegetation", []):
        geom = veg.get("geometry", [])
        if len(geom) >= 3:
            xs = [p["lon"] for p in geom]; ys = [p["lat"] for p in geom]
            col, alpha = VEG_COLORS.get(veg["type"], ("#aaa", 0.10))
            ax.fill(xs, ys, color=col, alpha=alpha, zorder=1)
    for bld in osm_data.get("buildings", []):
        geom = bld.get("geometry", [])
        if len(geom) >= 3:
            xs = [p["lon"] for p in geom]; ys = [p["lat"] for p in geom]
            ax.fill(xs, ys, color="#c8c0b8", alpha=0.7, zorder=2)
            ax.plot(xs + [xs[0]], ys + [ys[0]], color="#888", linewidth=0.4, zorder=2)
    for road in osm_data.get("roads", []):
        geom = road.get("geometry", [])
        if len(geom) >= 2:
            xs = [p["lon"] for p in geom]; ys = [p["lat"] for p in geom]
            ax.plot(xs, ys, color=ROAD_COLORS.get(road["type"], "#a09070"), linewidth=0.8, solid_capstyle="round", zorder=3)
    for ww in osm_data.get("waterways", []):
        geom = ww.get("geometry", [])
        if len(geom) >= 2:
            xs = [p["lon"] for p in geom]; ys = [p["lat"] for p in geom]
            ax.plot(xs, ys, color="#3a8fc7", linewidth=0.9, linestyle="--", solid_capstyle="round", zorder=3)
    for am in osm_data.get("amenities", []):
        ACOL = {"education":"#7b52ab","health":"#c0392b","emergency":"#e74c3c","commerce":"#2ecc71"}
        ax.plot(am["lon"], am["lat"], "o", color=ACOL.get(am["group"], "#555"), markersize=3, zorder=4)


def _draw_scale_bar(ax_sc, bounds, lat):
    km_per_deg  = 111.32 * math.cos(math.radians(lat))
    map_width_km = (bounds["east"] - bounds["west"]) * km_per_deg
    bar_km   = max(0.1, round(map_width_km / 4, 1))
    bar_frac = bar_km / map_width_km
    ax_sc.add_patch(plt.Rectangle((0.0, 0.3), bar_frac/2, 0.4, facecolor="black", transform=ax_sc.transAxes))
    ax_sc.add_patch(plt.Rectangle((bar_frac/2, 0.3), bar_frac/2, 0.4, facecolor="white", edgecolor="black", linewidth=0.5, transform=ax_sc.transAxes))
    ax_sc.text(0.0,      0.1, "0",                 fontsize=6, ha="center", transform=ax_sc.transAxes)
    ax_sc.text(bar_frac, 0.1, f"{bar_km:.1f} km",  fontsize=6, ha="center", transform=ax_sc.transAxes)
    ax_sc.text(bar_frac/2, 1.0, "Scale", fontsize=5.5, ha="center", va="bottom", transform=ax_sc.transAxes, color="#555")


def _draw_north_arrow(ax, bounds):
    na_x    = bounds["east"]  - 0.06 * (bounds["east"] - bounds["west"])
    na_y    = bounds["north"] - 0.06 * (bounds["north"] - bounds["south"])
    arr_len = 0.025 * (bounds["north"] - bounds["south"])
    ax.annotate("", xy=(na_x, na_y), xytext=(na_x, na_y - arr_len),
                arrowprops=dict(arrowstyle="-|>", color="black", lw=1.2))
    ax.text(na_x, na_y + arr_len * 0.3, "N", ha="center", va="bottom", fontsize=7, fontweight="bold")


def _draw_info_strip(ax_info, lat, lon, radius_m, title, grid_np, osm_data):
    y = 0.97
    def il(text, size=7, bold=False, color="black"):
        nonlocal y
        ax_info.text(0.02, y, text, transform=ax_info.transAxes, fontsize=size,
                     fontweight="bold" if bold else "normal", color=color, va="top")
        y -= 0.05 if bold else 0.04
    il(title, size=9, bold=True)
    il(f"Lat: {lat:.5f}  Lon: {lon:.5f}", size=6.5)
    il(f"Radius: {radius_m}m", size=6.5)
    valid = grid_np[~np.isnan(grid_np)]
    if valid.size:
        il(f"Elev: {valid.min():.0f}–{valid.max():.0f} m", size=6.5)
    y -= 0.02
    il("Legend", bold=True)
    items = [("#7B4F2E","─","Contours"),("#c0622a","─","Major road"),("#3a8fc7","--","Waterway"),
             ("#c8c0b8","■","Building"),("#2d6a1f","■","Forest"),("#c8b44a","■","Farmland"),
             ("#ff0000","▲","Site"),("#7b52ab","●","Education"),("#c0392b","●","Health")]
    for col, sym, lbl in items:
        ax_info.text(0.04, y, sym, transform=ax_info.transAxes, fontsize=8, color=col, va="top")
        ax_info.text(0.18, y, lbl, transform=ax_info.transAxes, fontsize=6, va="top")
        y -= 0.04
    y -= 0.02
    il("Sources:", bold=True, size=6)
    for s in ["SRTM 30m (NASA/USGS)", "OpenStreetMap", "Indicative only."]:
        il(s, size=5.5, color="#666")
