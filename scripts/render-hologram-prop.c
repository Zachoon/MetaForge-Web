/* Offline fresnel hologram rasterizer. See render-hologram-prop.py. */
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct { float x, y, z; } v3;

static float dot(v3 a, v3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
static v3 sub(v3 a, v3 b) { return (v3){a.x - b.x, a.y - b.y, a.z - b.z}; }
static v3 cross(v3 a, v3 b) {
  return (v3){a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
static v3 norm(v3 a) {
  float l = sqrtf(dot(a, a));
  if (l < 1e-8f) return (v3){0, 1, 0};
  return (v3){a.x / l, a.y / l, a.z / l};
}
static v3 add(v3 a, v3 b) { return (v3){a.x + b.x, a.y + b.y, a.z + b.z}; }
static v3 scale(v3 a, float s) { return (v3){a.x * s, a.y * s, a.z * s}; }

static int W, H, SS;
static float *color; /* RGB additive, W*H */
static float *depth;
static float *nxb;
static float *nyb;
static float *nzb;
static unsigned char *cover;

static void clear_buffers(void) {
  memset(color, 0, (size_t)W * H * 3 * sizeof(float));
  memset(nxb, 0, (size_t)W * H * sizeof(float));
  memset(nyb, 0, (size_t)W * H * sizeof(float));
  memset(nzb, 0, (size_t)W * H * sizeof(float));
  memset(cover, 0, (size_t)W * H);
  for (int i = 0; i < W * H; i++) depth[i] = 1e9f;
}

static void add_px(int x, int y, float r, float g, float b) {
  if ((unsigned)x >= (unsigned)W || (unsigned)y >= (unsigned)H) return;
  int i = (y * W + x) * 3;
  color[i] += r;
  color[i + 1] += g;
  color[i + 2] += b;
}

static void plot_depth(int x, int y, float z, v3 n, float r, float g, float b) {
  if ((unsigned)x >= (unsigned)W || (unsigned)y >= (unsigned)H) return;
  int p = y * W + x;
  add_px(x, y, r, g, b);
  if (z < depth[p]) {
    depth[p] = z;
    nxb[p] = n.x;
    nyb[p] = n.y;
    nzb[p] = n.z;
    cover[p] = 1;
  }
}

static void draw_line(float x0, float y0, float x1, float y1, float r, float g, float b, float width) {
  float dx = x1 - x0, dy = y1 - y0;
  float steps = fabsf(dx) > fabsf(dy) ? fabsf(dx) : fabsf(dy);
  if (steps < 1) steps = 1;
  int n = (int)steps;
  float radius = width * 0.5f;
  for (int i = 0; i <= n; i++) {
    float t = (float)i / (float)n;
    float x = x0 + dx * t;
    float y = y0 + dy * t;
    int ix = (int)floorf(x);
    int iy = (int)floorf(y);
    int rad = (int)ceilf(radius);
    for (int oy = -rad; oy <= rad; oy++) {
      for (int ox = -rad; ox <= rad; ox++) {
        float d = sqrtf((float)(ox * ox + oy * oy));
        if (d > radius + 0.6f) continue;
        float fall = 1.f - fminf(d / (radius + 0.6f), 1.f);
        fall = fall * fall;
        add_px(ix + ox, iy + oy, r * fall, g * fall, b * fall);
      }
    }
  }
}

static int edge_key_cmp(const void *a, const void *b) {
  const int *ea = a, *eb = b;
  if (ea[0] != eb[0]) return ea[0] - eb[0];
  return ea[1] - eb[1];
}

int main(int argc, char **argv) {
  if (argc < 5) {
    fprintf(stderr, "usage: render WORK_DIR FRAMES WIDTH HEIGHT\n");
    return 1;
  }
  const char *dir = argv[1];
  int frames = atoi(argv[2]);
  int out_w = atoi(argv[3]);
  int out_h = atoi(argv[4]);
  SS = 2;
  W = out_w * SS;
  H = out_h * SS;

  char path[512];
  snprintf(path, sizeof path, "%s/pos.bin", dir);
  FILE *fp = fopen(path, "rb");
  if (!fp) return 1;
  fseek(fp, 0, SEEK_END);
  long pos_bytes = ftell(fp);
  rewind(fp);
  int verts = (int)(pos_bytes / (sizeof(float) * 3));
  float *pos = malloc((size_t)pos_bytes);
  fread(pos, 1, pos_bytes, fp);
  fclose(fp);
  snprintf(path, sizeof path, "%s/nrm.bin", dir);
  fp = fopen(path, "rb");
  float *nrm = malloc((size_t)pos_bytes);
  fread(nrm, 1, pos_bytes, fp);
  fclose(fp);
  snprintf(path, sizeof path, "%s/idx.bin", dir);
  fp = fopen(path, "rb");
  fseek(fp, 0, SEEK_END);
  long idx_bytes = ftell(fp);
  rewind(fp);
  unsigned *idx = malloc((size_t)idx_bytes);
  fread(idx, 1, idx_bytes, fp);
  fclose(fp);
  int tris = (int)(idx_bytes / (sizeof(unsigned) * 3));

  v3 *fn = calloc((size_t)tris, sizeof(v3));
  for (int t = 0; t < tris; t++) {
    v3 a = *(v3 *)&pos[idx[t * 3] * 3];
    v3 b = *(v3 *)&pos[idx[t * 3 + 1] * 3];
    v3 c = *(v3 *)&pos[idx[t * 3 + 2] * 3];
    fn[t] = norm(cross(sub(b, a), sub(c, a)));
  }

  /* Unique edges -> up to two adjacent faces, for creases and silhouettes. */
  int (*edges)[4] = calloc((size_t)tris * 3, sizeof *edges);
  int ec = 0;
  for (int t = 0; t < tris; t++) {
    for (int e = 0; e < 3; e++) {
      int u = (int)idx[t * 3 + e];
      int v = (int)idx[t * 3 + (e + 1) % 3];
      if (u > v) { int s = u; u = v; v = s; }
      edges[ec][0] = u;
      edges[ec][1] = v;
      edges[ec][2] = t;
      edges[ec][3] = -1;
      ec++;
    }
  }
  qsort(edges, (size_t)ec, sizeof *edges, edge_key_cmp);
  int unique = 0;
  for (int i = 0; i < ec; i++) {
    if (unique > 0 && edges[unique - 1][0] == edges[i][0] && edges[unique - 1][1] == edges[i][1]) {
      edges[unique - 1][3] = edges[i][2];
    } else {
      edges[unique][0] = edges[i][0];
      edges[unique][1] = edges[i][1];
      edges[unique][2] = edges[i][2];
      edges[unique][3] = edges[i][3];
      unique++;
    }
  }

  color = calloc((size_t)W * H * 3, sizeof(float));
  depth = malloc((size_t)W * H * sizeof(float));
  nxb = malloc((size_t)W * H * sizeof(float));
  nyb = malloc((size_t)W * H * sizeof(float));
  nzb = malloc((size_t)W * H * sizeof(float));
  cover = malloc((size_t)W * H);

  float *blur = calloc((size_t)W * H * 3, sizeof(float));
  float *tmp = calloc((size_t)W * H * 3, sizeof(float));
  unsigned char *out = malloc((size_t)out_w * out_h * 4);

  snprintf(path, sizeof path, "%s/frames", dir);
  char cmd[640];
  snprintf(cmd, sizeof cmd, "mkdir -p %s", path);
  system(cmd);

  const v3 eye0 = {0.15f, 0.42f, 2.15f};
  const float fov = 0.62f;
  const float aspect = (float)W / (float)H;
  const float fy = 1.f / tanf(fov * 0.5f);
  const float fx = fy / aspect;

  for (int frame = 0; frame < frames; frame++) {
    float yaw = (float)frame / (float)frames * 6.2831853f;
    float cy = cosf(yaw), sy = sinf(yaw);
    clear_buffers();
    v3 eye = eye0;

    v3 *sp = malloc((size_t)verts * sizeof(v3)); /* screen x,y and view z */
    v3 *wp = malloc((size_t)verts * sizeof(v3));
    for (int i = 0; i < verts; i++) {
      v3 p = *(v3 *)&pos[i * 3];
      v3 r = {p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy};
      wp[i] = r;
      v3 rel = sub(r, eye);
      /* Camera looks at origin from eye. Build a simple look-at basis. */
      v3 forward = norm(scale(eye, -1.f));
      v3 world_up = {0, 1, 0};
      v3 right = norm(cross(forward, world_up));
      v3 up = cross(right, forward);
      float vx = dot(rel, right);
      float vy = dot(rel, up);
      float vz = dot(rel, forward);
      if (vz < 0.05f) vz = 0.05f;
      float sx = (vx / vz) * fx;
      float syy = (vy / vz) * fy;
      sp[i].x = (sx * 0.5f + 0.5f) * (W - 1);
      sp[i].y = (1.f - (syy * 0.5f + 0.5f)) * (H - 1);
      sp[i].z = vz;
    }

    for (int t = 0; t < tris; t++) {
      int ia = idx[t * 3], ib = idx[t * 3 + 1], ic = idx[t * 3 + 2];
      v3 a = sp[ia], b = sp[ib], c = sp[ic];
      v3 n = fn[t];
      v3 nr = {n.x * cy + n.z * sy, n.y, -n.x * sy + n.z * cy};
      v3 center = scale(add(add(wp[ia], wp[ib]), wp[ic]), 1.f / 3.f);
      v3 view = norm(sub(eye, center));
      float ndv = dot(nr, view);
      int front = ndv > 0;
      float fres = powf(1.f - fminf(fabsf(ndv), 1.f), 1.7f);
      float alpha = (0.02f + 0.22f * fres) * (front ? 1.f : 0.7f);
      /* Cyan #00F0FF, a touch hotter on the rim. */
      float cr = 0.15f * fres * alpha;
      float cg = (0.78f + 0.22f * fres) * alpha;
      float cb = (0.92f + 0.08f * fres) * alpha;

      float minx = fminf(a.x, fminf(b.x, c.x));
      float maxx = fmaxf(a.x, fmaxf(b.x, c.x));
      float miny = fminf(a.y, fminf(b.y, c.y));
      float maxy = fmaxf(a.y, fmaxf(b.y, c.y));
      int x0 = (int)fmaxf(floorf(minx), 0);
      int x1 = (int)fminf(ceilf(maxx), W - 1);
      int y0 = (int)fmaxf(floorf(miny), 0);
      int y1 = (int)fminf(ceilf(maxy), H - 1);
      float area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
      if (fabsf(area) < 0.5f) continue;
      for (int y = y0; y <= y1; y++) {
        for (int x = x0; x <= x1; x++) {
          float px = x + 0.5f, py = y + 0.5f;
          float w0 = (b.x - px) * (c.y - py) - (c.x - px) * (b.y - py);
          float w1 = (c.x - px) * (a.y - py) - (a.x - px) * (c.y - py);
          float w2 = (a.x - px) * (b.y - py) - (b.x - px) * (a.y - py);
          if (area < 0) { w0 = -w0; w1 = -w1; w2 = -w2; }
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          float inv = 1.f / (w0 + w1 + w2);
          float z = (a.z * w0 + b.z * w1 + c.z * w2) * inv;
          plot_depth(x, y, z, front ? nr : scale(nr, -1.f), cr, cg, cb);
        }
      }
    }

    /* Crease and silhouette lines. Smooth Tripo surfaces stay faint;
       hard folds and the outline carry the hologram. */
    for (int e = 0; e < unique; e++) {
      int f0 = edges[e][2];
      int f1 = edges[e][3];
      v3 n0 = fn[f0];
      v3 r0 = {n0.x * cy + n0.z * sy, n0.y, -n0.x * sy + n0.z * cy};
      int ia = edges[e][0], ib = edges[e][1];
      v3 mid = scale(add(wp[ia], wp[ib]), 0.5f);
      v3 view = norm(sub(eye, mid));
      float facing0 = dot(r0, view);
      float facing1 = facing0;
      float crease = 1.f;
      if (f1 >= 0) {
        v3 n1 = fn[f1];
        v3 r1 = {n1.x * cy + n1.z * sy, n1.y, -n1.x * sy + n1.z * cy};
        facing1 = dot(r1, view);
        float d = fmaxf(-1.f, fminf(1.f, dot(r0, r1)));
        crease = d < 0.28f ? (0.28f - d) / 0.28f : 0.f;
      }
      int silhouette = facing0 * facing1 < 0 || f1 < 0;
      if (!silhouette && crease < 0.55f) continue;
      float fres = powf(1.f - fminf(fabsf(facing0), 1.f), 1.4f);
      float intensity = silhouette ? (0.7f + 0.85f * fres) : (0.35f + 0.6f * crease) * (0.5f + 0.5f * fres);
      float width = silhouette ? 2.1f : 1.35f;
      draw_line(sp[ia].x, sp[ia].y, sp[ib].x, sp[ib].y, 0.25f * intensity, 0.95f * intensity, 1.05f * intensity, width);
    }

    /* Screen-space silhouette from the depth buffer, so the outer rim
       stays continuous even where the mesh is smooth. */
    for (int y = 1; y < H - 1; y++) {
      for (int x = 1; x < W - 1; x++) {
        int p = y * W + x;
        if (!cover[p]) continue;
        float dz = 0;
        for (int oy = -1; oy <= 1; oy++) {
          for (int ox = -1; ox <= 1; ox++) {
            int q = (y + oy) * W + (x + ox);
            if (!cover[q]) { dz += 4.f; continue; }
            dz += fabsf(depth[p] - depth[q]);
            float nd = nxb[p] * nxb[q] + nyb[p] * nyb[q] + nzb[p] * nzb[q];
            if (nd < 0.2f) dz += (0.2f - nd) * 2.f;
          }
        }
        if (dz > 2.4f) {
          float s = fminf((dz - 2.4f) * 0.22f, 0.85f);
          add_px(x, y, 0.2f * s, 0.85f * s, 1.0f * s);
        }
      }
    }

    /* Static transmission lines, kept faint. The moving band is CSS. */
    for (int y = 0; y < H; y++) {
      if ((y / SS) % 3 != 0) continue;
      for (int x = 0; x < W; x++) {
        int i = (y * W + x) * 3;
        color[i] *= 0.72f;
        color[i + 1] *= 0.72f;
        color[i + 2] *= 0.72f;
      }
    }

    /* Separable bloom of the bright core. */
    const int R = 8;
    float kernel[17];
    float ksum = 0;
    for (int k = -R; k <= R; k++) {
      kernel[k + R] = expf(-(k * k) / (2.f * 3.2f * 3.2f));
      ksum += kernel[k + R];
    }
    for (int k = 0; k < 17; k++) kernel[k] /= ksum;
    for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
        float r = 0, g = 0, b = 0;
        for (int k = -R; k <= R; k++) {
          int xx = x + k;
          if (xx < 0) xx = 0;
          if (xx >= W) xx = W - 1;
          int i = (y * W + xx) * 3;
          float lum = color[i] + color[i + 1] + color[i + 2];
          float m = lum > 0.45f ? kernel[k + R] : kernel[k + R] * 0.35f;
          r += color[i] * m;
          g += color[i + 1] * m;
          b += color[i + 2] * m;
        }
        int o = (y * W + x) * 3;
        tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b;
      }
    }
    for (int y = 0; y < H; y++) {
      for (int x = 0; x < W; x++) {
        float r = 0, g = 0, b = 0;
        for (int k = -R; k <= R; k++) {
          int yy = y + k;
          if (yy < 0) yy = 0;
          if (yy >= H) yy = H - 1;
          int i = (yy * W + x) * 3;
          float w = kernel[k + R];
          r += tmp[i] * w;
          g += tmp[i + 1] * w;
          b += tmp[i + 2] * w;
        }
        int o = (y * W + x) * 3;
        blur[o] = r; blur[o + 1] = g; blur[o + 2] = b;
      }
    }

    for (int y = 0; y < out_h; y++) {
      for (int x = 0; x < out_w; x++) {
        float r = 0, g = 0, b = 0;
        for (int oy = 0; oy < SS; oy++) {
          for (int ox = 0; ox < SS; ox++) {
            int i = ((y * SS + oy) * W + (x * SS + ox)) * 3;
            r += color[i] + blur[i] * 0.9f;
            g += color[i + 1] + blur[i + 1] * 0.9f;
            b += color[i + 2] + blur[i + 2] * 0.9f;
          }
        }
        float inv = 1.f / (SS * SS);
        r *= inv; g *= inv; b *= inv;
        /* Reinhard into a cyan hologram, alpha from brightness. */
        float lum = 0.1f * r + 0.65f * g + 0.25f * b;
        float mapped = lum / (1.f + lum);
        float gain = mapped * 1.35f;
        float rr = fminf((r * 0.35f + gain * 0.15f) * 1.1f, 1.f);
        float gg = fminf((g * 0.75f + gain * 0.94f), 1.f);
        float bb = fminf((b * 0.75f + gain * 1.0f), 1.f);
        float alpha = fminf(mapped * 2.4f, 1.f);
        /* Kill the dark fringe so the floor grid can show through. */
        if (alpha < 0.035f) { rr = gg = bb = alpha = 0; }
        int o = (y * out_w + x) * 4;
        out[o] = (unsigned char)(rr * 255.f);
        out[o + 1] = (unsigned char)(gg * 255.f);
        out[o + 2] = (unsigned char)(bb * 255.f);
        out[o + 3] = (unsigned char)(alpha * 255.f);
      }
    }

    char raw[256], png[256];
    snprintf(raw, sizeof raw, "%s/frames/frame%02d.raw", dir, frame);
    snprintf(png, sizeof png, "%s/frames/frame%02d.png", dir, frame);
    FILE *rf = fopen(raw, "wb");
    fwrite(out, 1, (size_t)out_w * out_h * 4, rf);
    fclose(rf);
    snprintf(cmd, sizeof cmd,
             "ffmpeg -y -f rawvideo -pix_fmt rgba -s %dx%d -i %s -frames:v 1 %s >/dev/null 2>&1",
             out_w, out_h, raw, png);
    system(cmd);
    remove(raw);
    fprintf(stderr, "frame %d/%d\n", frame + 1, frames);
    free(sp);
    free(wp);
  }
  return 0;
}
