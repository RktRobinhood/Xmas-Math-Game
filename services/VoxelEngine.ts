
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as THREE from 'three';
import { ShapeSpec, LabelSpec, AngleSpec, DimensionSpec } from '../types';
import { COLORS, CONFIG } from '../utils/voxelConstants';

// --- Internal Camera Controller (Mobile Friendly) ---
class SimpleOrbitControls {
    private camera: THREE.Camera;
    private domElement: HTMLElement;
    private isDragging = false;
    private previousMousePosition = { x: 0, y: 0 };
    private spherical = new THREE.Spherical();
    private target = new THREE.Vector3(0, 5, 0);
    public autoRotate = false;
    private lastPinchDist = 0;

    constructor(camera: THREE.Camera, domElement: HTMLElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
        this.spherical.setFromVector3(offset);

        this.domElement.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mouseup', this.onMouseUp);
        this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });

        this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
        this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
        this.domElement.addEventListener('touchend', this.onTouchEnd);
    }

    private onMouseDown = (e: MouseEvent) => {
        if (e.button === 0) {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
            this.domElement.style.cursor = 'grabbing';
        }
    }

    private onMouseMove = (e: MouseEvent) => {
        if (this.isDragging) {
            const deltaMove = {
                x: e.clientX - this.previousMousePosition.x,
                y: e.clientY - this.previousMousePosition.y
            };
            this.rotate(deltaMove.x, deltaMove.y);
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    }

    private onMouseUp = () => {
        this.isDragging = false;
        this.domElement.style.cursor = 'crosshair';
    }

    private onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            this.isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.lastPinchDist = Math.sqrt(dx*dx + dy*dy);
        }
    }

    private onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1 && this.isDragging) {
            const deltaMove = {
                x: e.touches[0].clientX - this.previousMousePosition.x,
                y: e.touches[0].clientY - this.previousMousePosition.y
            };
            this.rotate(deltaMove.x, deltaMove.y);
            this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const delta = this.lastPinchDist - dist;
            this.zoom(delta * 0.1);
            this.lastPinchDist = dist;
        }
    }

    private onTouchEnd = () => {
        this.isDragging = false;
        this.lastPinchDist = 0;
    }

    private rotate(dx: number, dy: number) {
        const rotateSpeed = 0.008;
        this.spherical.theta -= dx * rotateSpeed;
        this.spherical.phi -= dy * rotateSpeed;
        this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi));
    }

    private zoom(delta: number) {
        this.spherical.radius += delta;
        this.spherical.radius = Math.max(5, Math.min(80, this.spherical.radius));
    }

    private onMouseWheel = (e: WheelEvent) => {
        e.preventDefault();
        const zoomSpeed = 0.05;
        this.zoom(e.deltaY * zoomSpeed);
    }

    public update() {
        if (this.autoRotate && !this.isDragging) {
            this.spherical.theta += 0.002;
        }
        const offset = new THREE.Vector3().setFromSpherical(this.spherical);
        this.camera.position.copy(this.target).add(offset);
        this.camera.lookAt(this.target);
    }
    
    public dispose() {
        // Cleanup listeners
        this.domElement.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mouseup', this.onMouseUp);
        this.domElement.removeEventListener('wheel', this.onMouseWheel);
        this.domElement.removeEventListener('touchstart', this.onTouchStart);
        this.domElement.removeEventListener('touchmove', this.onTouchMove);
        this.domElement.removeEventListener('touchend', this.onTouchEnd);
    }
}

