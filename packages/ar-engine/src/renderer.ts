import * as THREE from 'three';

import { computeAlphaBounds } from './alphaBounds';
import type { JewelleryType, Overlay } from './transforms';

// ────────────────────────────────────────────────────────────────────────────
// VisibleBounds — normalized bounding box of the non-transparent pixels in
// the loaded PNG, expressed in the model's LOCAL coordinate space after
// centering + normalizing. Used to choose where on the visible content the
// overlay's (x, y) anchor lands.
// ────────────────────────────────────────────────────────────────────────────

type VisibleBounds = {
  widthLocal: number;
  heightLocal: number;
  centerX: number;
  centerY: number;
  topY: number;
  bottomY: number;
};

type LoadedModel = {
  group: THREE.Group;
  visBounds: VisibleBounds;
};

// ────────────────────────────────────────────────────────────────────────────
// AR Renderer
// ────────────────────────────────────────────────────────────────────────────

export class ARRenderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private loaded: LoadedModel | null = null;
  private currentJewellery: JewelleryType = 'necklace';
  private viewportWidth = 1280;
  private viewportHeight = 720;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;

    this.scene = new THREE.Scene();
    // Y-down orthographic camera: top=0, bottom=h, so `y * h` maps directly
    // to screen pixels with the origin at the top-left. Matches app.js.
    this.camera = new THREE.OrthographicCamera(0, this.viewportWidth, 0, this.viewportHeight, 0.1, 1000);
    this.camera.position.z = 500;
  }

  /**
   * Match the renderer to the video element's intrinsic resolution. Should be
   * called once after `video.onloadedmetadata` fires, and again on resize.
   */
  setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.renderer.setSize(width, height, false);
    this.camera.right = width;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
  }

  setJewelleryType(t: JewelleryType): void {
    this.currentJewellery = t;
  }

  /**
   * Load a PNG/JPG and replace the active overlay. Resolves once the texture
   * is uploaded and the visible-bounds scan has finished.
   */
  async setProduct(imageUrl: string): Promise<void> {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    const texture: THREE.Texture = await new Promise((resolve, reject) => {
      loader.load(imageUrl, resolve, undefined, reject);
    });

    const img = texture.image as HTMLImageElement;
    const imgW = img.width;
    const imgH = img.height;
    const aspect = imgW / imgH;

    const bounds = computeAlphaBounds(img);

    // Normalize the visible region to the plane's local space (plane is
    // sized `aspect` wide by 1 tall before centering / scaling).
    const visW = (bounds.maxX - bounds.minX) / imgW;
    const visH = (bounds.maxY - bounds.minY) / imgH;
    const visCenterU = (bounds.minX + bounds.maxX) / (2 * imgW);
    const visCenterV = (bounds.minY + bounds.maxY) / (2 * imgH);
    const visW_local = visW * aspect;
    const visH_local = visH * 1;
    const visCenterX_local = (visCenterU - 0.5) * aspect;
    const visCenterY_local = (visCenterV - 0.5) * 1;
    const visTopY_local = visCenterY_local - visH_local / 2;
    const visBottomY_local = visCenterY_local + visH_local / 2;

    const geo = new THREE.PlaneGeometry(aspect, 1);
    // Flip UVs vertically so the texture isn't drawn upside-down under the
    // Y-down orthographic camera.
    const uvAttr = geo.attributes.uv!;
    for (let i = 0; i < uvAttr.count; i++) {
      uvAttr.setY(i, 1.0 - uvAttr.getY(i));
    }
    uvAttr.needsUpdate = true;

    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.02,
      toneMapped: false,
    });
    const baseModel = new THREE.Mesh(geo, mat);

    // Center the geometry on the origin so rotation pivots around the middle.
    const box = new THREE.Box3().setFromObject(baseModel);
    const center = box.getCenter(new THREE.Vector3());
    baseModel.position.sub(center);

    // Normalize so the longest dimension is 1 — keeps later `scale` math
    // independent of source-image dimensions.
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) baseModel.scale.set(1 / maxDim, 1 / maxDim, 1 / maxDim);

    const wrapper = new THREE.Group();
    wrapper.add(baseModel);
    wrapper.visible = false;

    // Replace previous model on the scene + dispose its GPU resources.
    if (this.loaded) {
      this.scene.remove(this.loaded.group);
      this.disposeGroup(this.loaded.group);
    }

    this.scene.add(wrapper);

    // Propagate visible bounds through the center / normalize transforms so
    // applyOverlay can scale by visible width and anchor at the top.
    const inv = 1 / (maxDim || 1);
    const visBounds: VisibleBounds = {
      widthLocal: visW_local * inv,
      heightLocal: visH_local * inv,
      centerX: (visCenterX_local - center.x) * inv,
      centerY: (visCenterY_local - center.y) * inv,
      topY: (visTopY_local - center.y) * inv,
      bottomY: (visBottomY_local - center.y) * inv,
    };

    this.loaded = { group: wrapper, visBounds };
  }

  /**
   * Position the loaded model based on this frame's overlay. Returns true if
   * the model was rendered; false means it was hidden (no tracking / no
   * product loaded). Doesn't render — callers must call `render()` after.
   */
  applyOverlay(overlay: Overlay): boolean {
    if (!this.loaded) return false;
    const m = this.loaded.group;

    if (!overlay.position || overlay.confidence < 0.2) {
      m.visible = false;
      return false;
    }

    m.visible = true;
    const [x, y] = overlay.position;

    const vb = this.loaded.visBounds;
    const widthLocal = vb.widthLocal || 1;
    const S = overlay.scale / widthLocal;
    m.scale.set(S, S, S);

    m.quaternion.identity();
    m.rotation.set(0, 0, overlay.rotationZ);

    // Anchor selection — which point on the VISIBLE pixels lands at (x, y).
    //   earring  → top-center of visible content (hook on the lobe)
    //   necklace → ~5% down from visible top (skip clasp, land on collarbone)
    //   rings, bangle → visible center
    let anchorLocalX = 0;
    let anchorLocalY = 0;
    const t = this.currentJewellery;
    if (t === 'earring_left' || t === 'earring_right') {
      anchorLocalX = vb.centerX;
      anchorLocalY = vb.topY;
    } else if (t === 'necklace') {
      anchorLocalX = vb.centerX;
      anchorLocalY = vb.topY + (vb.bottomY - vb.topY) * 0.05;
    } else {
      anchorLocalX = vb.centerX;
      anchorLocalY = vb.centerY;
    }

    // Rotate the anchor offset before subtracting so the chosen visible
    // point ends up exactly at (x, y) after the model rotates.
    const cos = Math.cos(overlay.rotationZ);
    const sin = Math.sin(overlay.rotationZ);
    const worldDX = (anchorLocalX * cos - anchorLocalY * sin) * S;
    const worldDY = (anchorLocalX * sin + anchorLocalY * cos) * S;
    m.position.set(x - worldDX, y - worldDY, 0);

    // Fade-in when confidence is borderline so the asset doesn't snap on
    // marginal hand detections.
    const opacity = overlay.confidence > 0.5 ? 1 : 0;
    m.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && mesh.material) {
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.transparent = true;
        mat.opacity = opacity;
      }
    });

    return true;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /** Free WebGL resources. Call from the React unmount path. */
  dispose(): void {
    if (this.loaded) {
      this.scene.remove(this.loaded.group);
      this.disposeGroup(this.loaded.group);
      this.loaded = null;
    }
    this.renderer.dispose();
  }

  private disposeGroup(g: THREE.Object3D): void {
    g.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mat = mesh.material as THREE.MeshBasicMaterial | THREE.MeshBasicMaterial[];
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            m.map?.dispose();
            m.dispose();
          });
        } else if (mat) {
          mat.map?.dispose();
          mat.dispose();
        }
      }
    });
  }
}