export class GeometryEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: SimpleOrbitControls;
  
  private shapes: THREE.Group = new THREE.Group();
  private labelsGroup: THREE.Group = new THREE.Group();
  private dimensionsGroup: THREE.Group = new THREE.Group();
  private anglesGroup: THREE.Group = new THREE.Group();
  private measureLineGroup: THREE.Group = new THREE.Group();
  private previewLineGroup: THREE.Group = new THREE.Group();
  private snapMarkersGroup: THREE.Group = new THREE.Group(); // Visual markers for all valid points
  
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  
  private isMeasuring = false;
  private snapPoints: { position: THREE.Vector3, type: string }[] = [];
  private activeSnapPoint: THREE.Vector3 | null = null;
  private measureStart: THREE.Vector3 | null = null;
  private highlightMesh: THREE.Mesh;
  
  private onMeasureChange: (distance: number | null) => void;
  private animationId: number = 0;
  private snowParticles: THREE.Points | null = null;

  constructor(container: HTMLElement, onMeasureChange: (d: number | null) => void) {
    this.container = container;
    this.onMeasureChange = onMeasureChange;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.FogExp2(COLORS.background, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(24, 24, 24); 

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new SimpleOrbitControls(this.camera, this.renderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffea00, 1.2);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    this.scene.add(dir);

    this.scene.add(this.shapes, this.labelsGroup, this.dimensionsGroup, this.anglesGroup, this.measureLineGroup, this.previewLineGroup, this.snapMarkersGroup);

    const grid = new THREE.GridHelper(50, 50, COLORS.gridPrimary, COLORS.gridSecondary);
    grid.position.y = CONFIG.FLOOR_Y;
    this.scene.add(grid);

    this.setupSnow();

    // Snap Highlight (The active cursor)
    this.highlightMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5), 
        new THREE.MeshBasicMaterial({ color: 0xff1493, depthTest: false, transparent: true, opacity: 0.8 })
    );
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    // Interaction Listeners
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('touchstart', this.onTouchMove, { passive: false }); 
    
    this.animate();
  }

  // --- Rendering Loop ---
  private animate = () => {
      this.animationId = requestAnimationFrame(this.animate);
      this.controls.update();
      this.updateSnow();
      this.renderer.render(this.scene, this.camera);
  }

  public handleResize() {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
  }

  public cleanup() {
      cancelAnimationFrame(this.animationId);
      this.controls.dispose();
      this.container.removeEventListener('pointerdown', this.onPointerDown);
      this.container.removeEventListener('pointermove', this.onPointerMove);
      this.renderer.dispose();
  }

  // --- Snow Effect ---
  private setupSnow() {
      const geo = new THREE.BufferGeometry();
      const count = 1500;
      const pos = new Float32Array(count * 3);
      for(let i=0; i<count*3; i++) {
          pos[i] = (Math.random() - 0.5) * 100;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
          color: COLORS.snow,
          size: 0.3,
          transparent: true,
          opacity: 0.8
      });
      this.snowParticles = new THREE.Points(geo, mat);
      this.scene.add(this.snowParticles);
  }

  private updateSnow() {
      if(!this.snowParticles) return;
      const positions = this.snowParticles.geometry.attributes.position.array as Float32Array;
      for(let i=1; i<positions.length; i+=3) {
          positions[i] -= 0.05;
          if (positions[i] < -10) positions[i] = 40;
      }
      this.snowParticles.geometry.attributes.position.needsUpdate = true;
  }

  // --- Scene Loading ---
  public loadScene(shapes: ShapeSpec[], labels: LabelSpec[], angles: AngleSpec[], dimensions: DimensionSpec[]) {
      // Clear Old
      this.shapes.clear();
      this.labelsGroup.clear();
      this.dimensionsGroup.clear();
      this.anglesGroup.clear();
      this.measureLineGroup.clear();
      this.previewLineGroup.clear();
      this.snapMarkersGroup.clear();
      this.snapPoints = [];
      this.measureStart = null;
      this.onMeasureChange(null);

      // Add Shapes
      shapes.forEach(spec => {
          const mesh = this.createShapeMesh(spec);
          this.shapes.add(mesh);
          this.generateSnapPoints(spec);
      });

      // Add Visuals
      labels.forEach(l => this.createLabel(l));
      dimensions.forEach(d => this.createDimension(d));
      angles.forEach(a => this.createAngle(a));
      
      // If we are already measuring, update markers
      if (this.isMeasuring) {
          this.showSnapMarkers();
      }
  }

  // --- Mesh Generation ---
  private createShapeMesh(spec: ShapeSpec): THREE.Group {
      const group = new THREE.Group();
      group.position.set(spec.position.x, spec.position.y, spec.position.z);
      group.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
      
      let geo: THREE.BufferGeometry;
      if (spec.type === 'cylinder') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 32);
      else if (spec.type === 'cone') geo = new THREE.ConeGeometry(spec.dims.radius, spec.dims.height, 32);
      else if (spec.type === 'sphere') geo = new THREE.SphereGeometry(spec.dims.radius, 32, 32);
      else if (spec.type === 'pyramid') geo = new THREE.CylinderGeometry(0, spec.dims.radius, spec.dims.height, 4);
      else if (spec.type === 'hemisphere') geo = new THREE.SphereGeometry(spec.dims.radius, 32, 16, 0, Math.PI*2, 0, Math.PI/2);
      else if (spec.type === 'tri_prism') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 3);
      else if (spec.type === 'hex_prism') geo = new THREE.CylinderGeometry(spec.dims.radius, spec.dims.radius, spec.dims.height, 6);
      else geo = new THREE.BoxGeometry(spec.dims.width, spec.dims.height, spec.dims.depth);

      const mat = new THREE.MeshStandardMaterial({ 
          color: spec.color, 
          roughness: 0.7,
          metalness: 0.1,
          transparent: true, 
          opacity: 0.9,
          side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: COLORS.shapeLine, linewidth: 2 })
      );
      
      group.add(mesh, edges);
      return group;
  }
  
  // --- Snapping ---
  private generateSnapPoints(spec: ShapeSpec) {
      // Calculate world matrix to transform local points to world space
      const dummy = new THREE.Object3D();
      dummy.position.set(spec.position.x, spec.position.y, spec.position.z);
      dummy.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
      dummy.updateMatrix();

      const addPoint = (localVec: THREE.Vector3, type: string) => {
          const worldPos = localVec.clone().applyMatrix4(dummy.matrix);
          this.snapPoints.push({ position: worldPos, type });
      };

      // 1. Center (Centroid)
      addPoint(new THREE.Vector3(0,0,0), 'center');
      
      // 2. Vertices & Cardinal Points
      if (spec.dims.height) {
          const h = spec.dims.height;
          // Top/Bottom Centers
          addPoint(new THREE.Vector3(0, h/2, 0), 'center_top');
          addPoint(new THREE.Vector3(0, -h/2, 0), 'center_bottom');
      }

      if (spec.dims.width && spec.dims.height && spec.dims.depth) { 
          // Box Corners
          const w = spec.dims.width/2; 
          const h = spec.dims.height/2; 
          const d = spec.dims.depth/2;
          
          addPoint(new THREE.Vector3(w, h, d), 'vertex');
          addPoint(new THREE.Vector3(-w, h, d), 'vertex');
          addPoint(new THREE.Vector3(w, -h, d), 'vertex');
          addPoint(new THREE.Vector3(-w, -h, d), 'vertex');
          
          addPoint(new THREE.Vector3(w, h, -d), 'vertex');
          addPoint(new THREE.Vector3(-w, h, -d), 'vertex');
          addPoint(new THREE.Vector3(w, -h, -d), 'vertex');
          addPoint(new THREE.Vector3(-w, -h, -d), 'vertex');
      }
      
      if (spec.dims.radius) {
          const r = spec.dims.radius;
          const h = spec.dims.height ? spec.dims.height/2 : 0;
          
          // Cardinal points on rims (North, South, East, West)
          if (spec.type === 'cylinder' || spec.type === 'cone' || spec.type === 'pyramid' || spec.type === 'frustum' || spec.type === 'tri_prism' || spec.type === 'hex_prism') {
               // Bottom Rim
               addPoint(new THREE.Vector3(r, -h, 0), 'rim');
               addPoint(new THREE.Vector3(-r, -h, 0), 'rim');
               addPoint(new THREE.Vector3(0, -h, r), 'rim');
               addPoint(new THREE.Vector3(0, -h, -r), 'rim');
               
               // Top Rim (if Cylinder)
               if (spec.type === 'cylinder' || spec.type === 'hex_prism' || spec.type === 'tri_prism') {
                   addPoint(new THREE.Vector3(r, h, 0), 'rim');
                   addPoint(new THREE.Vector3(-r, h, 0), 'rim');
                   addPoint(new THREE.Vector3(0, h, r), 'rim');
                   addPoint(new THREE.Vector3(0, h, -r), 'rim');
               }
          }
          
          if (spec.type === 'sphere' || spec.type === 'hemisphere') {
              // 6 Cardinal Points
              addPoint(new THREE.Vector3(r, 0, 0), 'surface');
              addPoint(new THREE.Vector3(-r, 0, 0), 'surface');
              addPoint(new THREE.Vector3(0, r, 0), 'surface'); // Top
              addPoint(new THREE.Vector3(0, -r, 0), 'surface'); // Bottom
              addPoint(new THREE.Vector3(0, 0, r), 'surface');
              addPoint(new THREE.Vector3(0, 0, -r), 'surface');
          }
      }
  }

  public setMeasuringMode(active: boolean) {
      this.isMeasuring = active;
      if (active) {
          this.showSnapMarkers();
      } else {
          this.snapMarkersGroup.clear();
          this.highlightMesh.visible = false;
          this.measureStart = null;
          this.measureLineGroup.clear();
          this.previewLineGroup.clear();
          this.onMeasureChange(null);
      }
  }
  
  private showSnapMarkers() {
      this.snapMarkersGroup.clear();
      const dotGeo = new THREE.SphereGeometry(0.25); // Visible marker size
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, depthTest: false, transparent: true, opacity: 0.6 });
      
      this.snapPoints.forEach(pt => {
          const dot = new THREE.Mesh(dotGeo, dotMat);
          dot.position.copy(pt.position);
          this.snapMarkersGroup.add(dot);
      });
  }
  
  public setAutoRotate(active: boolean) {
      this.controls.autoRotate = active;
  }

  private onPointerMove = (e: MouseEvent) => {
      this.updateMouse(e.clientX, e.clientY);
      this.checkSnapping();
  }
  
  private onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
          this.updateMouse(e.touches[0].clientX, e.touches[0].clientY - 50); // Touch offset
          this.checkSnapping();
      }
  }

  private updateMouse(x: number, y: number) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
  }

  private checkSnapping() {
      if (!this.isMeasuring) return;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      this.activeSnapPoint = null;
      this.highlightMesh.visible = false;

      let closestDist = Infinity;
      let closestPoint: THREE.Vector3 | null = null;
      const SNAP_RADIUS = 1.5; 

      // 1. Raycast against shapes to find surface point
      const intersects = this.raycaster.intersectObjects(this.shapes.children, true);
      if (intersects.length > 0) {
          closestPoint = intersects[0].point;
          closestDist = 0; 
      }

      // 2. Check predefined snap points
      for(const pt of this.snapPoints) {
          if (closestPoint) {
              const d = pt.position.distanceTo(closestPoint);
              // Snap if close to a valid point
              if (d < SNAP_RADIUS && d < closestDist + 1) { 
                   this.activeSnapPoint = pt.position;
                   break;
              }
          }
      }
      
      // 3. Fallback: Snap to the nearest marker if mouse ray is close enough in 2D space?
      // Actually, relying on the surface intersect + distance is usually good enough for 3D.
      
      // If we didn't find a snap point but hit the mesh, do we let them click anywhere?
      // User requested "vertexes and centers", so we should strongly prefer Snapped Points.
      // If no snap point found, we DO NOT highlight. This enforces measuring specific points.
      
      if (this.activeSnapPoint) {
          this.highlightMesh.position.copy(this.activeSnapPoint);
          this.highlightMesh.visible = true;
          this.renderer.domElement.style.cursor = 'crosshair';
          
          this.previewLineGroup.clear();
          if (this.measureStart) {
              const geo = new THREE.BufferGeometry().setFromPoints([this.measureStart, this.activeSnapPoint]);
              const mat = new THREE.LineDashedMaterial({ color: 0xff1493, dashSize: 0.5, gapSize: 0.2, scale: 1, depthTest: false });
              const line = new THREE.Line(geo, mat);
              line.computeLineDistances();
              this.previewLineGroup.add(line);
          }
      } else {
          this.renderer.domElement.style.cursor = 'default';
          this.previewLineGroup.clear();
      }
  }

  private onPointerDown = (e: MouseEvent) => {
      if (!this.isMeasuring || !this.activeSnapPoint) return;
      
      if (!this.measureStart) {
          this.measureStart = this.activeSnapPoint.clone();
          this.measureLineGroup.clear();
          const startMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false}));
          startMarker.position.copy(this.measureStart);
          this.measureLineGroup.add(startMarker);
      } else {
          const end = this.activeSnapPoint.clone();
          const dist = this.measureStart.distanceTo(end);
          
          // Clear previous preview
          this.previewLineGroup.clear();
          this.measureLineGroup.clear(); // Only show one active measurement at a time as requested

          // Draw Result Line
          const path = new THREE.LineCurve3(this.measureStart, end);
          const tube = new THREE.TubeGeometry(path, 1, 0.3, 8, false); // Thicker line (0.3 radius)
          const mesh = new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0xff1493, depthTest: false }));
          
          const startMarker = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false}));
          startMarker.position.copy(this.measureStart);
          
          const endMarker = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0xff1493, depthTest: false}));
          endMarker.position.copy(end);

          this.measureLineGroup.add(mesh, startMarker, endMarker);
          
          this.onMeasureChange(dist);
          this.measureStart = null;
      }
  }

  // --- Visual Helpers ---
  private createLabel(spec: LabelSpec) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      canvas.width = 256; canvas.height = 128;
      
      ctx.fillStyle = spec.color || '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      
      // Basic subscript parsing (e.g., h_2)
      const parts = spec.text.split('_');
      ctx.fillText(parts[0], 128, 64);
      if(parts[1]) {
          ctx.font = 'bold 28px Arial';
          ctx.fillText(parts[1], 128 + ctx.measureText(parts[0]).width/2 + 10, 84);
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      sprite.position.set(spec.position.x, spec.position.y, spec.position.z);
      sprite.scale.set(4, 2, 1);
      this.labelsGroup.add(sprite);
  }
  
  private createDimension(spec: DimensionSpec) {
      const start = new THREE.Vector3(spec.start.x, spec.start.y, spec.start.z);
      const end = new THREE.Vector3(spec.end.x, spec.end.y, spec.end.z);
      const offset = new THREE.Vector3(spec.offset.x, spec.offset.y, spec.offset.z);
      
      // Points shifted by offset
      const p1 = start.clone().add(offset);
      const p2 = end.clone().add(offset);
      
      // Main Line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false });
      const line = new THREE.Line(lineGeo, lineMat);
      
      // Extension Lines (from object to dimension line)
      const ext1Geo = new THREE.BufferGeometry().setFromPoints([start, p1]);
      const ext1 = new THREE.Line(ext1Geo, new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent:true, opacity:0.5, depthTest:false }));
      
      const ext2Geo = new THREE.BufferGeometry().setFromPoints([end, p2]);
      const ext2 = new THREE.Line(ext2Geo, new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent:true, opacity:0.5, depthTest:false }));

      // Ticks
      const tickSize = 0.2;
      const tick1 = new THREE.Mesh(new THREE.BoxGeometry(tickSize, 0.5, tickSize), new THREE.MeshBasicMaterial({color:0xffffff, depthTest:false}));
      tick1.position.copy(p1);
      const tick2 = new THREE.Mesh(new THREE.BoxGeometry(tickSize, 0.5, tickSize), new THREE.MeshBasicMaterial({color:0xffffff, depthTest:false}));
      tick2.position.copy(p2);
      
      this.dimensionsGroup.add(line, ext1, ext2, tick1, tick2);
      
      // Text Label
      const mid = p1.clone().lerp(p2, 0.5);
      // Push text slightly away from line
      mid.add(offset.clone().normalize().multiplyScalar(0.5));
      this.createLabel({ text: spec.text, position: {x:mid.x, y:mid.y, z:mid.z} });
  }
  
  private createAngle(spec: AngleSpec) {
      const origin = new THREE.Vector3(spec.origin.x, spec.origin.y, spec.origin.z);
      const dirA = new THREE.Vector3(spec.vecA.x, spec.vecA.y, spec.vecA.z).normalize();
      const dirB = new THREE.Vector3(spec.vecB.x, spec.vecB.y, spec.vecB.z).normalize();
      
      const len = 1.5; // Reduced radius for better fit
      
      // Check if vectors are too close (prevent rendering bug)
      if (dirA.distanceTo(dirB) < 0.001) return;

      // Ray Lines
      const lineAGeo = new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(dirA.clone().multiplyScalar(len*1.5))]);
      const lineBGeo = new THREE.BufferGeometry().setFromPoints([origin, origin.clone().add(dirB.clone().multiplyScalar(len*1.5))]);
      const mat = new THREE.LineBasicMaterial({ color: 0xfacc15, depthTest: false }); 
      
      this.anglesGroup.add(new THREE.Line(lineAGeo, mat));
      this.anglesGroup.add(new THREE.Line(lineBGeo, mat));
      
      // Filled Sector (Pie Slice)
      const curve = new THREE.EllipseCurve(
          0, 0,            // ax, aY
          len, len,        // xRadius, yRadius
          0, dirA.angleTo(dirB), // aStartAngle, aEndAngle
          false,            // aClockwise
          0                 // aRotation
      );
      
      // We need to properly orient this 2D shape in 3D space
      // For simplicity in this engine, we will just use lines and a closing dash
      // Real 3D sectors are complex to align without specific planes.
      // Let's stick to the Triangle Visual which works well for 3D trig.

      const pA = origin.clone().add(dirA.clone().multiplyScalar(len));
      const pB = origin.clone().add(dirB.clone().multiplyScalar(len));
      
      const closeGeo = new THREE.BufferGeometry().setFromPoints([pA, pB]);
      const closeLine = new THREE.Line(closeGeo, new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize:0.2, gapSize:0.1, depthTest:false }));
      closeLine.computeLineDistances();
      this.anglesGroup.add(closeLine);

      // Label
      const midAngle = dirA.clone().add(dirB).normalize().multiplyScalar(len * 1.2);
      const pos = origin.clone().add(midAngle);
      this.createLabel({ text: spec.text || 'θ', position: {x:pos.x, y:pos.y, z:pos.z}, color: '#facc15' });
  }
}
